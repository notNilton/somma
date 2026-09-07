// =========================================================================
// Testes dos services: home, metrics, wallet, releases, notifications_list
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
  return { create: jest.fn(() => instance) };
});

let mockIsDemoMode = false;

jest.mock("@/services/demo", () => {
  const DEMO_HOME = {
    general: { total_revenue: 1254890, total_orders: 342, average_ticket: 3669, commission: 125489, payment_methods: { cartao: 65, pix: 28, boleto: 7 }, chart: [] },
    available_withdrawal: 48750,
    sales_channels: [],
    last_accesses: { site: { last_5min: 12, last_30min: 47 }, checkout: { last_5min: 3, last_30min: 11 } },
  };
  const DEMO_METRICS = { period: { from: "2025-01-01", to: "2025-12-31" }, total_sales: 342, total_revenue: 1254890, data: [] };
  const DEMO_BALANCE = { available_for_withdrawal: 48750, available_to_anticipate: 125000, non_anticipatable: 8900, under_review: 15000, chargebacks: { count: 1, total_amount: 4990 } };
  const DEMO_HISTORY = [{ id: "1", type: "withdraw", value: 25000, date: "05/05/2025", time: "14:32", status: "paid" }];
  const DEMO_NOTIFICATIONS = [{ id: "1", type: "cash", message: "Test notification" }];

  return {
    __esModule: true,
    get isDemoMode() {
      return mockIsDemoMode;
    },
    DEMO_HOME,
    DEMO_METRICS,
    DEMO_BALANCE,
    DEMO_HISTORY,
    DEMO_NOTIFICATIONS,
    enableDemoMode: jest.fn(),
    disableDemoMode: jest.fn(),
  };
});

import { homeService } from "@/services/home";
import { metricsService } from "@/services/metrics";
import { walletService } from "@/services/wallet";
import { notificationsService } from "@/services/notifications_list";
import { releasesService } from "@/services/releases";

function getAxios() {
  return __mockAxios.instance;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDemoMode = false;
});

// =========================================================================
// homeService
// =========================================================================
describe("homeService.getHome", () => {
  it("chama GET /api/app/home com os filtros corretos", async () => {
    const mockHomeData = {
      general: { total_revenue: 1000, total_orders: 10, average_ticket: 100, commission: 100, payment_methods: { cartao: 50, pix: 40, boleto: 10 }, chart: [] },
      available_withdrawal: 5000,
      sales_channels: [],
      last_accesses: { site: { last_5min: 0, last_30min: 0 }, checkout: { last_5min: 0, last_30min: 0 } },
    };
    getAxios().get.mockResolvedValueOnce({ data: mockHomeData });

    const result = await homeService.getHome({ dt_inicial: "2025-01-01", dt_final: "2025-01-31" });

    expect(getAxios().get).toHaveBeenCalledWith("/api/app/home", {
      params: { dt_inicial: "2025-01-01", dt_final: "2025-01-31" },
    });
    expect(result).toEqual(mockHomeData);
  });

  it("chama GET /api/app/home sem filtros quando não informados", async () => {
    getAxios().get.mockResolvedValueOnce({ data: {} });
    await homeService.getHome();
    expect(getAxios().get).toHaveBeenCalledWith("/api/app/home", { params: undefined });
  });

  it("retorna DEMO_HOME quando isDemoMode=true", async () => {
    mockIsDemoMode = true;
    const result = await homeService.getHome();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(result).toHaveProperty("general");
    expect(result).toHaveProperty("available_withdrawal");
    expect(result).toHaveProperty("sales_channels");
  });

  it("propaga erro da API", async () => {
    getAxios().get.mockRejectedValueOnce(new Error("Network error"));
    await expect(homeService.getHome()).rejects.toThrow("Network error");
  });
});

// =========================================================================
// metricsService
// =========================================================================
describe("metricsService.getUtmReport", () => {
  it("chama GET /api/app/utm com group_by=utm_source", async () => {
    getAxios().get.mockResolvedValueOnce({ data: { data: [] } });

    await metricsService.getUtmReport({ dt_inicial: "2025-01-01", dt_final: "2025-01-31" });

    expect(getAxios().get).toHaveBeenCalledWith("/api/app/utm", {
      params: { group_by: "utm_source", dt_inicial: "2025-01-01", dt_final: "2025-01-31" },
    });
  });

  it("chama sem filtros quando nada é informado", async () => {
    getAxios().get.mockResolvedValueOnce({ data: { data: [] } });
    await metricsService.getUtmReport();
    expect(getAxios().get).toHaveBeenCalledWith("/api/app/utm", { params: { group_by: "utm_source" } });
  });

  it("retorna DEMO_METRICS quando isDemoMode=true", async () => {
    mockIsDemoMode = true;
    const result = await metricsService.getUtmReport();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(result).toHaveProperty("total_sales");
    expect(result).toHaveProperty("data");
  });

  it("propaga erro da API", async () => {
    getAxios().get.mockRejectedValueOnce(new Error("Server error"));
    await expect(metricsService.getUtmReport()).rejects.toThrow("Server error");
  });
});

