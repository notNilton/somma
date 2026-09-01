// =========================================================================
// Testes de Integração — Fluxos completos
// Usando react-test-renderer (padrão remaining-components)
// =========================================================================

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/home",
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("@/assets/icons/eye.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/eyeoff.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/empty-box.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/close.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/menu.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/home.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/metrics.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/bell.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/profile.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/anticipate.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/exit.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/history.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/withdrawal.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/world.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/phone.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/cash.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/cursor.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/person.svg", () => ({ __esModule: true, default: () => null }));

jest.mock("@/assets/images/pagah-logo2.png", () => "pagah-logo2.png");
jest.mock("@/assets/images/avatar.png", () => "avatar.png");
jest.mock("@/assets/images/pagah-logo.png", () => "pagah-logo.png");
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
    user: { id: 1, name: "Test User", email: "test@pagah.com" },
    isLoading: false,
    login: jest.fn(),
    demoLogin: jest.fn(),
    logout: jest.fn(),
  }),
}));

const __mockAxios = { instance: null as any };
jest.mock("axios", () => {
  const instance = {
    defaults: { baseURL: "" },
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  __mockAxios.instance = instance;
  return { create: jest.fn(() => instance) };
});

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
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import { CustomButton } from "@/components/Button";
import { CustomInput } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { AvailableWithdrawalCard } from "@/components/AvailableWithdrawalCard";
import { HeaderNav } from "@/components/HeaderNav";
import { BottomNav } from "@/components/BottomNav";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { Table } from "@/components/Table";
import { DropdownInput } from "@/components/DropdownInput";
import type { SalesChannel } from "@/types/home";

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

// =========================================================================
// Fluxo 1: Navegação
// =========================================================================
describe("Fluxo: Navegação", () => {
  it("Header + BottomNav compatíveis", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <>
          <HeaderNav />
          <BottomNav />
        </>
      );
    });
    expect(hasText(tree!.root, "Home")).toBe(true);
    expect(hasText(tree!.root, "Relatórios")).toBe(true);
  });
});

// =========================================================================
// Fluxo 2: Valores monetários
// =========================================================================
describe("Fluxo: Valores monetários", () => {
  it("AvailableWithdrawalCard formata centavos em reais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={48750} loading={false} />); });
    expect(hasText(tree!.root, "487,50")).toBe(true);
  });

  it("AvailableWithdrawalCard mostra 0 quando null", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={null} loading={false} />); });
    expect(hasText(tree!.root, "0,00")).toBe(true);
  });
});

// =========================================================================
// Fluxo 3: Loading states
// =========================================================================
describe("Fluxo: Loading states", () => {
  it("AvailableWithdrawalCard mostra loading", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={50000} loading={true} />); });
    expect(hasText(tree!.root, "500,00")).toBe(false);
  });

  it("CustomButton mostra loading state", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<CustomButton label="Entrar" onPress={jest.fn()} loading={true} />); });
    expect(hasText(tree!.root, "Entrar")).toBe(false);
  });
});

// =========================================================================
// Fluxo 4: Form input
// =========================================================================
describe("Fluxo: Form input", () => {
  it("CustomInput aceita texto", () => {
    const onChangeText = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<CustomInput placeholder="" value="" onChangeText={onChangeText} />);
    });
    const inputs = tree!.root.findAll((n) => n.props?.onChangeText);
    act(() => { inputs[0]?.props.onChangeText("test@email.com"); });
    expect(onChangeText).toHaveBeenCalledWith("test@email.com");
  });

  it("CustomInput mostra erro", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<CustomInput placeholder="Email" value="" onChangeText={jest.fn()} errorMessage="Email inválido" />);
    });
    expect(hasText(tree!.root, "Email inválido")).toBe(true);
  });

  it("CustomButton chama onPress", () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<CustomButton label="Login" onPress={onPress} />); });
    const btn = tree!.root.findAll((n) => n.props?.onPress)[0];
    act(() => { btn?.props.onPress(); });
    expect(onPress).toHaveBeenCalled();
  });
});

// =========================================================================
// Fluxo 5: EmptyState
// =========================================================================
describe("Fluxo: EmptyState", () => {
  it("EmptyState renderiza com dados customizados", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EmptyState title="Sem vendas" description="Nenhuma venda registrada hoje" />);
    });
    expect(hasText(tree!.root, "Sem vendas")).toBe(true);
    expect(hasText(tree!.root, "Nenhuma venda registrada hoje")).toBe(true);
  });
});

// =========================================================================
// Fluxo 6: Canais de venda
// =========================================================================
describe("Fluxo: Canais de venda", () => {
  const channels: SalesChannel[] = [
    { key: "site", label: "Site", orders: 145, revenue: 532100, percentage: 42 },
    { key: "callcenter", label: "Callcenter", orders: 68, revenue: 231200, percentage: 18 },
    { key: "orderbump", label: "Order Bump", orders: 52, revenue: 180000, percentage: 14 },
    { key: "upsell", label: "Upsell", orders: 36, revenue: 131790, percentage: 11 },
  ];

  it("renderiza canais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={channels} loading={false} />); });
    expect(hasText(tree!.root, "Site")).toBe(true);
  });

  it("não mostra 'Ver mais' com <= 3 canais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<PaymentMethodsCard channels={channels.slice(0, 2)} loading={false} />); });
    expect(hasText(tree!.root, "Ver mais")).toBe(false);
  });
});

// =========================================================================
// Fluxo 7: Table
// =========================================================================
describe("Table", () => {
  const data = [
    { id: "1", name: "Item 1", value: "100" },
    { id: "2", name: "Item 2", value: "200" },
  ];

  it("renderiza headers e linhas", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Coluna</Text>}
          data={data}
          renderRow={(item) => <Text>{item.name}</Text>}
          keyExtractor={(item) => item.id}
        />
      );
    });
    expect(hasText(tree!.root, "Coluna")).toBe(true);
    expect(hasText(tree!.root, "Item 1")).toBe(true);
    expect(hasText(tree!.root, "Item 2")).toBe(true);
  });
});

// =========================================================================
// Fluxo 8: DropdownInput
// =========================================================================
describe("DropdownInput", () => {
  const options = ["Opção 1", "Opção 2"];

  it("renderiza e abre ao pressionar", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Selecione" value="" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = tree!.root.findAll((n) => n.props?.onPress);
    act(() => { btns[0]?.props.onPress(); });
    expect(hasText(tree!.root, "Opção 1")).toBe(true);
    expect(hasText(tree!.root, "Opção 2")).toBe(true);
  });

  it("seleciona opção", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Selecione" value="" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = tree!.root.findAll((n) => n.props?.onPress);
    act(() => { btns[0]?.props.onPress(); });
    const allBtns = tree!.root.findAll((n) => n.props?.onPress);
    act(() => { allBtns[allBtns.length - 1]?.props.onPress(); });
    expect(onValueChange).toHaveBeenCalledWith("Opção 2");
  });
});
