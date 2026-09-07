export type NotificationType = "cash" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}