// =========================================================================
// walletService
// =========================================================================
describe("walletService.getBalance", () => {
  it("chama GET /api/app/saldo", async () => {
    const balance = { available_for_withdrawal: 5000, available_to_anticipate: 10000, non_anticipatable: 0, under_review: 0, chargebacks: { count: 0, total_amount: 0 } };
    getAxios().get.mockResolvedValueOnce({ data: balance });

    const result = await walletService.getBalance();
    expect(getAxios().get).toHaveBeenCalledWith("/api/app/saldo");
    expect(result).toEqual(balance);
  });

  it("retorna DEMO_BALANCE quando isDemoMode=true", async () => {
    mockIsDemoMode = true;
    const result = await walletService.getBalance();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(result).toHaveProperty("available_for_withdrawal");
    expect(result).toHaveProperty("chargebacks");
  });
});

describe("walletService.getHistory", () => {
  it("chama GET /api/app/saques e extrai data.data", async () => {
    const transactions = [{ id: "1", type: "withdraw", value: 100, date: "2025-01-01", time: "10:00", status: "paid" }];
    getAxios().get.mockResolvedValueOnce({ data: { data: transactions } });

    const result = await walletService.getHistory();
    expect(getAxios().get).toHaveBeenCalledWith("/api/app/saques");
    expect(result).toEqual(transactions);
  });

  it("retorna DEMO_HISTORY quando isDemoMode=true", async () => {
    mockIsDemoMode = true;
    const result = await walletService.getHistory();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("propaga erro da API", async () => {
    getAxios().get.mockRejectedValueOnce(new Error("Not found"));
    await expect(walletService.getHistory()).rejects.toThrow("Not found");
  });
});

describe("walletService.withdraw", () => {
  it("chama POST /wallet/withdraw", async () => {
    getAxios().post.mockResolvedValueOnce({});
    await walletService.withdraw({ amount: 5000 });
    expect(getAxios().post).toHaveBeenCalledWith("/wallet/withdraw", { amount: 5000 });
  });

  it("propaga erro da API", async () => {
    getAxios().post.mockRejectedValueOnce(new Error("Insufficient funds"));
    await expect(walletService.withdraw({ amount: 999999 })).rejects.toThrow("Insufficient funds");
  });
});

describe("walletService.advance", () => {
  it("chama POST /wallet/advance", async () => {
    getAxios().post.mockResolvedValueOnce({});
    await walletService.advance({ amount: 10000 });
    expect(getAxios().post).toHaveBeenCalledWith("/wallet/advance", { amount: 10000 });
  });

  it("propaga erro da API", async () => {
    getAxios().post.mockRejectedValueOnce(new Error("Invalid amount"));
    await expect(walletService.advance({ amount: 0 })).rejects.toThrow("Invalid amount");
  });
});

// =========================================================================
// notificationsService
// =========================================================================
describe("notificationsService.getNotifications", () => {
  it("chama GET /api/app/notificacoes", async () => {
    const notifications = [{ id: "1", type: "cash", message: "Venda recebida" }];
    getAxios().get.mockResolvedValueOnce({ data: notifications });

    const result = await notificationsService.getNotifications();
    expect(getAxios().get).toHaveBeenCalledWith("/api/app/notificacoes");
    expect(result).toEqual(notifications);
  });

  it("retorna DEMO_NOTIFICATIONS quando isDemoMode=true", async () => {
    mockIsDemoMode = true;
    const result = await notificationsService.getNotifications();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });

  it("retorna array vazio quando API retorna array vazio", async () => {
    getAxios().get.mockResolvedValueOnce({ data: [] });
    const result = await notificationsService.getNotifications();
    expect(result).toEqual([]);
  });

  it("propaga erro da API", async () => {
    getAxios().get.mockRejectedValueOnce(new Error("Network error"));
    await expect(notificationsService.getNotifications()).rejects.toThrow("Network error");
  });
});

// =========================================================================
// releasesService
// =========================================================================
describe("releasesService.getReleases", () => {
  it("retorna lista de releases com os campos esperados", async () => {
    const releases = await releasesService.getReleases();
    expect(Array.isArray(releases)).toBe(true);
    expect(releases.length).toBeGreaterThan(0);
    releases.forEach((release) => {
      expect(release).toHaveProperty("version");
      expect(release).toHaveProperty("date");
      expect(release).toHaveProperty("changes");
      expect(Array.isArray(release.changes)).toBe(true);
    });
  });

  it("retorna dados estáticos (não chama API)", async () => {
    // releasesService é apenas dados estáticos, não deve chamar axios
    const releases = await releasesService.getReleases();
    expect(getAxios().get).not.toHaveBeenCalled();
    expect(releases.length).toBeGreaterThan(0);
  });

  it("releases estão ordenados da mais recente para mais antiga", async () => {
    const releases = await releasesService.getReleases();
    const dates = releases.map((r) => new Date(r.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
