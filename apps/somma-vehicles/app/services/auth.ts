import * as SecureStore from "expo-secure-store";

import type { LoginRequest, LoginResponse, Profile, PushValorTipo, User } from "@/types/auth";
import api, { TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, prepareLogout, resetAuthState } from "./api";
import { isDemoMode, DEMO_USER, DEMO_PROFILE } from "./demo";

const CACHED_USER_KEY = "pagah_cached_user";

async function saveToken(token: string, expiresInSeconds?: number): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (expiresInSeconds && expiresInSeconds > 0) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    await SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
  }
}

async function saveCachedUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user));
}

async function getCachedUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(CACHED_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

async function clearTokenData(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY);
  await SecureStore.deleteItemAsync(CACHED_USER_KEY);
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    resetAuthState();
    const { data } = await api.post<LoginResponse>("/api/app/login", credentials);
    await saveToken(data.token, data.expires_in);
    await saveCachedUser(data.user);
    return data;
  },

  logout: async (): Promise<void> => {
    prepareLogout();
    await clearTokenData();
  },

  getMe: async (): Promise<User> => {
    if (isDemoMode) return DEMO_USER;
    const { data } = await api.get<User>("/api/app/me");
    await saveCachedUser(data);
    return data;
  },

  refresh: async (): Promise<void> => {
    const { data } = await api.post<LoginResponse>("/api/app/refresh");
    await saveToken(data.token, data.expires_in);
    await saveCachedUser(data.user);
  },

  getCachedUser,

  getTokenExpiresAt: async (): Promise<number | null> => {
    const raw = await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
    return raw ? Number(raw) : null;
  },

  getProfile: async (): Promise<Profile> => {
    if (isDemoMode) return DEMO_PROFILE;
    const { data } = await api.get<Profile>("/api/app/perfil");
    return data;
  },

  updateProfile: async (
    payload: { first_name: string; last_name?: string; push_valor_tipo?: PushValorTipo },
  ): Promise<Profile> => {
    if (isDemoMode) {
      return {
        ...DEMO_PROFILE,
        first_name: payload.first_name,
        last_name: payload.last_name ?? null,
        push_valor_tipo: payload.push_valor_tipo ?? DEMO_PROFILE.push_valor_tipo,
      };
    }
    const { data } = await api.put<Profile>("/api/app/perfil", payload);
    return data;
  },

  isAuthenticated: async (): Promise<boolean> => {
    if (isDemoMode) return true;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token !== null;
  },
};
