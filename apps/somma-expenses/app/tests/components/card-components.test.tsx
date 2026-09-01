// =========================================================================
// Testes para componentes de cards: DailySummaryCard, AvailableWithdrawalCard, PaymentMethodsCard
// Usando react-test-renderer (padrão remaining-components)
// =========================================================================

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/assets/icons/world.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/phone.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/cash.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/cursor.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/person.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "svg",
  Svg: "svg", Circle: "circle", Rect: "rect",
  Defs: "defs", Mask: "mask",
  LinearGradient: "linearGradient", Stop: "stop",
}));
jest.mock("react-native-chart-kit", () => ({ LineChart: () => null }));
jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { id: 1, name: "Test User" },
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock("react-native", () => {
  const R = require("react");

  return {
    View: ({ children, ...rest }: any) => R.createElement("View", rest, children),
    Text: ({ children, ...rest }: any) => R.createElement("Text", rest, children),
    TextInput: ({ onChangeText, value, ...rest }: any) =>
      R.createElement("TextInput", { onChangeText, value: value ?? "", ...rest }),
    TouchableOpacity: ({ children, onPress, ...rest }: any) =>
      R.createElement("TouchableOpacity", { onPress, ...rest }, children),
    TouchableWithoutFeedback: ({ children, onPress, ...rest }: any) =>
      R.createElement("TouchableWithoutFeedback", { onPress, ...rest }, children),
    Pressable: ({ children, onPress, ...rest }: any) =>
      R.createElement("Pressable", { onPress, ...rest }, children),
    ScrollView: ({ children, ...rest }: any) => R.createElement("ScrollView", rest, children),
    Image: ({ source, ...rest }: any) => R.createElement("Image", rest),
    Modal: ({ children, visible, ...rest }: any) =>
      visible ? R.createElement("Modal", { visible: "true", ...rest }, children) : null,

    StyleSheet: {
      create: (s: any) => s,
      absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: () => 1,
      flatten: () => ({}),
    },
    Platform: { OS: "ios", select: (obj: any) => obj.ios, Version: "14.0" },
    Dimensions: { get: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 2 })) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    useColorScheme: () => "dark",

    Animated: {
      Value: class {
        _v: number;
        constructor(v: number) { this._v = v; }
        setValue(v: number) { this._v = v; }
        interpolate() { return { __getValue: () => 1 }; }
        addListener() { return { remove: () => {} }; }
        removeAllListeners() {}
      },
      timing: () => ({ start: (cb?: () => void) => { cb?.(); }, stop: () => {} }),
      spring: () => ({ start: (cb?: () => void) => { cb?.(); }, stop: () => {} }),
      loop: () => ({ start: () => {}, stop: () => {} }),
      sequence: () => ({ start: (cb?: () => void) => { cb?.(); }, stop: () => {} }),
      delay: (ms: number) => ({ start: (cb?: () => void) => { cb?.(); }, stop: () => {} }),
      parallel: (anims: any[]) => ({ start: (cb?: () => void) => { anims.forEach((a) => a.start()); cb?.(); } }),
      View: ({ children, ...rest }: any) => R.createElement("Animated.View", rest, children),
      Text: ({ children, ...rest }: any) => R.createElement("Animated.Text", rest, children),
      Image: ({ source, ...rest }: any) => R.createElement("Image", rest),
    },

    Easing: {
      linear: (t: number) => t,
      in: (fn: any) => fn,
      out: (fn: any) => fn,
      inOut: (fn: any) => fn,
      ease: (t: number) => t,
      cubic: (t: number) => t * t * t,
    },

    Keyboard: { dismiss: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })), removeListener: jest.fn() },
    PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
    Alert: { alert: jest.fn() },

    AppRegistry: { registerComponent: jest.fn(), getAppKeys: () => [] },
    findNodeHandle: jest.fn(),
    I18nManager: { isRTL: false, allowRTL: () => {}, forceRTL: () => {}, getConstants: () => ({ isRTL: false }) },
    UIManager: { dispatchViewManagerCommand: jest.fn() },
    NativeModules: {},
    NativeEventEmitter: class {
      constructor() {}
      addListener() { return { remove: () => {} }; }
      removeAllListeners() {}
    },

    RefreshControl: ({ children }: any) => children || null,
    ActivityIndicator: () => null,
    FlatList: ({ data, renderItem, ...rest }: any) => {
      if (data) return data.map((item: any, i: number) =>
        renderItem ? R.createElement(R.Fragment, { key: i }, renderItem({ item, index: i })) : null
      );
      return null;
    },
    VirtualizedList: () => null,
    requireNativeComponent: () => "View",
    processColor: (c: any) => c,
  };
});

