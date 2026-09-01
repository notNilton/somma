/**
 * Test helpers for mocking API services.
 */
import type { HomeData } from "@/types/home";
import type { UtmResponse } from "@/types/metrics";
import type { Notification } from "@/types/notifications";
import type { WalletBalance, Transaction } from "@/types/wallet";
import type { Release } from "@/types/releases";

export function mockApiSuccess<T>(data: T) {
  return jest.fn().mockResolvedValue({ data });
}

export function mockApiError(status: number, message: string = "Error") {
  const error: any = new Error(message);
  error.response = { status, data: { message } };
  return jest.fn().mockRejectedValue(error);
}

export function mockNetworkError() {
  return jest.fn().mockRejectedValue(new Error("Network Error"));
}

/**
 * Mock data for common service responses.
 */
export const MOCK_API_RESPONSES = {
  home: {} as HomeData,
  metrics: {} as UtmResponse,
  notifications: [] as Notification[],
  wallet: {} as WalletBalance,
  history: [] as Transaction[],
  releases: [] as Release[],
} as const;
