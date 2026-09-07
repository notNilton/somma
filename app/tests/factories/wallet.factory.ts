import { faker } from "@faker-js/faker";
import type { WalletBalance, Transaction, TransactionStatus, TransactionType, WithdrawRequest, AdvanceRequest } from "@/types/wallet";

export function createMockWalletBalance(overrides: Partial<WalletBalance> = {}): WalletBalance {
  return {
    available_for_withdrawal: faker.number.int({ min: 0, max: 100000 }),
    available_to_anticipate: faker.number.int({ min: 0, max: 200000 }),
    non_anticipatable: faker.number.int({ min: 0, max: 50000 }),
    under_review: faker.number.int({ min: 0, max: 30000 }),
    chargebacks: {
      count: faker.number.int({ min: 0, max: 5 }),
      total_amount: faker.number.int({ min: 0, max: 10000 }),
    },
    ...overrides,
  };
}

export function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const types: TransactionType[] = ["withdraw", "anticipate"];
  const statuses: TransactionStatus[] = ["paid", "processing", "refused"];

  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(types),
    value: faker.number.int({ min: 1000, max: 100000 }),
    date: faker.date.recent().toISOString().split("T")[0],
    time: faker.date.recent().toTimeString().slice(0, 5),
    status: faker.helpers.arrayElement(statuses),
    ...overrides,
  };
}

export function createMockTransactionList(count: number = 5): Transaction[] {
  return Array.from({ length: count }, () => createMockTransaction());
}

export function createMockWithdrawRequest(overrides: Partial<WithdrawRequest> = {}): WithdrawRequest {
  return {
    amount: faker.number.int({ min: 1000, max: 100000 }),
    ...overrides,
  };
}

export function createMockAdvanceRequest(overrides: Partial<AdvanceRequest> = {}): AdvanceRequest {
  return {
    amount: faker.number.int({ min: 1000, max: 200000 }),
    ...overrides,
  };
}
