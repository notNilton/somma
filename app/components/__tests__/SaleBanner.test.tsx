import React from "react";
import { act } from "react-test-renderer";
import renderer from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";

/**
 * Mock react-native manualmente sem jest.requireActual para evitar
 * o erro "__fbBatchedBridgeConfig is not set" (módulos nativos RN).
 *
 * Tudo é definido INLINE dentro da factory do jest.mock porque
 * a factory é hoisted e não pode referenciar variáveis externas.
 */
jest.mock("react-native", () => {
  const ReactLocal = require("react");

  return {
    Animated: {
      Value: class {
        _value: number;
        constructor(value: number) {
          this._value = value;
        }
        setValue(v: number) {
          this._value = v;
        }
        interpolate() {
          return 100;
        }
      },
      spring: () => ({
        start: (cb?: () => void) => {
          if (cb) cb();
        },
      }),
      timing: () => ({
        start: (cb?: () => void) => {
          if (cb) cb();
        },
      }),
      parallel: (animations: Array<{ start: (cb?: () => void) => void }>) => ({
        start: (callback?: () => void) => {
          animations.forEach((a: { start: (cb?: () => void) => void }) =>
            a.start(),
          );
          if (callback) callback();
        },
      }),
      View: ({ children, style, ...rest }: Record<string, unknown>) =>
        ReactLocal.createElement("Animated.View", { ...rest, style }, children),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 2 })),
    },
    Easing: {
      linear: (t: number) => t,
      in: (easing: (t: number) => number) => (t: number) => easing(t),
      cubic: (t: number) => t * t * t,
    },
    Pressable: ({ children, onPress, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement(
        "Pressable",
        { onClick: onPress, ...rest },
        children,
      ),
    StyleSheet: {
      create: (styles: Record<string, object>) => styles,
    },
    Text: ({ children, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("Text", rest, children),
    View: ({ children, ...rest }: Record<string, unknown>) =>
      ReactLocal.createElement("View", rest, children),
  };
});

// Mock SVG import: retorna um componente que renderiza "CloseIcon" como texto
jest.mock("@/assets/icons/close.svg", () => {
  const ReactLocal = require("react");
  return () => ReactLocal.createElement(ReactLocal.Fragment, null, "CloseIcon");
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import { SaleBanner, type SaleBannerData } from "../SaleBanner";

const defaultData: SaleBannerData = {
  title: "Nova venda",
  body: "Pix - Comissão de R$ 150,00",
};

/** Helper: find Text-like nodes containing a specific string */
function findText(
  root: renderer.ReactTestInstance,
  text: string,
): renderer.ReactTestInstance[] {
  return root.findAll(
    (node: renderer.ReactTestInstance) =>
      (node.children?.some?.((c: unknown) => String(c).includes(text)) ?? false),
  );
}

/** Render the SaleBanner wrapped in act() and return the tree */
function renderBanner(
  data: SaleBannerData | null,
  onDismiss: () => void = jest.fn(),
): ReactTestRenderer {
  let tree: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<SaleBanner data={data} onDismiss={onDismiss} />);
  });
  return tree!;
}

/** Render the SaleBanner for dismiss tests (returns onDismiss mock too) */
function renderForDismiss() {
  const onDismiss = jest.fn();
  act(() => {
    renderer.create(<SaleBanner data={defaultData} onDismiss={onDismiss} />);
  });
  return { onDismiss };
}

describe("SaleBanner", () => {
  beforeAll(() => {
    // Animated.start() uses requestAnimationFrame in JS driver mode.
    // With our sync mock, this is dead code but kept for safety.
    globalThis.requestAnimationFrame = (cb: (time: number) => void) => {
      return setTimeout(() => cb(Date.now()), 0) as unknown as number;
    };
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // --- Render states ---

  it("renders nothing when data is null", () => {
    const tree = renderBanner(null);
    expect(tree.toJSON()).toBeNull();
  });

  it("renders title and commission when data is provided", () => {
    const tree = renderBanner(defaultData);

    const titleNodes = findText(tree.root, "Nova venda");
    expect(titleNodes.length).toBeGreaterThan(0);

    const commissionNodes = findText(tree.root, "Comissão:");
    expect(commissionNodes.length).toBeGreaterThan(0);
  });

  it("displays commission value", () => {
    const tree = renderBanner(defaultData);

    const valueNodes = findText(tree.root, "150,00");
    expect(valueNodes.length).toBeGreaterThan(0);
  });

  // --- Commission extraction ---

  it("displays commission for different amounts", () => {
    const tree = renderBanner({
      title: "Venda",
      body: "Boleto - Comissão de R$ 49,90",
    });

    const valueNodes = findText(tree.root, "49,90");
    expect(valueNodes.length).toBeGreaterThan(0);
  });

  it("displays commission for large values with thousand separator", () => {
    const tree = renderBanner({
      title: "Venda",
      body: "Cartão - Comissão de R$ 1.234,56",
    });

    const valueNodes = findText(tree.root, "1.234,56");
    expect(valueNodes.length).toBeGreaterThan(0);
  });

  it("hides commission section when body has no commission info", () => {
    const tree = renderBanner({
      title: "Venda",
      body: "Venda registrada",
    });

    const commissionNodes = findText(tree.root, "Comissão:");
    expect(commissionNodes.length).toBe(0);
  });

  it("handles body without payment method prefix", () => {
    const tree = renderBanner({
      title: "Venda",
      body: "Venda realizada - Comissão de R$ 30,00",
    });

    const valueNodes = findText(tree.root, "30,00");
    expect(valueNodes.length).toBeGreaterThan(0);
  });

  // --- Fallback ---

  it("uses fallback title when title is empty", () => {
    const tree = renderBanner({
      title: "",
      body: "Cartão - Comissão de R$ 50,00",
    });

    const titleNodes = findText(tree.root, "Nova venda");
    expect(titleNodes.length).toBeGreaterThan(0);
  });

  // --- Visual elements ---

  it("renders close icon button", () => {
    const tree = renderBanner(defaultData);

    const closeNodes = findText(tree.root, "CloseIcon");
    expect(closeNodes.length).toBeGreaterThan(0);
  });

  // --- Dismiss behavior ---

  it("does not call onDismiss before the auto-dismiss timeout", () => {
    const { onDismiss } = renderForDismiss();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("auto-dismisses after timeout when data is provided", () => {
    const { onDismiss } = renderForDismiss();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
