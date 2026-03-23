import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  AccountType,
  CardType,
  Transaction,
  Prisma,
  TransactionStatus,
  TransactionChannel,
} from '@mirante/database';
import { createHash } from 'crypto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';
import { ImportTransactionsDto } from './dto/import-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Trata datas do app como "date-only" (sem horário).
   * Usamos UTC 12:00 para evitar problemas de fuso/DST (ex.: 01/04 virar 31/03).
   */
  private dateOnlyUtc(date: Date | string): Date {
    if (typeof date === 'string') {
      // aceita 'YYYY-MM-DD' ou ISO; pegamos apenas a parte da data
      const raw = date.slice(0, 10);
      const [y, m, d] = raw.split('-').map((v) => Number(v));
      return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0));
    }
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        12,
        0,
        0,
        0,
      ),
    );
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  /**
   * Gera transações futuras a partir de recorrências mensais.
   * Regras:
   * - Recorrência mensal no mesmo dia (com clamp no fim do mês)
   * - Só gera datas > hoje
   * - Retorna itens "virtuais" (não persistidos) com status PENDING
   */
  async listFuture(
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<any[]> {
    const today = this.startOfDayUtc(new Date());
    const from = query.from
      ? this.startOfDayUtc(new Date(query.from))
      : new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const to = query.to
      ? new Date(query.to)
      : this.addMonthsClampedUtc(today, 12);

    // 1) Transações futuras já existentes no banco (inclui parcelas criadas)
    const futureDb = await this.db.transaction.findMany({
      where: {
        userId,
        isActive: true,
        date: { gt: today, gte: from, lte: to },
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.classification && { classification: query.classification }),
        ...(query.type && { type: query.type }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          description: { contains: query.search, mode: 'insensitive' },
        }),
      },
      include: {
        category: true,
        tags: true,
        account: true,
        card: true,
        refuelingLog: true,
        maintenanceLog: true,
      },
      orderBy: { date: 'asc' },
    });

    // 2) Base de recorrências (mensais) para gerar ocorrências futuras "virtuais"
    const recurringBase = await this.db.transaction.findMany({
      where: {
        userId,
        isActive: true,
        isRecurring: true,
        date: { lte: today },
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.categoryId && { categoryId: query.categoryId }),
        ...(query.classification && { classification: query.classification }),
        ...(query.type && { type: query.type }),
        // status do base não precisa filtrar; o que importa é gerar PENDING no futuro
        ...(query.search && {
          description: { contains: query.search, mode: 'insensitive' },
        }),
      },
      include: {
        category: true,
        tags: true,
        account: true,
        card: true,
      },
    });

    const virtual: any[] = [];
    for (const base of recurringBase) {
      // gera até 24 meses (ou até "to"), sempre clamped
      for (let i = 1; i <= 24; i++) {
        const next = this.addMonthsClampedUtc(new Date(base.date), i);
        if (next <= today) continue;
        if (next < from) continue;
        if (next > to) break;

        virtual.push({
          ...base,
          id: `recurring:${base.id}:${next.toISOString().slice(0, 10)}`,
          isVirtual: true,
          sourceTransactionId: base.id,
          date: next,
          status: TransactionStatus.PENDING,
          // garante que não pareça parcela real
          installmentId: null,
          installmentNum: null,
          totalInstallments: null,
        });
      }
    }

    // merge + sort
    const merged = [...futureDb, ...virtual].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return merged;
  }

  private daysInMonthUtc(year: number, monthIndex0: number): number {
    return new Date(
      Date.UTC(year, monthIndex0 + 1, 0, 12, 0, 0, 0),
    ).getUTCDate();
  }

  private addMonthsClampedUtc(baseDateOnly: Date, monthsToAdd: number): Date {
    const base = this.dateOnlyUtc(baseDateOnly);
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const d = base.getUTCDate();

    const targetMonthIndex = m + monthsToAdd;
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

    const maxDay = this.daysInMonthUtc(targetYear, normalizedMonth);
    const day = Math.min(d, maxDay);

    return new Date(Date.UTC(targetYear, normalizedMonth, day, 12, 0, 0, 0));
  }

  private calcFaturaDueDate(
    purchaseDate: Date,
    closingDay: number,
    dueDay: number,
  ): Date {
    const base = this.dateOnlyUtc(purchaseDate);
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();

    // Começamos verificando a fatura do Mês Atual (M)
    // Se a data de compra for MENOR que a data de fechamento real do Mês M, entra nela.
    // Senão, entra na fatura do Mês M+1.
    let faturaMonthOffset = 0;

    const maxClosingDayM = this.daysInMonthUtc(y, m);
    const actualClosingDayM = Math.min(closingDay, maxClosingDayM);
    const closingDateM = new Date(
      Date.UTC(y, m, actualClosingDayM, 12, 0, 0, 0),
    );

    if (base.getTime() >= closingDateM.getTime()) {
      faturaMonthOffset = 1;
    }

    const targetFaturaMonthIndex = m + faturaMonthOffset;

    // Agora decidimos o mês do vencimento dessa fatura
    // Se dueDay <= closingDay, o vencimento só ocorre no mês SEGUINTE à fatura.
    // Se dueDay > closingDay, o vencimento ocorre no MESMO mês da fatura.
    const dueDateMonthOffset =
      dueDay <= closingDay
        ? targetFaturaMonthIndex + 1
        : targetFaturaMonthIndex;

    const targetDueYear = y + Math.floor(dueDateMonthOffset / 12);
    const normalizedDueMonth = ((dueDateMonthOffset % 12) + 12) % 12;

    const maxDueDay = this.daysInMonthUtc(targetDueYear, normalizedDueMonth);
    const actualDueDay = Math.min(dueDay, maxDueDay);

    return new Date(
      Date.UTC(targetDueYear, normalizedDueMonth, actualDueDay, 12, 0, 0, 0),
    );
  }

  async findAll(
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<Transaction[]> {
    const {
      accountId,
      categoryId,
      search,
      type,
      classification,
      status,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    return this.db.transaction.findMany({
      where: {
        userId,
        isActive: true,
        ...(accountId && { accountId }),
        ...(categoryId && { categoryId }),
        ...(classification && { classification }),
        ...(type && { type }),
        ...(status && { status }),
        ...(search && {
          description: { contains: search, mode: 'insensitive' },
        }),
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      include: {
        category: true,
        tags: true,
        account: true,
        card: true,
        refuelingLog: true,
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.db.transaction.findFirst({
      where: { id, userId, isActive: true },
      include: {
        category: true,
        tags: true,
        account: true,
        card: true,
        refuelingLog: true,
      },
    });
    if (!transaction)
      throw new NotFoundException(`Transaction ${id} not found`);
    return transaction;
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const {
      accountId,
      categoryId,
      type,
      classification,
      paymentMethod,
      channel,
      cardId,
      isRecurring,
      amount,
      totalInstallments,
      paidInstallments,
      date,
      description,
      notes,
      currencyCode,
      vehicleId,
      station,
      fuelType,
      currentKm,
      liters,
      pricePerLiter,
      maintenanceType,
      provider,
    } = dto;

    const parts =
      totalInstallments && totalInstallments > 1 ? totalInstallments : 1;
    let amountPerPart = Number(amount) / parts;
    let firstPartExtra = 0;

    // Se a divisão não for exata, arredonda as parcelas e joga o resto (centavos) na 1ª parcela
    if (parts > 1) {
      amountPerPart = Math.floor((Number(amount) / parts) * 100) / 100;
      firstPartExtra = Number(amount) - amountPerPart * parts;
    }

    const paidParts = Math.max(0, Math.min(paidInstallments ?? 0, parts));

    let firstDate = this.dateOnlyUtc(date);

    let resolvedAccountId = accountId;
    const resolvedCardId = cardId ?? undefined;
    let resolvedChannel: TransactionChannel = (channel ??
      'BANK') as TransactionChannel;
    let affectsAccount = resolvedChannel !== 'CARD_CREDIT';

    // Para transações ligadas a cartão, o `cardId` determina `channel` e `affectsAccount`
    // (CREDIT não afeta saldo; DEBIT afeta).
    if (resolvedCardId) {
      const card = await this.db.card.findFirst({
        where: { id: resolvedCardId, userId, isActive: true },
        select: {
          id: true,
          type: true,
          accountId: true,
          closingDay: true,
          dueDay: true,
        },
      });

      if (!card) {
        throw new BadRequestException('cardId inválido para este usuário');
      }

      resolvedAccountId = card.accountId;
      resolvedChannel =
        card.type === CardType.CREDIT ? 'CARD_CREDIT' : 'CARD_DEBIT';
      affectsAccount = card.type === CardType.DEBIT;

      if (resolvedChannel === 'CARD_CREDIT' && card.closingDay && card.dueDay) {
        firstDate = this.calcFaturaDueDate(
          firstDate,
          card.closingDay,
          card.dueDay,
        );
      }
    } else {
      // Sem `cardId`, decidimos `affectsAccount` pelo `channel`.
      affectsAccount = resolvedChannel !== 'CARD_CREDIT';
    }

    if (parts > 1) {
      if (paidParts >= parts) {
        throw new BadRequestException(
          `paidInstallments (${paidParts}) must be < totalInstallments (${parts})`,
        );
      }
      const created = await this.db.$transaction(async (tx) => {
        const inst = await tx.installment.create({
          data: {
            userId,
            totalAmount: new Prisma.Decimal(amount),
            totalParts: parts,
            description,
            date: firstDate,
          },
        });

        let firstTx: Transaction | null = null;
        // Se o usuário marcou que já pagou X parcelas, criamos apenas as restantes (X+1..N).
        // IMPORTANTE: a primeira parcela criada deve cair na data informada (mês atual),
        // e as seguintes vão mês a mês. Ex.: 2x, paid=1 => cria somente 2/2 na data informada.
        const startPart = Math.max(1, paidParts + 1);
        for (let i = startPart; i <= parts; i++) {
          const installmentDate = this.addMonthsClampedUtc(
            firstDate,
            i - startPart,
          );

          const isFirstCreated = i === startPart;
          const txData = {
            user: { connect: { id: userId } },
            account: { connect: { id: resolvedAccountId } },
            category: categoryId ? { connect: { id: categoryId } } : undefined,
            type,
            classification: classification ?? 'COMMON',
            channel: resolvedChannel,
            card: resolvedCardId
              ? { connect: { id: resolvedCardId } }
              : undefined,
            affectsAccount,
            isRecurring: isRecurring ?? false,
            status: TransactionStatus.PENDING,
            amount: new Prisma.Decimal(
              amountPerPart + (isFirstCreated ? firstPartExtra : 0),
            ),
            date: installmentDate,
            description:
              parts > 1 ? `${description} (${i}/${parts})` : description,
            notes,
            currencyCode: currencyCode ?? 'BRL',
            installment: { connect: { id: inst.id } },
            installmentNum: i,
            totalInstallments: parts,
            refuelingLog:
              paidParts === 0 &&
              isFirstCreated &&
              classification === 'FUEL' &&
              vehicleId
                ? {
                    create: {
                      vehicleId,
                      fuelType: fuelType ?? undefined,
                      station,
                      odometer: new Prisma.Decimal(currentKm ?? 0),
                      fuelLiters: new Prisma.Decimal(liters ?? 0),
                      pricePerLiter: new Prisma.Decimal(pricePerLiter ?? 0),
                      isFullTank: true,
                    },
                  }
                : undefined,
            maintenanceLog:
              paidParts === 0 &&
              isFirstCreated &&
              classification === 'MAINTENANCE' &&
              vehicleId &&
              maintenanceType
                ? {
                    create: {
                      vehicleId,
                      type: maintenanceType,
                      provider,
                      odometer:
                        typeof currentKm === 'number'
                          ? new Prisma.Decimal(currentKm)
                          : undefined,
                      description: notes,
                    },
                  }
                : undefined,
          };
          const t = await tx.transaction.create({
            data: txData,
            include: {
              category: true,
              tags: true,
              refuelingLog: true,
              maintenanceLog: true,
            },
          });
          if (isFirstCreated) firstTx = t;
        }
        return firstTx!;
      });
      return created;
    }

    return this.db.transaction.create({
      data: {
        userId,
        accountId: resolvedAccountId,
        categoryId,
        type,
        classification: classification ?? 'COMMON',
        paymentMethod: paymentMethod ?? 'DEBIT',
        channel: resolvedChannel,
        cardId: resolvedCardId,
        affectsAccount,
        isRecurring: isRecurring ?? false,
        amount: new Prisma.Decimal(amount),
        date: firstDate,
        description,
        notes,
        currencyCode: currencyCode ?? 'BRL',
        refuelingLog:
          classification === 'FUEL' && vehicleId
            ? {
                create: {
                  vehicleId,
                  fuelType: fuelType ?? undefined,
                  station,
                  odometer: new Prisma.Decimal(currentKm ?? 0),
                  fuelLiters: new Prisma.Decimal(liters ?? 0),
                  pricePerLiter: new Prisma.Decimal(pricePerLiter ?? 0),
                  isFullTank: true,
                },
              }
            : undefined,
        maintenanceLog:
          classification === 'MAINTENANCE' && vehicleId && maintenanceType
            ? {
                create: {
                  vehicleId,
                  type: maintenanceType,
                  provider,
                  odometer:
                    typeof currentKm === 'number'
                      ? new Prisma.Decimal(currentKm)
                      : undefined,
                  description: notes,
                },
              }
            : undefined,
      },
      include: {
        category: true,
        tags: true,
        refuelingLog: true,
        maintenanceLog: true,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const {
      accountId,
      categoryId,
      vehicleId,
      fuelType,
      currentKm,
      liters,
      pricePerLiter,
      station,
      maintenanceType,
      provider,
      classification,
      paymentMethod,
      amount,
      date,
      channel,
      cardId,
      ...rest
    } = dto;

    await this.findOne(id, userId);

    let resolvedAccountId = accountId;
    let resolvedChannel: TransactionChannel | undefined = channel;
    let affectsAccount: boolean | undefined;

    if (cardId) {
      const card = await this.db.card.findFirst({
        where: { id: cardId, userId, isActive: true },
        select: { type: true, accountId: true },
      });

      if (!card) {
        throw new BadRequestException('cardId inválido para este usuário');
      }

      resolvedAccountId = card.accountId;
      resolvedChannel =
        card.type === CardType.CREDIT ? 'CARD_CREDIT' : 'CARD_DEBIT';
      affectsAccount = card.type === CardType.DEBIT;
    } else if (resolvedChannel) {
      affectsAccount = resolvedChannel !== 'CARD_CREDIT';
    }

    return this.db.transaction.update({
      where: { id },
      data: {
        ...rest,
        classification,
        paymentMethod,
        amount: amount ? new Prisma.Decimal(amount) : undefined,
        date: date ? new Date(date) : undefined,
        ...(resolvedChannel ? { channel: resolvedChannel } : {}),
        ...(cardId ? { card: { connect: { id: cardId } } } : {}),
        ...(typeof affectsAccount === 'boolean' ? { affectsAccount } : {}),
        account: resolvedAccountId
          ? { connect: { id: resolvedAccountId } }
          : undefined,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        refuelingLog:
          classification === 'FUEL' && vehicleId
            ? {
                upsert: {
                  create: {
                    vehicleId,
                    fuelType: fuelType ?? undefined,
                    station,
                    odometer: new Prisma.Decimal(currentKm ?? 0),
                    fuelLiters: new Prisma.Decimal(liters ?? 0),
                    pricePerLiter: new Prisma.Decimal(pricePerLiter ?? 0),
                    isFullTank: true,
                  },
                  update: {
                    vehicleId,
                    fuelType: fuelType ?? undefined,
                    station,
                    odometer: new Prisma.Decimal(currentKm ?? 0),
                    fuelLiters: new Prisma.Decimal(liters ?? 0),
                    pricePerLiter: new Prisma.Decimal(pricePerLiter ?? 0),
                  },
                },
              }
            : undefined,
        maintenanceLog:
          classification === 'MAINTENANCE' && vehicleId && maintenanceType
            ? {
                upsert: {
                  create: {
                    vehicleId,
                    type: maintenanceType,
                    provider,
                    odometer:
                      typeof currentKm === 'number'
                        ? new Prisma.Decimal(currentKm)
                        : undefined,
                    description: rest.notes,
                  },
                  update: {
                    vehicleId,
                    type: maintenanceType,
                    provider,
                    odometer:
                      typeof currentKm === 'number'
                        ? new Prisma.Decimal(currentKm)
                        : undefined,
                    description: rest.notes,
                  },
                },
              }
            : undefined,
      },
      include: {
        category: true,
        tags: true,
        refuelingLog: true,
        maintenanceLog: true,
      },
    });
  }

  async remove(id: string, userId: string): Promise<Transaction> {
    const tx = await this.db.transaction.findFirst({
      where: { id, userId, isActive: true },
      select: {
        id: true,
        installmentId: true,
        installmentNum: true,
      },
    });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);

    const deletedAt = new Date();

    // Se for parcela, deleta esta e todas as subsequentes (não mexe nas anteriores)
    if (tx.installmentId && tx.installmentNum) {
      await this.db.$transaction(async (db) => {
        await db.transaction.updateMany({
          where: {
            userId,
            isActive: true,
            installmentId: tx.installmentId,
            installmentNum: { gte: tx.installmentNum },
          },
          data: { isActive: false, deletedAt },
        });
      });
      // retorna a própria transação (agora desativada)
      return this.db.transaction.findFirstOrThrow({
        where: { id, userId },
      });
    }

    return this.db.transaction.update({
      where: { id },
      data: { isActive: false, deletedAt },
    });
  }

  async importCsv(
    userId: string,
    file: any,
    dto: ImportTransactionsDto,
  ): Promise<{
    created: number;
    skipped: number;
    skippedInvalid: number;
    skippedDuplicate: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    const csvBuffer: Buffer | null = file?.buffer ?? null;
    const csv = csvBuffer?.toString('utf8') ?? '';
    if (!csv.trim())
      return {
        created,
        skipped,
        skippedInvalid,
        skippedDuplicate,
        errors: ['Arquivo CSV vazio.'],
      };

    if (!csvBuffer) {
      return {
        created,
        skipped,
        skippedInvalid,
        skippedDuplicate,
        errors: ['Arquivo inválido (buffer ausente).'],
      };
    }

    const fileSha256 = createHash('sha256').update(csvBuffer).digest('hex');

    const rows = this.parseCsv(csv);
    if (rows.length === 0)
      return {
        created,
        skipped,
        skippedInvalid,
        skippedDuplicate,
        errors: ['Nenhuma linha encontrada.'],
      };

    const resolved = await this.resolveImportTarget(userId, dto);
    if (!resolved) {
      return {
        created,
        skipped,
        skippedInvalid,
        skippedDuplicate,
        errors: ['Selecione uma conta ou um cartão válido.'],
      };
    }

    // registra o arquivo importado (para dedupe rápido por arquivo)
    const existingFile = await this.db.importFile.findFirst({
      where: {
        userId,
        sha256: fileSha256,
        accountId: resolved.accountId,
        cardId: resolved.cardId ?? null,
      },
      select: { id: true },
    });
    if (existingFile) {
      // arquivo idêntico já importado para o mesmo destino => nada a fazer
      return {
        created: 0,
        skipped: rows.length,
        skippedInvalid: 0,
        skippedDuplicate: rows.length,
        errors: [
          'Este arquivo já foi importado anteriormente para este destino.',
        ],
      };
    }

    const createdFile = await this.db.importFile.create({
      data: {
        userId,
        sha256: fileSha256,
        filename:
          typeof file?.originalname === 'string'
            ? file.originalname
            : undefined,
        sizeBytes: typeof file?.size === 'number' ? file.size : undefined,
        accountId: resolved.accountId,
        cardId: resolved.cardId ?? undefined,
      },
      select: { id: true },
    });
    const importFileId = createdFile.id;

    // tenta detectar header
    const header = rows[0].map((h) => this.normalizeHeader(h));
    const hasHeader = header.some((h) =>
      [
        'data',
        'date',
        'descricao',
        'descrição',
        'description',
        'historico',
        'histórico',
        'title',
        'valor',
        'amount',
        'value',
      ].includes(h),
    );
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const idxDate = hasHeader
      ? header.findIndex((h) => ['data', 'date'].includes(h))
      : 0;
    const idxDesc = hasHeader
      ? header.findIndex((h) =>
          [
            'descricao',
            'descrição',
            'description',
            'historico',
            'histórico',
            'title',
          ].includes(h),
        )
      : 1;
    const idxAmount = hasHeader
      ? header.findIndex((h) => ['valor', 'amount', 'value'].includes(h))
      : 2;

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      try {
        const rawDate = (r[idxDate] ?? '').trim();
        const rawDesc = (r[idxDesc] ?? '').trim();
        const rawAmount = (r[idxAmount] ?? '').trim();
        if (!rawDate || !rawDesc || !rawAmount) {
          skipped++;
          skippedInvalid++;
          continue;
        }

        const date = this.dateOnlyUtc(this.parseDate(rawDate));
        const inst = this.parseInstallment(rawDesc);
        const isCardPayment = this.isCardPaymentReceived(rawDesc);
        const isBillPaymentOut =
          !isCardPayment && this.isCardBillPaymentOut(rawDesc);

        const { amount, type } = this.parseAmountAndType(
          rawAmount,
          resolved.accountType,
          isCardPayment,
          resolved.cardType,
        );

        const normalizedDesc =
          inst && !isCardPayment
            ? this.buildInstallmentDescription(inst.base, inst.num, inst.total)
            : isCardPayment
              ? 'Pagamento recebido'
              : rawDesc;

        // "TRANSFER" aqui é só para quitação de fatura / pagamento recebido (movimentação),
        // não para pagamentos via PIX (que são despesas/receitas reais).
        const classification = (
          isCardPayment || isBillPaymentOut ? 'TRANSFER' : 'COMMON'
        ) as any;

        const channel = (() => {
          if (resolved.cardType === CardType.CREDIT) return 'CARD_CREDIT';
          if (resolved.cardType === CardType.DEBIT) return 'CARD_DEBIT';
          if (this.isPixTransfer(rawDesc)) return 'PIX';
          return 'BANK';
        })() as any;

        const buildFingerprint = (p: {
          date: Date;
          type: any;
          amount: number;
          description: string;
          installmentNum: number | null;
          totalInstallments: number | null;
        }) =>
          createHash('sha256')
            .update(
              JSON.stringify({
                userId,
                accountId: resolved.accountId,
                cardId: resolved.cardId ?? null,
                date: p.date.toISOString().slice(0, 10),
                type: p.type,
                amount: Number(p.amount).toFixed(2),
                description: p.description,
                installmentNum: p.installmentNum,
                totalInstallments: p.totalInstallments,
                classification,
                channel,
                affectsAccount: resolved.affectsAccount,
              }),
            )
            .digest('hex');

        // Se for parcela, cria/acha um grupo Installment e garante parcelas futuras faltantes.
        let installmentId: string | undefined;
        if (inst && !isCardPayment) {
          const firstDate = this.addMonthsClampedUtc(date, -(inst.num - 1));
          const totalAmount = new Prisma.Decimal(amount).mul(inst.total);

          const existingGroup = await this.db.installment.findFirst({
            where: {
              userId,
              description: inst.base,
              totalParts: inst.total,
              totalAmount,
              date: firstDate,
            },
            select: { id: true },
          });

          const group =
            existingGroup ??
            (await this.db.installment.create({
              data: {
                userId,
                description: inst.base,
                totalParts: inst.total,
                totalAmount,
                date: firstDate,
              },
              select: { id: true },
            }));

          installmentId = group.id;
        }

        // dedupe simples: mesmo user+account+date+type+amount+description (+ parcelas se houver)
        const existing = await this.db.transaction.findFirst({
          where: {
            userId,
            accountId: resolved.accountId,
            isActive: true,
            date,
            type,
            amount: new Prisma.Decimal(amount),
            description: normalizedDesc,
            ...(resolved.cardId ? { cardId: resolved.cardId } : {}),
            ...(inst &&
              !isCardPayment && {
                installmentId,
                installmentNum: inst.num,
                totalInstallments: inst.total,
              }),
          },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          skippedDuplicate++;
          continue;
        }

        const fingerprintSha256 = buildFingerprint({
          date,
          type,
          amount,
          description: normalizedDesc,
          installmentNum: inst?.num ?? null,
          totalInstallments: inst?.total ?? null,
        });
        const existingFingerprint = await this.db.importFingerprint.findFirst({
          where: { userId, sha256: fingerprintSha256 },
          select: { id: true },
        });
        if (existingFingerprint) {
          skipped++;
          skippedDuplicate++;
          continue;
        }

        await this.db.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId,
              accountId: resolved.accountId,
              ...(resolved.cardId ? { cardId: resolved.cardId } : {}),
              type,
              amount: new Prisma.Decimal(amount),
              date,
              description: normalizedDesc,
              currencyCode: dto.currencyCode ?? 'BRL',
              classification,
              status: TransactionStatus.COMPLETED,
              affectsAccount: resolved.affectsAccount,
              channel,
              ...(inst &&
                !isCardPayment && {
                  installmentId,
                  installmentNum: inst.num,
                  totalInstallments: inst.total,
                }),
            },
          });

          await tx.importFingerprint.create({
            data: { userId, sha256: fingerprintSha256, importFileId },
          });

          // Se importou "1/2" (ou qualquer X/Y), cria as parcelas futuras faltantes (X+1..Y)
          if (
            inst &&
            !isCardPayment &&
            installmentId &&
            inst.num < inst.total
          ) {
            const firstDate = this.addMonthsClampedUtc(date, -(inst.num - 1));

            for (let part = inst.num + 1; part <= inst.total; part++) {
              const partDate = this.addMonthsClampedUtc(firstDate, part - 1);
              const partDesc = this.buildInstallmentDescription(
                inst.base,
                part,
                inst.total,
              );

              const existsPart = await tx.transaction.findFirst({
                where: {
                  userId,
                  accountId: resolved.accountId,
                  isActive: true,
                  installmentId,
                  installmentNum: part,
                },
                select: { id: true },
              });
              if (existsPart) continue;

              const partFingerprint = buildFingerprint({
                date: partDate,
                type,
                amount,
                description: partDesc,
                installmentNum: part,
                totalInstallments: inst.total,
              });
              const partFpExists = await tx.importFingerprint.findFirst({
                where: { userId, sha256: partFingerprint },
                select: { id: true },
              });
              if (partFpExists) continue;

              await tx.transaction.create({
                data: {
                  userId,
                  accountId: resolved.accountId,
                  ...(resolved.cardId ? { cardId: resolved.cardId } : {}),
                  type,
                  amount: new Prisma.Decimal(amount),
                  date: partDate,
                  description: partDesc,
                  currencyCode: dto.currencyCode ?? 'BRL',
                  classification,
                  status: TransactionStatus.PENDING,
                  affectsAccount: resolved.affectsAccount,
                  channel,
                  installmentId,
                  installmentNum: part,
                  totalInstallments: inst.total,
                },
              });
              await tx.importFingerprint.create({
                data: { userId, sha256: partFingerprint, importFileId },
              });
              created++;
            }
          }
        });
        created++;
      } catch (e: unknown) {
        errors.push(
          `Linha ${hasHeader ? i + 2 : i + 1}: ${e instanceof Error ? e.message : 'erro'}`,
        );
      }
    }

    return { created, skipped, skippedInvalid, skippedDuplicate, errors };
  }

  private normalizeHeader(h: string): string {
    return h
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private parseCsv(csv: string): string[][] {
    const lines = csv
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim().length > 0);
    return lines.map((line) => this.parseCsvLine(line));
  }

  // parser simples com aspas
  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  private parseDate(raw: string): Date {
    // aceita dd/mm/yyyy ou yyyy-mm-dd
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      const y = Number(m[3]);
      return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0));
    }
    const d2 = new Date(s);
    if (Number.isNaN(d2.getTime())) throw new Error(`Data inválida: ${raw}`);
    return d2;
  }

  private parseAmountAndType(
    raw: string,
    accountType: AccountType,
    isCardPayment: boolean,
    cardType?: CardType | null,
  ): { amount: number; type: any } {
    // aceita "1.234,56" ou "-123,45" ou "123.45"
    const cleaned = raw.replace(/[^\d,.-]/g, '').trim();
    const hasComma = cleaned.includes(',');
    const normalized = hasComma
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const val = Number(normalized);
    if (Number.isNaN(val)) throw new Error(`Valor inválido: ${raw}`);

    // Cartão de crédito (via card.type=CREDIT)
    if (cardType === CardType.CREDIT) {
      if (isCardPayment) return { amount: Math.abs(val), type: 'INCOME' };
      return { amount: Math.abs(val), type: 'EXPENSE' };
    }

    // Contas normais: negativo = despesa, positivo = receita
    if (val < 0) return { amount: Math.abs(val), type: 'EXPENSE' };
    return { amount: Math.abs(val), type: 'INCOME' };
  }

  private parseInstallment(
    desc: string,
  ): { num: number; total: number; base: string } | null {
    const m =
      desc.match(/parcela\s*(\d{1,2})\s*[/-]\s*(\d{1,2})/i) ??
      desc.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
    if (!m) return null;
    const num = Number(m[1]);
    const total = Number(m[2]);
    if (!num || !total) return null;
    const base = desc
      .replace(/\s*-\s*parcela\s*\d{1,2}\s*[/-]\s*\d{1,2}\s*/i, '')
      .replace(/\s*\(\s*parcela\s*\d{1,2}\s*[/-]\s*\d{1,2}\s*\)\s*/i, '')
      .trim();
    return { num, total, base };
  }

  private isCardPaymentReceived(desc: string): boolean {
    const s = desc
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (
      s.includes('pagamento') &&
      (s.includes('receb') || s.includes('fatura') || s.includes('cartao'))
    );
  }

  private isCardBillPaymentOut(desc: string): boolean {
    const s = desc
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (
      s.includes('pagamento') && (s.includes('fatura') || s.includes('cartao'))
    );
  }

  private isPixTransfer(desc: string): boolean {
    const s = desc
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return s.includes('pix') && s.includes('transferenc');
  }

  private buildInstallmentDescription(
    base: string,
    num: number,
    total: number,
  ): string {
    const b = (base ?? '').trim();
    return `${b} - Parcela ${num}/${total}`.trim();
  }

  private async resolveImportTarget(
    userId: string,
    dto: ImportTransactionsDto,
  ): Promise<{
    accountId: string;
    accountType: AccountType;
    cardId: string | null;
    cardType: CardType | null;
    affectsAccount: boolean;
  } | null> {
    if (dto.cardId) {
      const card = await this.db.card.findFirst({
        where: { id: dto.cardId, userId, isActive: true },
        select: {
          id: true,
          type: true,
          accountId: true,
          account: { select: { type: true } },
        },
      });
      if (!card) return null;
      return {
        accountId: card.accountId,
        accountType: card.account.type,
        cardId: card.id,
        cardType: card.type,
        affectsAccount: card.type === CardType.DEBIT,
      };
    }

    if (!dto.accountId) return null;
    const account = await this.db.account.findFirst({
      where: { id: dto.accountId, userId, isActive: true },
      select: { id: true, type: true },
    });
    if (!account) return null;
    return {
      accountId: account.id,
      accountType: account.type,
      cardId: null,
      cardType: null,
      affectsAccount: true,
    };
  }
}
