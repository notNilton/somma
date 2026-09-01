import * as SecureStore from "expo-secure-store";

// Shared mock axios instance that survives hoisting
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

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
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

import {
  TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  CACHED_USER_KEY,
  setOnTokenRefreshed,
  setOnForceLogout,
  prepareLogout,
  resetAuthState,
} from "@/services/api";
import { authService } from "@/services/auth";

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

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────
// Funções exportadas da api
// ──────────────────────────────────────────────

describe("api — funções de estado", () => {
  it("prepareLogout não lança erro", () => {
    expect(() => prepareLogout()).not.toThrow();
  });

  it("resetAuthState não lança erro", () => {
    expect(() => resetAuthState()).not.toThrow();
  });

  it("prepareLogout + resetAuthState podem ser chamados em sequência", () => {
    expect(() => {
      prepareLogout();
      resetAuthState();
    }).not.toThrow();
  });
});

describe("api — callbacks de notificação", () => {
  it("setOnForceLogout registra callback sem erro", () => {
    const callback = jest.fn();
    expect(() => setOnForceLogout(callback)).not.toThrow();
    expect(() => setOnForceLogout(null)).not.toThrow();
  });

  it("setOnTokenRefreshed registra callback sem erro", () => {
    const callback = jest.fn();
    expect(() => setOnTokenRefreshed(callback)).not.toThrow();
    expect(() => setOnTokenRefreshed(null)).not.toThrow();
  });
});

describe("authService.refresh — cache do usuário", () => {
  it("salva token, expires_at e cached user no SecureStore", async () => {
    const mockRefreshResponse = {
      data: {
        token: "refreshed-jwt-xyz",
        token_type: "Bearer",
        expires_in: 3600,
        user: MOCK_USER,
      },
    };

    __mockAxios.instance.post.mockResolvedValueOnce(mockRefreshResponse);

    await authService.refresh();

    expect(__mockAxios.instance.post).toHaveBeenCalledWith("/api/app/refresh");
    expect(mockedSetItem).toHaveBeenCalledWith(TOKEN_KEY, "refreshed-jwt-xyz");
    expect(mockedSetItem).toHaveBeenCalledWith(
      TOKEN_EXPIRES_AT_KEY,
      expect.any(String),
    );
    expect(mockedSetItem).toHaveBeenCalledWith(
      CACHED_USER_KEY,
      JSON.stringify(MOCK_USER),
    );
  });
});
