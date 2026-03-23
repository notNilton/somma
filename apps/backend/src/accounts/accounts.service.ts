import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Account } from '@mirante/database';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Prisma } from '@mirante/database';

@Injectable()
export class AccountsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(userId: string): Promise<Account[]> {
    return this.db.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Account> {
    const account = await this.db.account.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  create(userId: string, dto: CreateAccountDto): Promise<Account> {
    return this.db.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        ownership: dto.ownership ?? 'PERSONAL',
        bankName: dto.bankName,
        cpf: dto.cpf,
        cnpj: dto.cnpj,
        color: dto.color,
        icon: dto.icon,
        currencyCode: dto.currencyCode || 'BRL',
        balance: new Prisma.Decimal(dto.balance ?? 0),
        creditLimit:
          dto.creditLimit !== undefined
            ? new Prisma.Decimal(dto.creditLimit)
            : null,
        hasDebit: dto.hasDebit ?? true,
        hasPix: dto.hasPix ?? true,
        hasCredit: dto.hasCredit ?? false,
        includeInTotal: dto.includeInTotal ?? true,
        closingDay: dto.closingDay ?? null,
        dueDay: dto.dueDay ?? null,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    await this.findOne(id, userId);

    return this.db.account.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        ownership: dto.ownership,
        bankName: dto.bankName,
        cpf: dto.cpf,
        cnpj: dto.cnpj,
        color: dto.color,
        icon: dto.icon,
        currencyCode: dto.currencyCode,
        balance:
          dto.balance !== undefined
            ? new Prisma.Decimal(dto.balance)
            : undefined,
        creditLimit:
          dto.creditLimit === null
            ? null
            : dto.creditLimit !== undefined
              ? new Prisma.Decimal(dto.creditLimit)
              : undefined,
        hasDebit: dto.hasDebit,
        hasPix: dto.hasPix,
        hasCredit: dto.hasCredit,
        includeInTotal: dto.includeInTotal,
        isActive: dto.isActive,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
      },
    });
  }

  async creditSummary(userId: string): Promise<{
    totalCreditLimit: number;
    creditUsed: number;
    availableCredit: number;
  }> {
    const accounts = await this.db.account.findMany({
      where: { userId, isActive: true },
      select: { creditLimit: true },
    });

    const totalCreditLimit = accounts.reduce(
      (sum, a) => sum + Number(a.creditLimit ?? 0),
      0,
    );

    const [expenses, payments] = await Promise.all([
      this.db.transaction.aggregate({
        where: {
          userId,
          isActive: true,
          paymentMethod: 'CREDIT',
          type: 'EXPENSE',
        },
        _sum: { amount: true },
      }),
      this.db.transaction.aggregate({
        where: {
          userId,
          isActive: true,
          paymentMethod: 'CREDIT',
          type: 'INCOME',
        },
        _sum: { amount: true },
      }),
    ]);

    const creditUsed = Math.max(
      0,
      Number(expenses._sum.amount ?? 0) - Number(payments._sum.amount ?? 0),
    );

    return {
      totalCreditLimit,
      creditUsed,
      availableCredit: Math.max(0, totalCreditLimit - creditUsed),
    };
  }

  async remove(id: string, userId: string): Promise<Account> {
    await this.findOne(id, userId);
    return this.db.account.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
