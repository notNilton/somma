// =========================================================================
// Testes para componentes base: Button, Input, EmptyState, LoadingDots,
// StyledText, OrdersCard, AvailableWithdrawalCard, BottomSheet
// Usando react-test-renderer (padrão remaining-components)
// =========================================================================

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons", MaterialIcons: "MaterialIcons" }));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/home",
  useLocalSearchParams: () => ({}),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

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
    user: { id: 1, name: "Test User", email: "test@pagah.com", document: null, profile_photo_url: null, telefone: null, cpf: null, instagram: null },
    isLoading: false,
    login: jest.fn(),
    demoLogin: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock("react-native-pager-view", () => "PagerView");
jest.mock("expo-font", () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: () => true,
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

import { CustomButton } from "@/components/Button";
import { CustomInput } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { LoadingDots } from "@/components/LoadingDots";
import { OrdersCard } from "@/components/OrdersCard";
import { AvailableWithdrawalCard } from "@/components/AvailableWithdrawalCard";
import { BottomSheet } from "@/components/BottomSheet";
import { MonoText } from "@/components/StyledText";

function findText(root: renderer.ReactTestInstance, text: string): renderer.ReactTestInstance[] {
  return root.findAll(
    (node: renderer.ReactTestInstance) =>
      (node.children?.some?.((c: unknown) => String(c).includes(text)) ?? false),
  );
}
function hasText(root: renderer.ReactTestInstance, text: string): boolean {
  return findText(root, text).length > 0;
}

function findWithProp(root: renderer.ReactTestInstance, propName: string, value?: any): renderer.ReactTestInstance[] {
  return root.findAll((node: renderer.ReactTestInstance) => {
    const props = node.props || {};
    return value === undefined ? propName in props : props[propName] === value;
  });
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

// =========================================================================
// CustomButton
// =========================================================================
describe("CustomButton", () => {
  function renderButton(label: string, opts: any = {}) {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CustomButton label={label} onPress={opts.onPress || jest.fn()} type={opts.type} loading={opts.loading} backgroundColor={opts.bg} labelColor={opts.labelColor} />
      );
    });
    return tree!;
  }

  it("renderiza com label", () => {
    const tree = renderButton("Entrar");
    expect(hasText(tree.root, "Entrar")).toBe(true);
  });

  it("chama onPress ao pressionar", () => {
    const onPress = jest.fn();
    const tree = renderButton("Submit", { onPress });
    const btn = findWithProp(tree.root, "onPress")[0];
    act(() => { btn.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("mostra LoadingDots quando loading=true", () => {
    const tree = renderButton("Loading", { loading: true });
    expect(hasText(tree.root, "Loading")).toBe(false);
  });

  it("renderiza com tipo secondary", () => {
    const tree = renderButton("Cancelar", { type: "secondary" });
    expect(hasText(tree.root, "Cancelar")).toBe(true);
  });

  it("renderiza com tipo string", () => {
    const tree = renderButton("Link", { type: "string" });
    expect(hasText(tree.root, "Link")).toBe(true);
  });

  it("aceita custom backgroundColor e labelColor", () => {
    const tree = renderButton("Custom", { bg: "#ff0000", labelColor: "#ffffff" });
    expect(hasText(tree.root, "Custom")).toBe(true);
  });
});

// =========================================================================
// CustomInput
// =========================================================================
describe("CustomInput", () => {
  function renderInput(placeholder: string, opts: any = {}) {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <CustomInput placeholder={placeholder} value={opts.value || ""} onChangeText={opts.onChangeText || jest.fn()} errorMessage={opts.error} loading={opts.loading} />
      );
    });
    return tree!;
  }

  it("exibe mensagem de erro", () => {
    const tree = renderInput("Email", { error: "Campo obrigatório" });
    expect(hasText(tree.root, "Campo obrigatório")).toBe(true);
  });

  it("chama onChangeText ao digitar", () => {
    const onChangeText = jest.fn();
    const tree = renderInput("", { onChangeText });
    const input = findWithProp(tree.root, "onChangeText")[0];
    act(() => { input.props.onChangeText("novo texto"); });
    expect(onChangeText).toHaveBeenCalledWith("novo texto");
  });

  it("mostra componente quando loading=true", () => {
    const tree = renderInput("Loading", { loading: true });
    expect(tree.toJSON()).not.toBeNull();
  });
});

// =========================================================================
// EmptyState
// =========================================================================
describe("EmptyState", () => {
  it("renderiza título e descrição padrão", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<EmptyState />); });
    expect(hasText(tree!.root, "Não encontrado")).toBe(true);
    expect(hasText(tree!.root, "Nenhum dado encontrado")).toBe(true);
  });

  it("renderiza título e descrição customizados", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<EmptyState title="Vazio" description="Nada por aqui" />); });
    expect(hasText(tree!.root, "Vazio")).toBe(true);
    expect(hasText(tree!.root, "Nada por aqui")).toBe(true);
  });

  it("renderiza botão 'Retornar ao Início'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<EmptyState />); });
    expect(hasText(tree!.root, "Retornar ao Início")).toBe(true);
  });
});

// =========================================================================
// LoadingDots
// =========================================================================
describe("LoadingDots", () => {
  it("renderiza com cor padrão", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<LoadingDots />); });
    expect(tree!.toJSON()).not.toBeNull();
  });

  it("aceita cor customizada", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<LoadingDots color="#FACC15" />); });
    expect(tree!.toJSON()).not.toBeNull();
  });
});

// =========================================================================
// MonoText
// =========================================================================
describe("MonoText", () => {
  it("renderiza texto", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<MonoText>Hello</MonoText>); });
    expect(hasText(tree!.root, "Hello")).toBe(true);
  });
});

// =========================================================================
// OrdersCard
// =========================================================================
describe("OrdersCard", () => {
  it("renderiza label 'Pedidos'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<OrdersCard />); });
    expect(hasText(tree!.root, "Pedidos")).toBe(true);
  });

  it("renderiza valor '3'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<OrdersCard />); });
    expect(hasText(tree!.root, "3")).toBe(true);
  });
});

// =========================================================================
// AvailableWithdrawalCard
// =========================================================================
describe("AvailableWithdrawalCard", () => {
  it("renderiza label 'Disponível'", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={50000} loading={false} />); });
    expect(hasText(tree!.root, "Disponível")).toBe(true);
  });

  it("formata valor em BRL", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={48750} loading={false} />); });      expect(hasText(tree!.root, "487,50")).toBe(true);
  });

  it("mostra R$ 0,00 quando value é null", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AvailableWithdrawalCard value={null} loading={false} />); });      expect(hasText(tree!.root, "0,00")).toBe(true);
  });
});

// =========================================================================
// BottomSheet
// =========================================================================
describe("BottomSheet", () => {
  it("renderiza children quando visível", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BottomSheet visible={true} title="Título" onClose={jest.fn()}>
          <></>
        </BottomSheet>
      );
    });
    expect(hasText(tree!.root, "Título")).toBe(true);
  });

  it("não renderiza quando visible=false", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <BottomSheet visible={false} title="Título" onClose={jest.fn()}>
          <></>
        </BottomSheet>
      );
    });
    expect(tree!.toJSON()).toBeNull();
  });
});
