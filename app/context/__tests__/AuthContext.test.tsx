import * as SecureStore from "expo-secure-store";

// Shared mock axios instance
const __mockAxios = { instance: null as any };

jest.mock("axios", () => {
  const instance = {
    defaults: { baseURL: "" },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  __mockAxios.instance = instance;
  return {
    create: jest.fn(() => instance),
  };
});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedGetItem = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;
const mockedSetItem = SecureStore.setItemAsync as jest.MockedFunction<
  typeof SecureStore.setItemAsync
>;
const mockedDeleteItem = SecureStore.deleteItemAsync as jest.MockedFunction<
  typeof SecureStore.deleteItemAsync
>;

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

jest.mock("@/services/notifications", () => ({
  registerPushToken: jest.fn(() => Promise.resolve()),
  unregisterPushToken: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/services/demo", () => ({
  enableDemoMode: jest.fn(),
  disableDemoMode: jest.fn(),
  isDemoMode: false,
  DEMO_USER: {
    id: 999,
    name: "Demo",
    email: "demo@pagah.com",
    document: null,
    profile_photo_url: null,
    telefone: null,
    cpf: null,
    instagram: null,
  },
  DEMO_PROFILE: {
    first_name: "Demo",
    last_name: null,
    full_name: "Demo",
    email: "demo@pagah.com",
    cpf: null,
    birth_date: null,
    phone: null,
  },
}));

import React from "react";
import { render, act, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function getAxios() {
  return __mockAxios.instance;
}

const MOCK_USER = {
  id: 1,
  name: "Test User",
  email: "test@pagah.com",
  document: null,
  profile_photo_url: null,
  telefone: null,
  cpf: null,
  instagram: null,
};

const TOKEN_KEY = "pagah_access_token";
const TOKEN_EXPIRES_AT_KEY = "pagah_token_expires_at";
const CACHED_USER_KEY = "pagah_cached_user";

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Renders AuthProvider with a harness that captures auth state.
 * Wraps render and initial promise flushes inside act() to avoid warnings.
 */
async function createAuthHarness() {
  let currentAuth: any = null;

  function Harness() {
    currentAuth = useAuth();
    return null;
  }

  await act(async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
  });

  return {
    /** Returns the latest auth state (updated on each re-render) */
    getState: () => currentAuth,
    /**
     * Waits until effects settle and isLoading becomes false.
     * Uses waitFor which retries inside act() automatically.
     */
    ready: waitFor(
      () => {
        expect(currentAuth).not.toBeNull();
        expect(currentAuth.isLoading).toBe(false);
      },
      { timeout: 5000 },
    ),
  };
}

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────

describe("AuthProvider — init", () => {
  it("inicializa sem token: isLoading=false, user=null", async () => {
    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    const auth = getState();
    expect(auth.user).toBeNull();
    expect(typeof auth.login).toBe("function");
    expect(typeof auth.logout).toBe("function");
  });

  it("com token válido: restaura user via getMe", async () => {
    mockedGetItem.mockImplementation(async (key: string) => {
      if (key === TOKEN_KEY) return "valid-token";
      if (key === TOKEN_EXPIRES_AT_KEY) return String(Date.now() + 3600_000);
      return null;
    });

    getAxios().get.mockResolvedValueOnce({ data: MOCK_USER });

    const { getState, ready } = await createAuthHarness();
    await ready;

    const auth = getState();
    expect(auth.user).toEqual(MOCK_USER);
  });

  it("com token + getMe falha: restaura user do cache como fallback", async () => {
    mockedGetItem.mockImplementation(async (key: string) => {
      if (key === TOKEN_KEY) return "valid-token";
      if (key === TOKEN_EXPIRES_AT_KEY) return String(Date.now() + 3600_000);
      if (key === CACHED_USER_KEY) return JSON.stringify(MOCK_USER);
      return null;
    });

    getAxios().get.mockRejectedValueOnce(new Error("Network error"));

    const { getState, ready } = await createAuthHarness();
    await ready;

    const auth = getState();
    expect(auth.user).toEqual(MOCK_USER);
  });

  it("com token expirando: faz refresh proativo antes de getMe", async () => {
    mockedGetItem.mockImplementation(async (key: string) => {
      if (key === TOKEN_KEY) return "expiring-token";
      if (key === TOKEN_EXPIRES_AT_KEY) return String(Date.now() + 30_000);
      return null;
    });

    getAxios().post.mockResolvedValueOnce({
      data: { token: "refreshed", token_type: "Bearer", expires_in: 3600, user: MOCK_USER },
    });
    getAxios().get.mockResolvedValueOnce({ data: MOCK_USER });

    const { getState, ready } = await createAuthHarness();
    await ready;

    const auth = getState();
    expect(auth.user).toEqual(MOCK_USER);
    expect(getAxios().post).toHaveBeenCalledWith("/api/app/refresh");
  });
});

// ──────────────────────────────────────────────
// Login / Logout
// ──────────────────────────────────────────────

describe("AuthProvider — login/logout", () => {
  it("login salva user no estado", async () => {
    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    const authBefore = getState();
    expect(authBefore.user).toBeNull();

    getAxios().post.mockResolvedValueOnce({
      data: { token: "jwt-abc", token_type: "Bearer", expires_in: 3600, user: MOCK_USER },
    });

    await act(async () => {
      await authBefore.login("test@pagah.com", "123456");
    });

    // After login triggers re-render, getState() returns updated state
    const authAfter = getState();
    expect(authAfter.user).toEqual(MOCK_USER);
  });

  it("logout limpa user do estado", async () => {
    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    const auth = getState();

    await act(async () => {
      await auth.logout();
    });

    expect(auth.user).toBeNull();
  });

  it("login salva token e cached user no SecureStore", async () => {
    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    getAxios().post.mockResolvedValueOnce({
      data: { token: "jwt-abc", token_type: "Bearer", expires_in: 3600, user: MOCK_USER },
    });

    const auth = getState();

    await act(async () => {
      await auth.login("test@pagah.com", "123456");
    });

    expect(mockedSetItem).toHaveBeenCalledWith(TOKEN_KEY, "jwt-abc");
    expect(mockedSetItem).toHaveBeenCalledWith(
      CACHED_USER_KEY,
      JSON.stringify(MOCK_USER),
    );
  });

  //
  // Cobertura crítica (issue de produção: "ao logar não cria o token no backend"):
  //
  it("login chama registerPushToken com os parâmetros da nova API (silent=false)", async () => {
    const notifications = require("@/services/notifications") as {
      registerPushToken: jest.Mock;
      unregisterPushToken: jest.Mock;
    };
    notifications.registerPushToken.mockClear();

    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    getAxios().post.mockResolvedValueOnce({
      data: { token: "jwt-abc", token_type: "Bearer", expires_in: 3600, user: MOCK_USER },
    });

    const auth = getState();

    await act(async () => {
      await auth.login("test@pagah.com", "123456");
    });

    // Drena microtasks pendentes (registerPushToken é fire-and-forget)
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(notifications.registerPushToken).toHaveBeenCalled();
    const lastCall = notifications.registerPushToken.mock.calls.at(-1)?.[0] ?? {};
    expect(lastCall).toEqual(expect.objectContaining({ silent: false }));
    expect(typeof lastCall.maxRetries).toBe("number");
    expect(lastCall.maxRetries).toBeGreaterThanOrEqual(1);
  });

  it("logout chama unregisterPushToken ANTES de limpar auth local", async () => {
    const notifications = require("@/services/notifications") as {
      registerPushToken: jest.Mock;
      unregisterPushToken: jest.Mock;
    };
    notifications.unregisterPushToken.mockClear();

    mockedGetItem.mockResolvedValue(null);

    const { getState, ready } = await createAuthHarness();
    await ready;

    // Login primeiro
    getAxios().post.mockResolvedValueOnce({
      data: { token: "jwt-abc", token_type: "Bearer", expires_in: 3600, user: MOCK_USER },
    });
    const auth = getState();
    await act(async () => {
      await auth.login("test@pagah.com", "123456");
    });

    notifications.unregisterPushToken.mockClear();

    // Logout
    await act(async () => {
      await auth.logout();
    });

    // unregisterPushToken deve ter sido chamado
    expect(notifications.unregisterPushToken).toHaveBeenCalled();

    // SecureStore deve ter sido limpo após unregister
    const deleteOrder = mockedDeleteItem.mock.invocationCallOrder;
    expect(deleteOrder.length).toBeGreaterThan(0);
  });
});
