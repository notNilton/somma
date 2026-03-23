import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from '@/transactions/transactions.service';
import { DatabaseService } from '@/database/database.service';
import {
  TransactionType,
  TransactionStatus,
  CardType,
} from '@mirante/database';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Cria um Date em UTC 12:00 */
const utc = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));

/** Transação fake mínima */
const makeTx = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  userId: 'user-1',
  accountId: 'acc-1',
  type: TransactionType.EXPENSE,
  amount: 100,
  date: utc(2024, 3, 15),
  description: 'Teste',
  isActive: true,
  installmentId: null,
  installmentNum: null,
  category: null,
  tags: [],
  account: {},
  card: null,
  refuelingLog: null,
  maintenanceLog: null,
  ...overrides,
});

// ─────────────────────────────────────────────
// Mock do DatabaseService
// ─────────────────────────────────────────────

const mockDb = {
  transaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  installment: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  card: {
    findFirst: jest.fn(),
  },
  importFile: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  importFingerprint: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest
    .fn()
    .mockImplementation(async (cb: (tx: any) => Promise<unknown>) =>
      cb(mockDb),
    ),
};

// ─────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════
  // Helpers privados de data
  // ═══════════════════════════════════════════

  describe('dateOnlyUtc (privado)', () => {
    const fn = (arg: string | Date) =>
      (service as any).dateOnlyUtc(arg) as Date;

    it('converte string YYYY-MM-DD para UTC 12:00', () => {
      expect(fn('2024-01-31')).toEqual(utc(2024, 1, 31));
    });

    it('converte string ISO completa usando só a parte da data', () => {
      expect(fn('2024-06-15T23:59:59Z')).toEqual(utc(2024, 6, 15));
    });

    it('converte objeto Date para UTC 12:00 usando componentes UTC', () => {
      const d = new Date(Date.UTC(2024, 3, 10, 8, 30));
      expect(fn(d)).toEqual(utc(2024, 4, 10));
    });

    it('preserva o dia correto para ano bissexto', () => {
      expect(fn('2024-02-29')).toEqual(utc(2024, 2, 29));
    });
  });

  // ───────────────────────────────────────────

  describe('daysInMonthUtc (privado)', () => {
    const fn = (y: number, m0: number) =>
      (service as any).daysInMonthUtc(y, m0) as number;

    it('janeiro → 31', () => expect(fn(2024, 0)).toBe(31));
    it('abril → 30', () => expect(fn(2024, 3)).toBe(30));
    it('fevereiro 2024 bissexto → 29', () => expect(fn(2024, 1)).toBe(29));
    it('fevereiro 2023 não-bissexto → 28', () => expect(fn(2023, 1)).toBe(28));
    it('fevereiro 2100 (÷100 mas não ÷400) → 28', () =>
      expect(fn(2100, 1)).toBe(28));
    it('dezembro → 31', () => expect(fn(2024, 11)).toBe(31));
  });

  // ───────────────────────────────────────────

  describe('addMonthsClampedUtc (privado)', () => {
    const fn = (base: Date, months: number) =>
      (service as any).addMonthsClampedUtc(base, months) as Date;

    it('adiciona 1 mês sem clamp', () => {
      expect(fn(utc(2024, 3, 15), 1)).toEqual(utc(2024, 4, 15));
    });

    it('31/jan + 1 mês → 28/fev (não-bissexto)', () => {
      expect(fn(utc(2023, 1, 31), 1)).toEqual(utc(2023, 2, 28));
    });

    it('31/jan + 1 mês → 29/fev (bissexto 2024)', () => {
      expect(fn(utc(2024, 1, 31), 1)).toEqual(utc(2024, 2, 29));
    });

    it('31/jan + 2 meses → 31/mar (sem clamp)', () => {
      expect(fn(utc(2024, 1, 31), 2)).toEqual(utc(2024, 3, 31));
    });

    it('31/out + 1 mês → 30/nov (clamp)', () => {
      expect(fn(utc(2024, 10, 31), 1)).toEqual(utc(2024, 11, 30));
    });

    it('dez + 1 mês → jan do próximo ano', () => {
      expect(fn(utc(2024, 12, 15), 1)).toEqual(utc(2025, 1, 15));
    });

    it('31/jan + 13 meses → 28/fev do próximo ano (clamp)', () => {
      expect(fn(utc(2024, 1, 31), 13)).toEqual(utc(2025, 2, 28));
    });

    it('+12 meses retorna mesmo dia do próximo ano', () => {
      expect(fn(utc(2024, 5, 20), 12)).toEqual(utc(2025, 5, 20));
    });

    it('0 meses retorna a mesma data', () => {
      expect(fn(utc(2024, 8, 10), 0)).toEqual(utc(2024, 8, 10));
    });
  });

  // ───────────────────────────────────────────

  describe('calcFaturaDueDate (privado)', () => {
    const fn = (purchase: Date, closing: number, due: number) =>
      (service as any).calcFaturaDueDate(purchase, closing, due) as Date;

    describe('dueDay > closingDay → vence no mesmo mês da fatura', () => {
      it('compra antes do fechamento → fatura atual → vence no mesmo mês', () => {
        // compra Jan 5, fecha Jan 10 → fatura Jan → vence Jan 20
        expect(fn(utc(2024, 1, 5), 10, 20)).toEqual(utc(2024, 1, 20));
      });

      it('compra no dia do fechamento → vai para fatura seguinte', () => {
        // compra Jan 10, fecha Jan 10 → fatura Fev → vence Fev 20
        expect(fn(utc(2024, 1, 10), 10, 20)).toEqual(utc(2024, 2, 20));
      });

      it('compra após fechamento → fatura seguinte', () => {
        // compra Jan 15, fecha Jan 10 → fatura Fev → vence Fev 20
        expect(fn(utc(2024, 1, 15), 10, 20)).toEqual(utc(2024, 2, 20));
      });

      it('fatura cruza virada de ano', () => {
        // compra Dez 20, fecha Dez 10 → fatura Jan → vence Jan 20
        expect(fn(utc(2024, 12, 20), 10, 20)).toEqual(utc(2025, 1, 20));
      });
    });

    describe('dueDay <= closingDay → vence no mês seguinte ao da fatura', () => {
      it('compra antes do fechamento → fatura atual → vence mês seguinte', () => {
        // compra Jan 5, fecha Jan 20 → fatura Jan → vence Fev 10
        expect(fn(utc(2024, 1, 5), 20, 10)).toEqual(utc(2024, 2, 10));
      });

      it('compra no dia do fechamento → fatura seguinte → vence 2 meses à frente', () => {
        // compra Jan 20, fecha Jan 20 → fatura Fev → vence Mar 10
        expect(fn(utc(2024, 1, 20), 20, 10)).toEqual(utc(2024, 3, 10));
      });

      it('compra após fechamento → fatura seguinte → vence 2 meses à frente', () => {
        // compra Jan 25, fecha Jan 20 → fatura Fev → vence Mar 10
        expect(fn(utc(2024, 1, 25), 20, 10)).toEqual(utc(2024, 3, 10));
      });

      it('cruza virada de ano: compra Nov → vence Jan', () => {
        // compra Nov 25, fecha Nov 20 → fatura Dez → vence Jan 10
        expect(fn(utc(2024, 11, 25), 20, 10)).toEqual(utc(2025, 1, 10));
      });
    });

    describe('closingDay maior que dias do mês → clamp no fechamento', () => {
      it('closingDay=31 em fev bissexto: clampado para 29', () => {
        // fev 2024 tem 29 dias; compra Feb 10 < Feb 29 → fatura Feb → vence (dueDay=5) Mar 5
        expect(fn(utc(2024, 2, 10), 31, 5)).toEqual(utc(2024, 3, 5));
      });

      it('compra no dia do clamp vai para fatura seguinte', () => {
        // compra Feb 29 >= closingDay clampado 29 → fatura Mar → vence Abr 5
        expect(fn(utc(2024, 2, 29), 31, 5)).toEqual(utc(2024, 4, 5));
      });
    });
  });

  // ═══════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════

  describe('findAll', () => {
    it('retorna transações do usuário com paginação padrão', async () => {
      mockDb.transaction.findMany.mockResolvedValue([makeTx()]);

      const result = await service.findAll('user-1', {});

      expect(result).toHaveLength(1);
      expect(mockDb.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', isActive: true }),
          orderBy: { date: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('aplica filtros de type, from, to e paginação customizada', async () => {
      mockDb.transaction.findMany.mockResolvedValue([]);

      await service.findAll('user-1', {
        type: TransactionType.INCOME,
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
        page: 2,
        limit: 10,
      });

      expect(mockDb.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.INCOME,
            date: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  // findOne
  // ═══════════════════════════════════════════

  describe('findOne', () => {
    it('retorna a transação quando encontrada', async () => {
      const tx = makeTx();
      mockDb.transaction.findFirst.mockResolvedValue(tx);
      await expect(service.findOne('tx-1', 'user-1')).resolves.toEqual(tx);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      mockDb.transaction.findFirst.mockResolvedValue(null);
      await expect(service.findOne('tx-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  // create — transação simples
  // ═══════════════════════════════════════════

  describe('create — transação simples', () => {
    const baseDto = {
      accountId: 'acc-1',
      type: TransactionType.EXPENSE,
      amount: 150,
      date: '2024-03-15' as unknown as Date,
      description: 'Mercado',
    };

    it('cria a transação e retorna o resultado', async () => {
      const created = makeTx();
      mockDb.transaction.create.mockResolvedValue(created);
      await expect(service.create('user-1', baseDto as any)).resolves.toEqual(
        created,
      );
      expect(mockDb.transaction.create).toHaveBeenCalledTimes(1);
    });

    it('usa paymentMethod DEBIT por padrão', async () => {
      mockDb.transaction.create.mockResolvedValue(makeTx());
      await service.create('user-1', baseDto as any);
      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.paymentMethod).toBe('DEBIT');
    });

    it('usa channel BANK e affectsAccount true por padrão', async () => {
      mockDb.transaction.create.mockResolvedValue(makeTx());
      await service.create('user-1', baseDto as any);
      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.channel).toBe('BANK');
      expect(data.affectsAccount).toBe(true);
    });

    it('normaliza a data para UTC 12:00', async () => {
      mockDb.transaction.create.mockResolvedValue(makeTx());
      await service.create('user-1', baseDto as any);
      const { date } = mockDb.transaction.create.mock.calls[0][0].data;
      expect((date as Date).getUTCHours()).toBe(12);
      expect((date as Date).getUTCMinutes()).toBe(0);
    });

    it('usa currencyCode BRL por padrão', async () => {
      mockDb.transaction.create.mockResolvedValue(makeTx());
      await service.create('user-1', baseDto as any);
      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.currencyCode).toBe('BRL');
    });

    it('respeita currencyCode fornecido', async () => {
      mockDb.transaction.create.mockResolvedValue(makeTx());
      await service.create('user-1', {
        ...baseDto,
        currencyCode: 'USD',
      } as any);
      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.currencyCode).toBe('USD');
    });
  });

  // ═══════════════════════════════════════════
  // create — com cardId
  // ═══════════════════════════════════════════

  describe('create — com cardId', () => {
    const baseDto = {
      accountId: 'acc-1',
      cardId: 'card-1',
      type: TransactionType.EXPENSE,
      amount: 200,
      date: '2024-03-05' as unknown as Date,
      description: 'Restaurante',
    };

    it('lança BadRequestException quando cardId não existe', async () => {
      mockDb.card.findFirst.mockResolvedValue(null);
      await expect(service.create('user-1', baseDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cartão CREDIT → channel CARD_CREDIT, affectsAccount false', async () => {
      mockDb.card.findFirst.mockResolvedValue({
        id: 'card-1',
        type: CardType.CREDIT,
        accountId: 'acc-card',
        closingDay: null,
        dueDay: null,
      });
      mockDb.transaction.create.mockResolvedValue(makeTx());

      await service.create('user-1', baseDto as any);

      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.channel).toBe('CARD_CREDIT');
      expect(data.affectsAccount).toBe(false);
      expect(data.accountId).toBe('acc-card');
    });

    it('cartão DEBIT → channel CARD_DEBIT, affectsAccount true', async () => {
      mockDb.card.findFirst.mockResolvedValue({
        id: 'card-1',
        type: CardType.DEBIT,
        accountId: 'acc-card',
        closingDay: null,
        dueDay: null,
      });
      mockDb.transaction.create.mockResolvedValue(makeTx());

      await service.create('user-1', baseDto as any);

      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.channel).toBe('CARD_DEBIT');
      expect(data.affectsAccount).toBe(true);
    });

    it('cartão CREDIT com closingDay/dueDay → data vira vencimento da fatura', async () => {
      // compra Mar 5, fecha dia 10, vence dia 20 → compra < closing → vence Mar 20
      mockDb.card.findFirst.mockResolvedValue({
        id: 'card-1',
        type: CardType.CREDIT,
        accountId: 'acc-card',
        closingDay: 10,
        dueDay: 20,
      });
      mockDb.transaction.create.mockResolvedValue(makeTx());

      await service.create('user-1', baseDto as any);

      const { data } = mockDb.transaction.create.mock.calls[0][0];
      expect(data.date).toEqual(utc(2024, 3, 20));
    });
  });

  // ═══════════════════════════════════════════
  // create — parcelamentos
  // ═══════════════════════════════════════════

  describe('create — parcelamentos', () => {
    const dto = {
      accountId: 'acc-1',
      type: TransactionType.EXPENSE,
      amount: 300,
      totalInstallments: 3,
      date: '2024-03-01' as unknown as Date,
      description: 'Notebook',
    };

    beforeEach(() => {
      mockDb.installment.create.mockResolvedValue({ id: 'inst-1' });
      mockDb.transaction.create.mockResolvedValue(makeTx());
    });

    it('cria 3 transações para parcelamento 3x', async () => {
      await service.create('user-1', dto as any);
      expect(mockDb.transaction.create).toHaveBeenCalledTimes(3);
    });

    it('divide o valor igualmente (300 / 3 = 100 cada)', async () => {
      await service.create('user-1', dto as any);
      mockDb.transaction.create.mock.calls.forEach((call: any) => {
        expect(Number(call[0].data.amount)).toBeCloseTo(100, 2);
      });
    });

    it('soma das parcelas é igual ao total quando divisão não é exata', async () => {
      await service.create('user-1', { ...dto, amount: 100 } as any);
      const calls = mockDb.transaction.create.mock.calls;
      const total = calls.reduce(
        (s: number, c: any) => s + Number(c[0].data.amount),
        0,
      );
      expect(total).toBeCloseTo(100, 2);
    });

    it('1ª parcela recebe centavos extras quando divisão não é exata', async () => {
      await service.create('user-1', { ...dto, amount: 100 } as any);
      const calls = mockDb.transaction.create.mock.calls;
      const first = Number(calls[0][0].data.amount);
      const second = Number(calls[1][0].data.amount);
      expect(first).toBeGreaterThanOrEqual(second);
    });

    it('parcelas ficam em meses consecutivos', async () => {
      await service.create('user-1', dto as any);
      const dates: Date[] = mockDb.transaction.create.mock.calls.map(
        (c: any) => c[0].data.date as Date,
      );
      expect(dates[0]).toEqual(utc(2024, 3, 1));
      expect(dates[1]).toEqual(utc(2024, 4, 1));
      expect(dates[2]).toEqual(utc(2024, 5, 1));
    });

    it('formata descrição como "Descrição (N/Total)"', async () => {
      await service.create('user-1', dto as any);
      const descs = mockDb.transaction.create.mock.calls.map(
        (c: any) => c[0].data.description,
      );
      expect(descs).toEqual([
        'Notebook (1/3)',
        'Notebook (2/3)',
        'Notebook (3/3)',
      ]);
    });

    it('todas as parcelas têm status PENDING', async () => {
      await service.create('user-1', dto as any);
      mockDb.transaction.create.mock.calls.forEach((c: any) => {
        expect(c[0].data.status).toBe(TransactionStatus.PENDING);
      });
    });

    it('lança BadRequestException quando paidInstallments >= totalInstallments', async () => {
      await expect(
        service.create('user-1', { ...dto, paidInstallments: 3 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('com paidInstallments=1 cria apenas as 2 parcelas restantes', async () => {
      await service.create('user-1', { ...dto, paidInstallments: 1 } as any);
      expect(mockDb.transaction.create).toHaveBeenCalledTimes(2);
    });

    it('clamp no fim do mês: 31/jan + 3x → 31/jan, 29/fev, 31/mar (bissexto)', async () => {
      await service.create('user-1', {
        ...dto,
        date: '2024-01-31' as unknown as Date,
      } as any);
      const dates: Date[] = mockDb.transaction.create.mock.calls.map(
        (c: any) => c[0].data.date as Date,
      );
      expect(dates[0]).toEqual(utc(2024, 1, 31));
      expect(dates[1]).toEqual(utc(2024, 2, 29));
      expect(dates[2]).toEqual(utc(2024, 3, 31));
    });
  });

  // ═══════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════

  describe('remove', () => {
    it('lança NotFoundException quando transação não existe', async () => {
      mockDb.transaction.findFirst.mockResolvedValue(null);
      await expect(service.remove('tx-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('soft delete simples: chama update com isActive false', async () => {
      mockDb.transaction.findFirst.mockResolvedValue(
        makeTx({ installmentId: null, installmentNum: null }),
      );
      const updated = makeTx({ isActive: false });
      mockDb.transaction.update.mockResolvedValue(updated);

      const result = await service.remove('tx-1', 'user-1');

      expect(mockDb.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
      expect(result).toEqual(updated);
    });

    it('parcela: usa updateMany para desativar esta e as subsequentes', async () => {
      mockDb.transaction.findFirst.mockResolvedValue(
        makeTx({ installmentId: 'inst-1', installmentNum: 2 }),
      );
      mockDb.transaction.findFirstOrThrow.mockResolvedValue(
        makeTx({ isActive: false }),
      );

      await service.remove('tx-1', 'user-1');

      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.transaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            installmentId: 'inst-1',
            installmentNum: { gte: 2 },
          }),
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('parcela: não chama transaction.update direto', async () => {
      mockDb.transaction.findFirst.mockResolvedValue(
        makeTx({ installmentId: 'inst-1', installmentNum: 1 }),
      );
      mockDb.transaction.findFirstOrThrow.mockResolvedValue(
        makeTx({ isActive: false }),
      );

      await service.remove('tx-1', 'user-1');

      expect(mockDb.transaction.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  // listFuture — recorrências virtuais
  // ═══════════════════════════════════════════

  describe('listFuture', () => {
    it('retorna lista vazia quando não há nada', async () => {
      mockDb.transaction.findMany.mockResolvedValue([]);
      const result = await service.listFuture('user-1', {});
      expect(result).toEqual([]);
    });

    it('resultado está ordenado por data crescente', async () => {
      const realFuture = makeTx({ id: 'real', date: utc(2025, 2, 15) });
      const base = makeTx({
        id: 'base-1',
        date: new Date(Date.now() - 10 * 86400_000),
        isRecurring: true,
      });

      mockDb.transaction.findMany
        .mockResolvedValueOnce([realFuture])
        .mockResolvedValueOnce([base]);

      const result = await service.listFuture('user-1', {
        to: new Date(Date.now() + 60 * 86400_000).toISOString() as any,
      });

      for (let i = 1; i < result.length; i++) {
        expect(new Date(result[i].date).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i - 1].date).getTime(),
        );
      }
    });

    it('transações virtuais têm status PENDING e flag isVirtual', async () => {
      // base deve ser recente o suficiente para +1 mês cair no futuro
      const recentPast = new Date(Date.now() - 5 * 86400_000); // 5 dias atrás
      const base = makeTx({
        id: 'base-1',
        date: recentPast,
        isRecurring: true,
      });

      mockDb.transaction.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([base]);

      const result = await service.listFuture('user-1', {
        to: new Date(Date.now() + 400 * 86400_000).toISOString() as any,
      });

      const virtuals = result.filter((t: any) => t.isVirtual);
      expect(virtuals.length).toBeGreaterThan(0);
      virtuals.forEach((v: any) => {
        expect(v.status).toBe(TransactionStatus.PENDING);
        expect(v.isVirtual).toBe(true);
        expect(v.installmentId).toBeNull();
        expect(v.installmentNum).toBeNull();
        expect(v.totalInstallments).toBeNull();
      });
    });

    it('ID das virtuais segue padrão recurring:<baseId>:<YYYY-MM-DD>', async () => {
      const base = makeTx({
        id: 'base-1',
        date: new Date(Date.now() - 5 * 86400_000),
        isRecurring: true,
      });

      mockDb.transaction.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([base]);

      const result = await service.listFuture('user-1', {
        to: new Date(Date.now() + 400 * 86400_000).toISOString() as any,
      });

      result
        .filter((t: any) => t.isVirtual)
        .forEach((v: any) => {
          expect(v.id).toMatch(/^recurring:base-1:\d{4}-\d{2}-\d{2}$/);
        });
    });

    it('sourceTransactionId das virtuais aponta para o id da base', async () => {
      const base = makeTx({
        id: 'base-1',
        date: new Date(Date.now() - 5 * 86400_000),
        isRecurring: true,
      });

      mockDb.transaction.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([base]);

      const result = await service.listFuture('user-1', {
        to: new Date(Date.now() + 400 * 86400_000).toISOString() as any,
      });

      result
        .filter((t: any) => t.isVirtual)
        .forEach((v: any) => {
          expect(v.sourceTransactionId).toBe('base-1');
        });
    });
  });
});
