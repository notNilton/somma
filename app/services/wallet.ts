import type {
  AdvanceRequest,
  Transaction,
  WalletBalance,
  WithdrawRequest,
} from "@/types/wallet";
import api from "./api";
import { isDemoMode, DEMO_BALANCE, DEMO_HISTORY } from "./demo";

export const walletService = {
  getBalance: async (): Promise<WalletBalance> => {
    if (isDemoMode) return DEMO_BALANCE;
    const { data } = await api.get<WalletBalance>("/api/app/saldo");
    return data;
  },

  getHistory: async (): Promise<Transaction[]> => {
    if (isDemoMode) return DEMO_HISTORY;
    const { data } = await api.get<{ data: Transaction[] }>("/api/app/saques");
    return data.data;
  },

  withdraw: async (payload: WithdrawRequest): Promise<void> => {
    await api.post("/wallet/withdraw", payload);
  },

  advance: async (payload: AdvanceRequest): Promise<void> => {
    await api.post("/wallet/advance", payload);
  },
};
