// =========================================================================
// Testes para o hook useScreenTracking e o helper friendlyName
// =========================================================================

let mockPathname = "/home";

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
}));

const mockLogScreenView = jest.fn();
jest.mock("@/services/analytics", () => ({
  analyticsService: {
    logScreenView: (name: string) => mockLogScreenView(name),
  },
}));

import { act, renderHook } from "@testing-library/react-native";

import { friendlyName, useScreenTracking } from "@/hooks/useScreenTracking";

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/home";
});

describe("friendlyName", () => {
  it("mapeia rotas conhecidas para nomes amigáveis", () => {
    expect(friendlyName("/wallet")).toBe("Carteira");
    expect(friendlyName("/advance-success")).toBe("Antecipação - Sucesso");
    expect(friendlyName("/metrics")).toBe("Métricas");
  });

  it("gera nome a partir do último segmento quando a rota não é mapeada", () => {
    expect(friendlyName("/algo-novo")).toBe("Algo Novo");
  });
});

describe("useScreenTracking", () => {
  it("dispara screen_view com o nome amigável ao montar", async () => {
    await renderHook(() => useScreenTracking());
    expect(mockLogScreenView).toHaveBeenCalledWith("Início");
  });

  it("dispara novamente quando o pathname muda", async () => {
    const { rerender } = await renderHook(() => useScreenTracking());
    expect(mockLogScreenView).toHaveBeenCalledTimes(1);

    mockPathname = "/wallet";
    await act(async () => {
      rerender({});
    });
    expect(mockLogScreenView).toHaveBeenCalledTimes(2);
    expect(mockLogScreenView).toHaveBeenLastCalledWith("Carteira");
  });

  it("NÃO dispara de novo se o pathname não mudou", async () => {
    const { rerender } = await renderHook(() => useScreenTracking());
    await act(async () => {
      rerender({});
    });
    await act(async () => {
      rerender({});
    });
    expect(mockLogScreenView).toHaveBeenCalledTimes(1);
  });
});
