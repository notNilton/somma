import api from "./api";
import { isDemoMode, DEMO_NOTIFICATIONS } from "./demo";
import type { Notification } from "@/types/notifications";

export const notificationsService = {
  async getNotifications(): Promise<Notification[]> {
    if (isDemoMode) return DEMO_NOTIFICATIONS;
    const { data } = await api.get<Notification[]>("/api/app/notificacoes");
    return data;
  },
};
