import api from "./api";
import { isDemoMode } from "./demo";
import type { SaleRequest, SaleResponse } from "@/types/sales";

export const salesService = {
  /**
   * Registra uma nova venda no backend.
   *
   * Em modo demo, retorna um ID mock sem chamar a API.
   */
  create: async (payload: SaleRequest): Promise<SaleResponse> => {
    if (isDemoMode) {
      return { id: `demo-${Date.now()}` };
    }
    const { data } = await api.post<SaleResponse>(
      "/api/app/vendas",
      payload,
    );
    return data;
  },
};
