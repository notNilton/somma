import { faker } from "@faker-js/faker";
import type { Notification, NotificationType } from "@/types/notifications";

export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  const types: NotificationType[] = ["cash", "info"];
  return {
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(types),
    message: faker.lorem.sentence(),
    ...overrides,
  };
}

export function createMockNotificationList(count: number = 5): Notification[] {
  return Array.from({ length: count }, () => createMockNotification());
}
