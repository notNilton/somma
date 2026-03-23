import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TransactionType } from '@mirante/database';
import { startOfMonth, endOfMonth, format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardData(userId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1. Get Accounts
    const accounts = await this.db.account.findMany({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce(
      (acc, curr) => acc + Number(curr.balance),
      0,
    );

    // 2. Monthly Income & Expenses
    const monthlyTransactions = await this.db.transaction.findMany({
      where: {
        userId,
        isActive: true,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        type: true,
        amount: true,
        classification: true,
      },
    });

    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    // 3. Recent Transactions
    const recentTransactions = await this.db.transaction.findMany({
      where: { userId, isActive: true },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        category: true,
      },
    });

    // 4. Cash Flow (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const cashFlow = await Promise.all(
      last7Days.map(async (date) => {
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayTransactions = await this.db.transaction.aggregate({
          where: {
            userId,
            isActive: true,
            date: {
              gte: date,
              lte: dayEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        // Simple mock for chart visualization if no data
        return {
          day: format(date, 'eee'),
          value: Number(dayTransactions._sum.amount || 0),
        };
      }),
    );

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      safeToSpend: totalBalance - monthlyExpenses, // Simplified logic
      accounts: accounts.map((acc) => ({
        label: acc.name,
        val: Number(acc.balance),
        color: acc.color,
        icon: acc.icon,
      })),
      recentTransactions: recentTransactions.map((t) => ({
        label: t.description,
        cat: t.category?.name || 'Sem Categoria',
        val:
          t.type === TransactionType.EXPENSE
            ? -Number(t.amount)
            : Number(t.amount),
        date: format(t.date, 'dd MMM'),
        icon: t.category?.description || '📦',
      })),
      cashFlow,
    };
  }
}
