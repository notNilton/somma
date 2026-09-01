// =========================================================================
// Testes para: GeneralDataCard, AvatarImage, AvatarCropModal, DateInput, SplashScreen
// Usando react-test-renderer c/ mock customizado de react-native (padrão SaleBanner.test.tsx)
// =========================================================================

jest.mock("react-native", () => {
  const ReactLocal = require("react");

  return {
    Animated: {
      Value: class {
        _value: number;
        constructor(value: number) { this._value = value; }
        setValue(v: number) { this._value = v; }
        interpolate() { return 100; }
      },
      spring: () => ({ start: (cb?: () => void) => { if (cb) cb(); } }),
      timing: () => ({ start: (cb?: () => void) => { if (cb) cb(); } }),
      parallel: (animations: Array<{ start: (cb?: () => void) => void }>) => ({
        start: (callback?: () => void) => {
          animations.forEach((a) => a.start());
          if (callback) callback();
        },
      }),
      loop: () => ({ start: () => {}, stop: () => {} }),
      delay: (ms: number) => ({ start: (cb?: () => void) => { if (cb) cb(); }, stop: () => {} }),
      sequence: (...anims: any[]) => ({
        start: (cb?: () => void) => {
          anims.forEach(a => { if (a.start) a.start(); });
          if (cb) cb();
        },
        stop: () => {},
      }),
      View: ({ children, style, ...rest }: Record<string, unknown>) =>
        ReactLocal.createElement("Animated.View", { ...rest, style }, children),
      Text: ({ children, style, ...rest }: Record<string, unknown>) =>
        ReactLocal.createElement("Animated.Text", { ...rest, style }, children),
      Image: ({ source, style, ...rest }: Record<string, unknown>) =>
        ReactLocal.createElement("Animated.Image", { ...rest, source, style }, null),
    },
    Dimensions: { get: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 2 })) },
    Easing: {
      linear: (t: number) => t,
      in: (fn: Function) => fn,
      out: (fn: Function) => fn,
      inOut: (fn: Function) => fn,
      cubic: (t: number) => t * t * t,
    },
    Modal: ({ children, visible, onShow, animationType, onRequestClose, transparent, statusBarTranslucent }: Record<string, unknown>) =>
      visible ? ReactLocal.createElement("Modal", { visible: "true", onRequestClose, transparent }, children) : null,
    Pressable: ({ children, onPress, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("Pressable", { onClick: onPress, ...rest }, children),
    ScrollView: ({ children, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("ScrollView", rest, children),
    StyleSheet: {
      create: (styles: Record<string, object>) => styles,
      absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    },
    Text: ({ children, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("Text", rest, children),
    TextInput: ({ onChangeText, value, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("TextInput", { onChangeText, value: value ?? "", ...rest }),
    TouchableOpacity: ({ children, onPress, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("TouchableOpacity", { onClick: onPress, ...rest }, children),
    View: ({ children, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("View", rest, children),
    Image: ({ source, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("Image", rest),
    Alert: { alert: jest.fn() },
    Platform: { OS: "ios", select: (obj: any) => obj.ios },
    Keyboard: { dismiss: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
    PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    useColorScheme: () => "dark",
  };
});

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/home",
  useLocalSearchParams: () => ({}),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/assets/icons/eye.svg", () => ({ default: () => null }));
jest.mock("@/assets/icons/eyeoff.svg", () => ({ default: () => null }));
jest.mock("@/assets/icons/close.svg", () => ({ default: () => null }));
jest.mock("@/assets/icons/menu.svg", () => ({ default: () => null }));
jest.mock("@/assets/icons/home.svg", () => ({ default: () => null }));
jest.mock("@/assets/images/pagah-logo.png", () => "pagah-logo.png");
jest.mock("@/assets/images/pagah-logo2.png", () => "pagah-logo2.png");
jest.mock("@/assets/images/avatar.png", () => "avatar.png");
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "svg",
  Svg: "svg", Circle: "circle", Rect: "rect",
  Defs: "defs", Mask: "mask",
  LinearGradient: "linearGradient", Stop: "stop",
}));
jest.mock("react-native-chart-kit", () => ({ LineChart: () => null }));
jest.mock("react-native-calendars", () => ({
  Calendar: () => "mock-calendar",
  LocaleConfig: { locales: {} as Record<string, any>, defaultLocale: "" },
}));
jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { id: 1, name: "Test User", email: "test@pagah.com", document: null, profile_photo_url: null, telefone: null, cpf: null, instagram: null },
    isLoading: false, login: jest.fn(), demoLogin: jest.fn(), logout: jest.fn(),
  }),
}));
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock("expo-font", () => ({ loadAsync: jest.fn(() => Promise.resolve()), isLoaded: () => true }));

import React from "react";
import renderer, { act } from "react-test-renderer";

import { GeneralDataCard } from "@/components/GeneralDataCard";
import { AvatarImage } from "@/components/AvatarImage";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { DateInput } from "@/components/DateInput";
import AppSplashScreen from "@/components/SplashScreen";
import type { GeneralData } from "@/types/home";

/** Helper: find nodes containing a specific string */
function findText(root: renderer.ReactTestInstance, text: string): renderer.ReactTestInstance[] {
  return root.findAll(
    (node: renderer.ReactTestInstance) =>
      (node.children?.some?.((c: unknown) => String(c).includes(text)) ?? false),
  );
}
function hasText(root: renderer.ReactTestInstance, text: string): boolean {
  return findText(root, text).length > 0;
}

const mockGeneralData: GeneralData = {
  total_revenue: 1254890, total_orders: 342, average_ticket: 3669, commission: 125489,
  payment_methods: { cartao: 65, pix: 28, boleto: 7 },
  chart: [
    { date: "2025-05-01", revenue: 98000 }, { date: "2025-05-02", revenue: 142000 },
    { date: "2025-05-03", revenue: 87500 }, { date: "2025-05-04", revenue: 210000 },
    { date: "2025-05-05", revenue: 175000 }, { date: "2025-05-06", revenue: 230000 },
    { date: "2025-05-07", revenue: 312390 },
  ],
  revenue_sem_juros: 987650, orders_sem_juros: 267, interest_revenue: 267240,
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// =========================================================================
// GeneralDataCard
// =========================================================================
describe("GeneralDataCard", () => {
  function renderCard(data: GeneralData | null, loading = false) {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GeneralDataCard data={data} loading={loading} periodLabel="Hoje" onPeriodChange={jest.fn()} />);
    });
    return tree!;
  }

  it("renderiza saudação com nome do usuário", () => {
    const tree = renderCard(mockGeneralData);
    expect(hasText(tree.root, "Olá")).toBe(true);
    expect(hasText(tree.root, "Test User")).toBe(true);
  });

  it("renderiza 'Vendas gerais'", () => {
    const tree = renderCard(mockGeneralData);
    expect(hasText(tree.root, "Vendas gerais")).toBe(true);
  });

  it("renderiza período 'Hoje ▾'", () => {
    const tree = renderCard(mockGeneralData);
    expect(hasText(tree.root, "Hoje")).toBe(true);
  });

  it("renderiza Pedidos, Ticket médio e Comissão", () => {
    const tree = renderCard(mockGeneralData);
    expect(hasText(tree.root, "Pedidos")).toBe(true);
    expect(hasText(tree.root, "Ticket médio")).toBe(true);
    expect(hasText(tree.root, "Comissão")).toBe(true);
  });

  it("renderiza formas de pagamento", () => {
    const tree = renderCard(mockGeneralData);
    expect(hasText(tree.root, "Formas de pagamento")).toBe(true);
    expect(hasText(tree.root, "Cartão")).toBe(true);
    expect(hasText(tree.root, "Pix")).toBe(true);
    expect(hasText(tree.root, "Boleto")).toBe(true);
  });

  it("renderiza sem erro com data nula", () => {
    const tree = renderCard(null);
    expect(tree.toJSON()).not.toBeNull();
  });

  it("renderiza sem erro quando loading=true", () => {
    // LoadingDots usa Animated.loop que pode causar AggregateError no mock;
    // testamos apenas que o componente não crasha no render
    expect(() => {
      renderCard(mockGeneralData, true);
    }).not.toThrow();
  });
});

// =========================================================================
// AvatarImage
// =========================================================================
describe("AvatarImage", () => {
  it("renderiza com tamanho padrão (80)", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvatarImage />); });
    expect(tree!.toJSON()).not.toBeNull();
  });

  it("aceita tamanho customizado (120)", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvatarImage size={120} />); });
    expect(tree!.toJSON()).not.toBeNull();
  });
});

