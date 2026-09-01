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

import { salesService } from "@/services/sales";

// Flag para controlar demo mode nos testes
let mockIsDemoMode = false;

jest.mock("@/services/demo", () => ({
  get isDemoMode() {
    return mockIsDemoMode;
  },
}));

function getAxios() {
  return __mockAxios.instance;
}

const VALID_PAYLOAD = {
  customer_name: "João Silva",
  amount: 4990,
  channel: "Site",
  payment_method: "Cartão de crédito",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDemoMode = false;
});

// ──────────────────────────────────────────────
// salesService.create — API real
// ──────────────────────────────────────────────

describe("salesService.create — API real", () => {
  it("chama POST /api/app/vendas com o payload correto", async () => {
    getAxios().post.mockResolvedValueOnce({
      data: { id: "order-123" },
    });

    const result = await salesService.create(VALID_PAYLOAD);

    expect(getAxios().post).toHaveBeenCalledWith(
      "/api/app/vendas",
      VALID_PAYLOAD,
    );
    expect(result).toEqual({ id: "order-123" });
  });

  it("propaga erro quando a API falha", async () => {
    getAxios().post.mockRejectedValueOnce(new Error("Network error"));

    await expect(salesService.create(VALID_PAYLOAD)).rejects.toThrow(
      "Network error",
    );
  });

  it("converte campos corretamente: customer_name, amount, channel, payment_method", async () => {
    getAxios().post.mockResolvedValueOnce({
      data: { id: "order-456" },
    });

    await salesService.create({
      customer_name: "Maria Oliveira",
      amount: 15000,
      channel: "Instagram",
      payment_method: "Pix",
    });

    expect(getAxios().post).toHaveBeenCalledWith("/api/app/vendas", {
      customer_name: "Maria Oliveira",
      amount: 15000,
      channel: "Instagram",
      payment_method: "Pix",
    });
  });
});

// ──────────────────────────────────────────────
// salesService.create — demo mode
// ──────────────────────────────────────────────

describe("salesService.create — demo mode", () => {
  it("retorna ID mock sem chamar a API quando isDemoMode=true", async () => {
    mockIsDemoMode = true;

    const result = await salesService.create(VALID_PAYLOAD);

    expect(getAxios().post).not.toHaveBeenCalled();
    expect(result.id).toMatch(/^demo-/);
  });

  it("cada chamada em demo mode retorna ID com prefixo demo-", async () => {
    mockIsDemoMode = true;

    const r1 = await salesService.create(VALID_PAYLOAD);

    expect(r1.id).toMatch(/^demo-/);
  });
});
