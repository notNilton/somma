import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "pagah_access_token";
export const TOKEN_EXPIRES_AT_KEY = "pagah_token_expires_at";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const isLoginRequest = config.url?.includes("/api/app/login");
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && !isLoginRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const CACHED_USER_KEY = "pagah_cached_user";

let refreshPromise: Promise<string> | null = null;
let loggingOut = false;
let _onForceLogout: (() => void) | null = null;
let _onTokenRefreshed: ((expiresAtMs: number) => void) | null = null;

export function setOnForceLogout(cb: (() => void) | null) {
  _onForceLogout = cb;
}

export function setOnTokenRefreshed(cb: ((expiresAtMs: number) => void) | null) {
  _onTokenRefreshed = cb;
}

export function prepareLogout() {
  loggingOut = true;
  refreshPromise = null;
}

export function resetAuthState() {
  loggingOut = false;
  refreshPromise = null;
}

async function forceLogout() {
  loggingOut = true;
  refreshPromise = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
  await SecureStore.deleteItemAsync(CACHED_USER_KEY);
  _onForceLogout?.();
  router.replace("/login/login" as any);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest =
      originalRequest?.url?.includes("/api/app/login") ||
      originalRequest?.url?.includes("/api/app/refresh");

    if (
      error.response?.status === 401 &&
      !isAuthRequest &&
      !originalRequest._retry &&
      !loggingOut
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post<{ token: string; expires_in?: number; user?: any }>("/api/app/refresh")
            .then(async (res) => {
              if (loggingOut) throw new Error("logout");
              const newToken = res.data.token;
              await SecureStore.setItemAsync(TOKEN_KEY, newToken);
              if (res.data.expires_in) {
                const expiresAt = Date.now() + res.data.expires_in * 1000;
                await SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, String(expiresAt));

                // Notify AuthContext so it can reschedule its refresh timer
                _onTokenRefreshed?.(expiresAt);
              }
              // Also update cached user if returned in the refresh response
              if (res.data.user) {
                await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(res.data.user));
              }
              refreshPromise = null;
              return newToken;
            })
            .catch(async (err) => {
              refreshPromise = null;
              // Only force logout if the refresh endpoint itself returned 401/403
              // (refresh token expired or invalid). Network errors should not log out.
              const isRefreshRejected =
                err.response?.status === 401 || err.response?.status === 403;
              if (!loggingOut && isRefreshRejected) {
                await forceLogout();
              }
              throw err;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        throw error;
      }
    }

    throw error;
  },
);

export default api;
