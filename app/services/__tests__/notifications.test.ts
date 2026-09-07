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

jest.mock("expo-notifications", () => {
  const mock = jest.requireActual(
    "./__mocks__/expo-notifications",
  ) as typeof import("./__mocks__/expo-notifications");
  return mock;
});

jest.mock("expo-device", () => ({
  isDevice: true,
  __esModule: true,
}));

import {
  scheduleNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications";

const __mockNotifications =
  jest.requireActual("./__mocks__/expo-notifications") as any;
const __setPermissionStatus = __mockNotifications.__setPermissionStatus;
const __getScheduledNotifications =
  __mockNotifications.__getScheduledNotifications;
const __resetScheduledNotifications =
  __mockNotifications.__resetScheduledNotifications;

import { notifyNewSale } from "@/services/notifications";

beforeEach(() => {
  jest.clearAllMocks();
  __resetScheduledNotifications();
  __setPermissionStatus("granted");
});

// ──────────────────────────────────────────────
// notifyNewSale — permissão concedida
// ──────────────────────────────────────────────

describe("notifyNewSale — permissão concedida", () => {
  it("dispara notificação local quando permissão está concedida (sem payload)", async () => {
    const result = await notifyNewSale();

    expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "💰 Nova venda",
          body: "Nova venda registrada!",
          data: { screen: "/home" },
          sound: true,
        }),
        trigger: null,
      }),
    );
  });

  it("inclui valor formatado no body", async () => {
    await notifyNewSale({ amount: 4990 });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining("Valor: R$"),
        }),
      }),
    );
  });

  it("inclui nome do cliente no body", async () => {
    await notifyNewSale({ customerName: "João Silva" });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining("Cliente: João Silva"),
        }),
      }),
    );
  });

  it("inclui canal no body", async () => {
    await notifyNewSale({ channel: "Instagram" });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining("Canal: Instagram"),
        }),
      }),
    );
  });

  it("inclui forma de pagamento no body", async () => {
    await notifyNewSale({ paymentMethod: "Cartão de crédito" });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining("Pagamento: Cartão de crédito"),
        }),
      }),
    );
  });

  it("inclui ID do pedido no body", async () => {
    await notifyNewSale({ orderId: "12345" });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining("Pedido: #12345"),
        }),
      }),
    );
  });
});

// ──────────────────────────────────────────────
// notifyNewSale — todos os campos
// ──────────────────────────────────────────────

describe("notifyNewSale — todos os detalhes", () => {
  it("monta notificação com todos os campos preenchidos", async () => {
    await notifyNewSale({
      amount: 9790,
      customerName: "Maria Oliveira",
      channel: "Site",
      paymentMethod: "Pix",
      orderId: "98765",
    });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "💰 Nova venda",
          body:
            "Valor: R$ 97,90\n" +
            "Cliente: Maria Oliveira\n" +
            "Canal: Site\n" +
            "Pagamento: Pix\n" +
            "Pedido: #98765",
          data: { screen: "/home" },
          sound: true,
        }),
        trigger: null,
      }),
    );
  });

  it("retorna true e agenda exatamente 1 notificação", async () => {
    const result = await notifyNewSale({
      amount: 10000,
      customerName: "Teste",
    });

    expect(result).toBe(true);
    expect(__getScheduledNotifications()).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// notifyNewSale — permissão negada
// ──────────────────────────────────────────────

describe("notifyNewSale — permissão negada", () => {
  it("NÃO dispara notificação quando permissão é negada", async () => {
    __setPermissionStatus("denied");

    const result = await notifyNewSale();

    expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("dispara notificação quando requestPermissionsAsync concede permissão", async () => {
    __setPermissionStatus("denied");

    (requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: "granted",
    });

    const result = await notifyNewSale();

    expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("retorna false e não agenda notificação quando permissão é negada", async () => {
    __setPermissionStatus("denied");

    const result = await notifyNewSale({
      amount: 5000,
      channel: "Google",
      customerName: "João",
      paymentMethod: "Boleto",
      orderId: "555",
    });

    expect(result).toBe(false);
    expect(__getScheduledNotifications()).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// notifyNewSale — integração
// ──────────────────────────────────────────────

describe("notifyNewSale — integração", () => {
  it("usa data.screen = /home para navegação ao tocar na notificação", async () => {
    await notifyNewSale({ amount: 5000 });

    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { screen: "/home" },
        }),
      }),
    );
  });

  it("não quebra quando chamado sem payload ou com payload vazio", async () => {
    await expect(notifyNewSale()).resolves.toBe(true);
    await expect(notifyNewSale(undefined)).resolves.toBe(true);
    await expect(notifyNewSale({})).resolves.toBe(true);
  });
});
