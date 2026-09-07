export type TransactionStatus = "paid" | "processing" | "refused";
export type TransactionType = "withdraw" | "anticipate";

export interface Transaction {
  id: string;
  type: TransactionType;
  value: number;
  date: string;
  time: string;
  status: TransactionStatus;
}

export interface WalletBalance {
  available_for_withdrawal: number;
  available_to_anticipate: number;
  non_anticipatable: number;
  under_review: number;
  chargebacks: {
    count: number;
    total_amount: number;
  };
}

export interface WithdrawRequest {
  amount: number;
}

export interface AdvanceRequest {
  amount: number;
}