// =========================================================================
// AvatarCropModal
// =========================================================================
describe("AvatarCropModal", () => {
  it("renderiza botões Cancelar e Confirmar quando visível", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AvatarCropModal visible={true} imageUri="https://example.com/photo.jpg"
          onConfirm={jest.fn()} onCancel={jest.fn()} />
      );
    });
    expect(hasText(tree!.root, "Cancelar")).toBe(true);
    expect(hasText(tree!.root, "Confirmar")).toBe(true);
  });

  it("renderiza texto de dica", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AvatarCropModal visible={true} imageUri="https://example.com/photo.jpg"
          onConfirm={jest.fn()} onCancel={jest.fn()} />
      );
    });
    expect(hasText(tree!.root, "Mova e use dois dedos para dar zoom")).toBe(true);
  });

  it("não renderiza quando visible=false", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AvatarCropModal visible={false} imageUri="https://example.com/photo.jpg"
          onConfirm={jest.fn()} onCancel={jest.fn()} />
      );
    });
    // Modal mock returns null when visible=false
    expect(tree!.toJSON()).toBeNull();
  });
});

// =========================================================================
// DateInput
// =========================================================================
describe("DateInput", () => {
  it("renderiza com placeholder", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<DateInput placeholder="Data inicial" value="" onChangeText={jest.fn()} />); });
    expect(hasText(tree!.root, "Data inicial")).toBe(true);
  });

  it("exibe mensagem de erro", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<DateInput placeholder="Data" value="" onChangeText={jest.fn()} errorMessage="Campo obrigatório" />); });
    expect(hasText(tree!.root, "Campo obrigatório")).toBe(true);
  });
});

// =========================================================================
// SplashScreen
// =========================================================================
describe("AppSplashScreen", () => {
  it("renderiza sem erro", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AppSplashScreen />); });
    expect(tree!.toJSON()).not.toBeNull();
  });
});
