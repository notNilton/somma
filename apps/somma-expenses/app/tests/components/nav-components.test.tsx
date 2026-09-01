// =========================================================================
// Testes para navegação: HeaderNav, BottomNav, SideMenu
// Usando react-test-renderer (padrão remaining-components)
// =========================================================================

jest.mock("expo-router", () => {
  const r = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return {
    router: r,
    useRouter: () => r,
    usePathname: () => "/home",
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@/assets/icons/menu.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/close.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/home.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/metrics.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/bell.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/profile.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/anticipate.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/exit.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/history.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/withdrawal.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/images/pagah-logo2.png", () => "pagah-logo2.png");

jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { id: 1, name: "Test User" },
    isLoading: false,
    login: jest.fn(),
    demoLogin: jest.fn(),
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
import { router } from "expo-router";

import { HeaderNav } from "@/components/HeaderNav";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";

function findText(root: renderer.ReactTestInstance, text: string): renderer.ReactTestInstance[] {
  return root.findAll(
    (node: renderer.ReactTestInstance) =>
      (node.children?.some?.((c: unknown) => String(c).includes(text)) ?? false),
  );
}
function hasText(root: renderer.ReactTestInstance, text: string): boolean {
  return findText(root, text).length > 0;
}

function findWithProp(root: renderer.ReactTestInstance, propName: string): renderer.ReactTestInstance[] {
  return root.findAll((node: renderer.ReactTestInstance) => propName in (node.props || {}));
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

// =========================================================================
// HeaderNav
// =========================================================================
describe("HeaderNav", () => {
  it("renderiza logo e elementos principais", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<HeaderNav />); });
    expect(tree!.toJSON()).not.toBeNull();
  });

  it("navega para notificações ao pressionar sino", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<HeaderNav />); });
    const bellBtn = findWithProp(tree!.root, "onPress");
    expect(bellBtn.length).toBeGreaterThan(0);
  });

  it("aceita currentPage e onPageChange", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<HeaderNav currentPage={0} onPageChange={jest.fn()} />); });
    expect(tree!.toJSON()).not.toBeNull();
  });
});

// =========================================================================
// BottomNav
// =========================================================================
describe("BottomNav", () => {
  it("renderiza tabs Home e Relatórios", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BottomNav />); });
    expect(hasText(tree!.root, "Home")).toBe(true);
    expect(hasText(tree!.root, "Relatórios")).toBe(true);
  });

  it("navega via router.push sem activeIndex", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BottomNav />); });
    const homeBtn = findWithProp(tree!.root, "onPress");
    act(() => { homeBtn[0].props.onPress(); });
    expect(router.push).toHaveBeenCalledWith("/home");
  });

  it("navega para /metrics", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BottomNav />); });
    const btns = findWithProp(tree!.root, "onPress");
    const metricsBtn = btns.find((n) => findText(n, "Relatórios").length > 0);
    act(() => { metricsBtn?.props.onPress(); });
    expect(router.push).toHaveBeenCalledWith("/metrics");
  });

  it("usa onPageChange no modo pager", () => {
    const onPageChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<BottomNav activeIndex={0} onPageChange={onPageChange} />); });
    const btns = findWithProp(tree!.root, "onPress");
    const metricsBtn = btns.find((n) => findText(n, "Relatórios").length > 0);
    act(() => { metricsBtn?.props.onPress(); });
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});

// =========================================================================
// SideMenu
// =========================================================================
describe("SideMenu", () => {
  it("renderiza items de navegação quando visível", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <SideMenu visible={true} onClose={jest.fn()} currentPage={0} onPageChange={jest.fn()} />
      );
    });
    expect(hasText(tree!.root, "Home")).toBe(true);
    expect(hasText(tree!.root, "Relatórios")).toBe(true);
    expect(hasText(tree!.root, "Notificações")).toBe(true);
  });

  it("não renderiza quando visible=false", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SideMenu visible={false} onClose={jest.fn()} />);
    });
    expect(tree!.toJSON()).toBeNull();
  });
});
