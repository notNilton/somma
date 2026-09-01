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

import { authService } from "@/services/auth";
import {
  TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  CACHED_USER_KEY,
} from "@/services/api";

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

function getAxios() {
  return __mockAxios.instance;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────────────────────────────────────────────
// saveToken / saveCachedUser / clearTokenData
// ──────────────────────────────────────────────

describe("authService.login", () => {
  it("salva token + expires_at + cached user no SecureStore", async () => {
    const mockResponse = {
      data: {
        token: "jwt-abc-123",
        token_type: "Bearer",
        expires_in: 3600,
        user: MOCK_USER,
      },
    };

    getAxios().post.mockResolvedValueOnce(mockResponse);
    mockedGetItem.mockResolvedValue(null);

    await authService.login({ email: "test@pagah.com", password: "123456" });

    expect(getAxios().post).toHaveBeenCalledWith("/api/app/login", {
      email: "test@pagah.com",
      password: "123456",
    });
    expect(mockedSetItem).toHaveBeenCalledWith(TOKEN_KEY, "jwt-abc-123");
    expect(mockedSetItem).toHaveBeenCalledWith(
      CACHED_USER_KEY,
      JSON.stringify(MOCK_USER),
    );
    expect(mockedSetItem).toHaveBeenCalledWith(
      TOKEN_EXPIRES_AT_KEY,
      expect.any(String),
    );
    const expiresAtCall = mockedSetItem.mock.calls.find(
      ([key]) => key === TOKEN_EXPIRES_AT_KEY,
    );
    expect(expiresAtCall).toBeDefined();
    const storedExpiresAt = Number(expiresAtCall![1]);
    expect(storedExpiresAt).toBeGreaterThan(Date.now());
    expect(storedExpiresAt).toBeLessThan(Date.now() + 4000 * 1000);
  });
});

// ──────────────────────────────────────────────
// isAuthenticated
// ──────────────────────────────────────────────

describe("authService.isAuthenticated", () => {
  it("retorna true quando token existe", async () => {
    mockedGetItem.mockResolvedValue("some-token");
    const result = await authService.isAuthenticated();
    expect(result).toBe(true);
    expect(mockedGetItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it("retorna false quando token não existe", async () => {
    mockedGetItem.mockResolvedValue(null);
    const result = await authService.isAuthenticated();
    expect(result).toBe(false);
  });
});

// ──────────────────────────────────────────────
// getCachedUser
// ──────────────────────────────────────────────

describe("authService.getCachedUser", () => {
  it("retorna usuário quando cache existe", async () => {
    mockedGetItem.mockResolvedValue(JSON.stringify(MOCK_USER));
    const cached = await authService.getCachedUser();
    expect(cached).toEqual(MOCK_USER);
  });

  it("retorna null quando cache não existe", async () => {
    mockedGetItem.mockResolvedValue(null);
    const cached = await authService.getCachedUser();
    expect(cached).toBeNull();
  });

  it("retorna null quando cache é JSON inválido", async () => {
    mockedGetItem.mockResolvedValue("not-json");
    const cached = await authService.getCachedUser();
    expect(cached).toBeNull();
  });
});

// ──────────────────────────────────────────────
// getTokenExpiresAt
// ──────────────────────────────────────────────

describe("authService.getTokenExpiresAt", () => {
  it("retorna timestamp numérico quando existe", async () => {
    const ts = Date.now() + 3600_000;
    mockedGetItem.mockResolvedValue(String(ts));
    const result = await authService.getTokenExpiresAt();
    expect(result).toBe(ts);
  });

  it("retorna null quando não existe", async () => {
    mockedGetItem.mockResolvedValue(null);
    const result = await authService.getTokenExpiresAt();
    expect(result).toBeNull();
  });
});

// ──────────────────────────────────────────────
// logout
// ──────────────────────────────────────────────

describe("authService.logout", () => {
  it("limpa token, expires_at e cached user", async () => {
    mockedDeleteItem.mockResolvedValue(undefined);
    await authService.logout();

    expect(mockedDeleteItem).toHaveBeenCalledWith(TOKEN_KEY);
    expect(mockedDeleteItem).toHaveBeenCalledWith(TOKEN_EXPIRES_AT_KEY);
    expect(mockedDeleteItem).toHaveBeenCalledWith(CACHED_USER_KEY);
  });
});

// ──────────────────────────────────────────────
// refresh
// ──────────────────────────────────────────────

describe("authService.refresh", () => {
  it("chama POST /api/app/refresh e salva novo token + cached user", async () => {
    getAxios().post.mockResolvedValueOnce({
      data: {
        token: "refreshed-jwt",
        token_type: "Bearer",
        expires_in: 7200,
        user: MOCK_USER,
      },
    });

    await authService.refresh();

    expect(getAxios().post).toHaveBeenCalledWith("/api/app/refresh");
    expect(mockedSetItem).toHaveBeenCalledWith(TOKEN_KEY, "refreshed-jwt");
    expect(mockedSetItem).toHaveBeenCalledWith(
      CACHED_USER_KEY,
      JSON.stringify(MOCK_USER),
    );
    expect(mockedSetItem).toHaveBeenCalledWith(
      TOKEN_EXPIRES_AT_KEY,
      expect.any(String),
    );
  });
});

// ──────────────────────────────────────────────
// getMe
// ──────────────────────────────────────────────

describe("authService.getMe", () => {
  it("chama GET /api/app/me e salva cache", async () => {
    getAxios().get.mockResolvedValueOnce({ data: MOCK_USER });

    const user = await authService.getMe();

    expect(getAxios().get).toHaveBeenCalledWith("/api/app/me");
    expect(user).toEqual(MOCK_USER);
    expect(mockedSetItem).toHaveBeenCalledWith(
      CACHED_USER_KEY,
      JSON.stringify(MOCK_USER),
    );
  });
});
