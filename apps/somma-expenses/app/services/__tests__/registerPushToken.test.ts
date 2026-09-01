// =========================================================================
// Testes da função `registerPushToken` — cobre todos os caminhos de
// sucesso e falha para garantir que o push token seja salvo no backend
// logo após o login do usuário.
//
// Usa o mock compartilhado de axios (igual aos outros testes) e os mocks
// existentes de expo-notifications.
// =========================================================================

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
    delete: jest.fn(),
  };
  __mockAxios.instance = instance;
  return {
    create: jest.fn(() => instance),
  };
});

jest.mock("expo-notifications", () => {
  const mock = jest.requireActual(
    "./__mocks__/expo-notifications",
  ) as typeof import("./__mocks__/expo-notifications");
  return mock;
});

// `expo-device` agora não é mais importado em services/notifications.ts.
// O mock existe apenas para garantir que mockar este módulo não quebra nada.
jest.mock("expo-device", () => ({
  isDevice: true,
  __esModule: true,
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock minimalista de react-native — registerPushToken chama Platform.OS
// para configurar o canal Android. Sem este mock, Platform é undefined em
// testes Jest.
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

const __mockNotifications =
  jest.requireActual("./__mocks__/expo-notifications") as any;
const __setPermissionStatus = __mockNotifications.__setPermissionStatus;
const __resetExpoPushToken = () => {
  __mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
    data: "expo-push-token-mock",
  });
};

import { registerPushToken, unregisterPushToken } from "@/services/notifications";

const __getExpoPushTokenAsync = __mockNotifications.getExpoPushTokenAsync;
const axiosInstance = __mockAxios.instance;

beforeEach(() => {
  jest.clearAllMocks();
  __setPermissionStatus("granted");
  __resetExpoPushToken();
  // token do jwt é resolvido pelo mock do secure-store
  const secureStore = require("expo-secure-store");
  secureStore.getItemAsync.mockResolvedValue("jwt-fake-token");
});

// =========================================================================
// Caminho feliz
// =========================================================================

describe("registerPushToken — caminho feliz", () => {
  it("envia o Expo push token para /api/app/salvar-token após permissão concedida", async () => {
    axiosInstance.post.mockResolvedValueOnce({
      status: 200,
      data: { status: "success", message: "Token salvo com sucesso", device_id: 1 },
    });

    const result = await registerPushToken();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token).toBe("expo-push-token-mock");
      expect(result.attempts).toBe(1);
    }
    expect(__getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/api/app/salvar-token",
      { push_token: "expo-push-token-mock" },
    );
  });

  it("chama setNotificationChannelAsync no Android", async () => {
    const { Platform } = require("react-native");
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });

    try {
      axiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

      await registerPushToken();

      expect(
        __mockNotifications.setNotificationChannelAsync,
      ).toHaveBeenCalledWith(
        "default",
        expect.objectContaining({
          name: "default",
          importance: 5, // AndroidImportance.MAX
        }),
      );
    } finally {
      Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
    }
  });
});

// =========================================================================
// Permissão negada
// =========================================================================

describe("registerPushToken — permissão negada", () => {
  it("NÃO chama a API quando permissão é negada e retorna reason=permission_denied", async () => {
    __setPermissionStatus("denied");
    __mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: "denied",
    });

    const result = await registerPushToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("permission_denied");
    }
    expect(axiosInstance.post).not.toHaveBeenCalled();
    expect(__getExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});

// =========================================================================
// Retry em caso de falha
// =========================================================================

