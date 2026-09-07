import type { MetricsFilters, UtmResponse } from "@/types/metrics";
import api from "./api";
import { DEMO_METRICS, isDemoMode } from "./demo";

export const metricsService = {
  getUtmReport: async (filters?: MetricsFilters): Promise<UtmResponse> => {
    if (isDemoMode) return DEMO_METRICS;
    const { data } = await api.get<UtmResponse>("/api/app/utm", {
      params: { group_by: "utm_source", ...filters },
    });
    return data;
  },
};
