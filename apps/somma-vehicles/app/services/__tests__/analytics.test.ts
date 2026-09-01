import { analyticsService } from "@/services/analytics";
import { disableDemoMode, enableDemoMode } from "@/services/demo";

const mockLogLogin = jest.fn().mockResolvedValue(undefined);
const mockLogEvent = jest.fn().mockResolvedValue(undefined);
const mockLogScreenView = jest.fn().mockResolvedValue(undefined);
const mockSetCollectionEnabled = jest.fn().mockResolvedValue(undefined);

jest.mock("@react-native-firebase/analytics", () => ({
  __esModule: true,
  default: () => ({
    logLogin: mockLogLogin,
    logEvent: mockLogEvent,
    logScreenView: mockLogScreenView,
    setAnalyticsCollectionEnabled: mockSetCollectionEnabled,
  }),
}));

describe("analyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    disableDemoMode();
  });

  it("loga login com sucesso usando o evento reservado do GA4", async () => {
    await analyticsService.logLoginSuccess();
    expect(mockLogLogin).toHaveBeenCalledWith({ method: "email" });
  });

  it("loga falha de login como evento customizado", async () => {
    await analyticsService.logLoginFailure();
    expect(mockLogEvent).toHaveBeenCalledWith("login_failed", {
      method: "email",
      reason: "invalid_credentials",
    });
  });

  it("loga screen_view com nome e classe da tela", async () => {
    await analyticsService.logScreenView("Carteira");
    expect(mockLogScreenView).toHaveBeenCalledWith({
      screen_name: "Carteira",
      screen_class: "Carteira",
    });
  });

  it("NÃO envia nenhum evento em modo demo", async () => {
    enableDemoMode();
    await analyticsService.logLoginSuccess();
    await analyticsService.logLoginFailure();
    await analyticsService.logScreenView("Carteira");
    expect(mockLogLogin).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(mockLogScreenView).not.toHaveBeenCalled();
  });

  it("liga e desliga a coleta de dados", async () => {
    await analyticsService.setCollectionEnabled(false);
    expect(mockSetCollectionEnabled).toHaveBeenCalledWith(false);
  });
});