describe("registerPushToken — retry em erros transitórios", () => {
  it("repete até 3 tentativas em caso de erro 500 e retorna server_error", async () => {
    axiosInstance.post.mockRejectedValue({
      response: { status: 500, data: { message: "Internal" } },
      message: "Server Error",
    });

    const result = await registerPushToken({ maxRetries: 3 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("server_error");
      expect(result.attempts).toBe(3);
      expect(result.status).toBe(500);
    }
    expect(axiosInstance.post).toHaveBeenCalledTimes(3);
  });

  it("repete até 3 tentativas em erro de rede (sem status) e retorna network_error", async () => {
    axiosInstance.post.mockRejectedValue({
      message: "Network Error",
    });

    const result = await registerPushToken({ maxRetries: 3 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("network_error");
      expect(result.attempts).toBe(3);
    }
    expect(axiosInstance.post).toHaveBeenCalledTimes(3);
  });

  it("succeed em retry subsequente: para na primeira tentativa bem-sucedida", async () => {
    axiosInstance.post
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({
        status: 200,
        data: { status: "success", device_id: 99 },
      });

    const result = await registerPushToken({ maxRetries: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attempts).toBe(3); // sucesso na 3ª tentativa
    }
    expect(axiosInstance.post).toHaveBeenCalledTimes(3);
  });
});

// =========================================================================
// Erros 4xx: sem retry
// =========================================================================

describe("registerPushToken — erros 4xx (sem retry)", () => {
  it("retorna client_error em 401 sem retry", async () => {
    axiosInstance.post.mockRejectedValue({
      response: { status: 401, data: { message: "Unauthenticated" } },
      message: "Unauthorized",
    });

    const result = await registerPushToken({ maxRetries: 3 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("client_error");
      expect(result.attempts).toBe(1); // não retentou
      expect(result.status).toBe(401);
    }
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  });

  it("retorna client_error em 422 (payload inválido)", async () => {
    axiosInstance.post.mockRejectedValue({
      response: { status: 422, data: { message: "Validation failed" } },
      message: "Unprocessable",
    });

    const result = await registerPushToken({ maxRetries: 3 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("client_error");
      expect(result.attempts).toBe(1);
      expect(result.status).toBe(422);
    }
    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// Cenários extremos
// =========================================================================

describe("registerPushToken — cenários extremos", () => {
  it("retorna empty_token quando Expo SDK retorna string vazia", async () => {
    __mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: "" });

    const result = await registerPushToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty_token");
    }
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("retorna empty_token quando Expo SDK lança erro (ex.: projeto sem EAS)", async () => {
    __mockNotifications.getExpoPushTokenAsync.mockRejectedValueOnce(
      new Error("Expo push token service is not configured"),
    );

    const result = await registerPushToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty_token");
      expect(result.message).toContain("Expo push token service");
    }
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("respeita maxRetries customizado", async () => {
    axiosInstance.post.mockRejectedValue({
      message: "boom",
    });

    await registerPushToken({ maxRetries: 1 });

    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// Modo silencioso
// =========================================================================

describe("registerPushToken — modo silent", () => {
  it("retorna normalmente com silent=true", async () => {
    const logs: string[] = [];
    const origLog = console.log;
    const origWarn = console.warn;
    console.log = (...args: any[]) => logs.push(args.join(" "));
    console.warn = (...args: any[]) => logs.push(args.join(" "));

    try {
      axiosInstance.post.mockResolvedValueOnce({ status: 200, data: {} });

      const result = await registerPushToken({ silent: true });

      expect(result.ok).toBe(true);
      // No silent mode, não deve haver log nenhum com tag [PushToken]
      const pushLogs = logs.filter((l) => /\[PushToken\]/.test(l));
      expect(pushLogs).toHaveLength(0);
    } finally {
      console.log = origLog;
      console.warn = origWarn;
    }
  });
});

// =========================================================================
// unregisterPushToken
// =========================================================================

describe("unregisterPushToken", () => {
  it("chama DELETE /api/app/salvar-token", async () => {
    axiosInstance.delete.mockResolvedValueOnce({ status: 200, data: {} });

    await unregisterPushToken();

    expect(axiosInstance.delete).toHaveBeenCalledWith("/api/app/salvar-token");
  });

  it("NÃO lança erro quando DELETE falha (não bloqueia logout)", async () => {
    axiosInstance.delete.mockRejectedValueOnce({
      response: { status: 500 },
      message: "boom",
    });

    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});
