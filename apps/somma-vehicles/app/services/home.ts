import api from "./api";
import { isDemoMode, DEMO_HOME } from "./demo";
import type { HomeData, HomeFilters } from "@/types/home";

export const homeService = {
  async getHome(filters?: HomeFilters): Promise<HomeData> {
    if (isDemoMode) return DEMO_HOME;
    const { data } = await api.get<HomeData>("/api/app/home", { params: filters });
    return data;
  },
};