import React from "react";
import renderer, { act } from "react-test-renderer";

import { DailySummaryCard } from "@/components/DailySummaryCard";
import { AvailableWithdrawalCard } from "@/components/AvailableWithdrawalCard";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";

import type { LastAccesses, SalesChannel } from "@/types/home";

function findText(root: renderer.ReactTestInstance, text: string): renderer.ReactTestInstance[] {
  return root.findAll(
    (node: renderer.ReactTestInstance) =>
      (node.children?.some?.((c: unknown) => String(c).includes(text)) ?? false),
  );
}
function hasText(root: renderer.ReactTestInstance, text: string): boolean {
  return findText(root, text).length > 0;
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

const mockAccesses: LastAccesses = {
  site: { last_5min: 12, last_30min: 47 },
  checkout: { last_5min: 3, last_30min: 11 },
};

const mockChannels: SalesChannel[] = [
  { key: "site", label: "Site", orders: 145, revenue: 532100, percentage: 42 },
  { key: "callcenter", label: "Callcenter", orders: 68, revenue: 231200, percentage: 18 },
  { key: "orderbump", label: "Order Bump", orders: 52, revenue: 180000, percentage: 14 },
  { key: "upsell", label: "Upsell", orders: 36, revenue: 131790, percentage: 11 },
  { key: "afiliados", label: "Afiliados", orders: 98, revenue: 359800, percentage: 0 },
];

// =========================================================================
// DailySummaryCard
// =========================================================================
describe("DailySummaryCard", () => {
  it("renderiza título 'Últimos acessos'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<DailySummaryCard data={mockAccesses} loading={false} />); });
    expect(hasText(tree!.root, "Últimos acessos")).toBe(true);
  });

  it("renderiza dados de acesso do checkout", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<DailySummaryCard data={mockAccesses} loading={false} />); });
    expect(hasText(tree!.root, "Checkout")).toBe(true);
    expect(hasText(tree!.root, "3")).toBe(true);
    expect(hasText(tree!.root, "11")).toBe(true);
  });

  it("mostra 0 quando data é null", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<DailySummaryCard data={null} loading={false} />); });
    expect(hasText(tree!.root, "0")).toBe(true);
  });
});

// =========================================================================
// AvailableWithdrawalCard
// =========================================================================
describe("AvailableWithdrawalCard", () => {
  it("formata valor em reais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={48750} loading={false} />); });      expect(hasText(tree!.root, "487,50")).toBe(true);
  });

  it("mostra R$ 0,00 quando value é null", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={null} loading={false} />); });      expect(hasText(tree!.root, "0,00")).toBe(true);
  });

  it("não mostra valor formatado quando loading=true", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={50000} loading={true} />); });
    expect(hasText(tree!.root, "500,00")).toBe(false);
  });
});

// =========================================================================
// PaymentMethodsCard
// =========================================================================
describe("PaymentMethodsCard", () => {
  it("renderiza título 'Divisão de vendas'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={mockChannels} loading={false} />); });
    expect(hasText(tree!.root, "Divisão de vendas")).toBe(true);
  });

  it("renderiza canais de venda visíveis", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={mockChannels} loading={false} />); });
    expect(hasText(tree!.root, "Site")).toBe(true);
    expect(hasText(tree!.root, "Callcenter")).toBe(true);
  });

  it("mostra botão 'Ver mais' com mais de 3 canais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={mockChannels} loading={false} />); });
    expect(hasText(tree!.root, "Ver mais")).toBe(true);
  });

  it("não mostra 'Ver mais' com 2 canais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={mockChannels.slice(0, 2)} loading={false} />); });
    expect(hasText(tree!.root, "Ver mais")).toBe(false);
  });

  it("renderiza sem erro com array vazio", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={[]} loading={false} />); });
    expect(hasText(tree!.root, "Divisão de vendas")).toBe(true);
  });

  it("canal com revenue 0 não quebra", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <PaymentMethodsCard channels={[{ key: "test", label: "Test", orders: 0, revenue: 0, percentage: 0 }]} loading={false} />
      );
    });
    expect(hasText(tree!.root, "Test")).toBe(true);
  });
});
