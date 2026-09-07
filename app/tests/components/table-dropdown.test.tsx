// =========================================================================
// Testes para Table e DropdownInput
// Usando react-test-renderer (padrão remaining-components)
// =========================================================================

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

jest.mock("@/assets/icons/eye.svg", () => ({ __esModule: true, default: () => null }));
jest.mock("@/assets/icons/eyeoff.svg", () => ({ __esModule: true, default: () => null }));

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

    NativeScrollEvent: class {},
    NativeSyntheticEvent: class {},
  };
});

import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

import { Table } from "@/components/Table";
import { DropdownInput } from "@/components/DropdownInput";

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
// Table
// =========================================================================
describe("Table", () => {
  interface RowData {
    id: string;
    name: string;
    value: number;
  }

  const mockData: RowData[] = [
    { id: "1", name: "Item A", value: 100 },
    { id: "2", name: "Item B", value: 200 },
    { id: "3", name: "Item C", value: 300 },
  ];

  it("renderiza headers", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Nome</Text>}
          data={mockData}
          renderRow={(item) => <Text>{item.name}</Text>}
          keyExtractor={(item) => item.id}
        />
      );
    });
    expect(hasText(tree!.root, "Nome")).toBe(true);
  });

  it("renderiza todas as linhas de dados", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Coluna</Text>}
          data={mockData}
          renderRow={(item) => <Text>{item.name}</Text>}
          keyExtractor={(item) => item.id}
        />
      );
    });
    expect(hasText(tree!.root, "Item A")).toBe(true);
    expect(hasText(tree!.root, "Item B")).toBe(true);
    expect(hasText(tree!.root, "Item C")).toBe(true);
  });

  it("renderiza múltiplas colunas", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Nome</Text>}
          data={mockData}
          renderRow={(item) => (
            <>
              <Text>{item.name}</Text>
              <Text>{String(item.value)}</Text>
            </>
          )}
          keyExtractor={(item) => item.id}
        />
      );
    });
    expect(hasText(tree!.root, "Item A")).toBe(true);
    expect(hasText(tree!.root, "100")).toBe(true);
  });

  it("aceita cellWidth customizado", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Col</Text>}
          data={mockData.slice(0, 1)}
          renderRow={(item) => <Text>{item.name}</Text>}
          keyExtractor={(item) => item.id}
          cellWidth={200}
        />
      );
    });
    expect(hasText(tree!.root, "Item A")).toBe(true);
  });

  it("renderiza com array vazio sem erro", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <Table
          headers={<Text>Coluna</Text>}
          data={[]}
          renderRow={(item: RowData) => <Text>{item.name}</Text>}
          keyExtractor={(item) => item.id}
        />
      );
    });
    expect(hasText(tree!.root, "Coluna")).toBe(true);
    expect(hasText(tree!.root, "Item A")).toBe(false);
  });
});

// =========================================================================
// DropdownInput
// =========================================================================
describe("DropdownInput", () => {
  const options = ["Opção 1", "Opção 2", "Opção 3"];

  it("renderiza com placeholder", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Selecione" value="" onValueChange={jest.fn()} options={options} />
      );
    });
    expect(hasText(tree!.root, "Selecione")).toBe(true);
  });

  it("mostra valor selecionado", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Canal" value="Opção 2" onValueChange={jest.fn()} options={options} />
      );
    });
    expect(hasText(tree!.root, "Opção 2")).toBe(true);
  });

  it("abre lista de opções ao pressionar", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Selecione" value="" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = findWithProp(tree!.root, "onPress");
    act(() => { btns[0]?.props.onPress(); });
    expect(hasText(tree!.root, "Opção 1")).toBe(true);
    expect(hasText(tree!.root, "Opção 2")).toBe(true);
    expect(hasText(tree!.root, "Opção 3")).toBe(true);
  });

  it("chama onValueChange ao selecionar opção", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Selecione" value="" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = findWithProp(tree!.root, "onPress");
    act(() => { btns[0]?.props.onPress(); });
    const optionBtns = findWithProp(tree!.root, "onPress");
    act(() => { optionBtns[optionBtns.length - 1]?.props.onPress(); });
    expect(onValueChange).toHaveBeenCalledWith("Opção 3");
  });

  it("exibe mensagem de erro", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Campo" value="" onValueChange={jest.fn()} options={options} errorMessage="Campo obrigatório" />
      );
    });
    expect(hasText(tree!.root, "Campo obrigatório")).toBe(true);
  });

  it("mostra 'Limpar seleção' quando há valor", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Campo" value="Opção 1" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = findWithProp(tree!.root, "onPress");
    act(() => { btns[0]?.props.onPress(); });
    expect(hasText(tree!.root, "Limpar seleção")).toBe(true);
  });

  it("limpa seleção ao pressionar 'Limpar seleção'", () => {
    const onValueChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DropdownInput placeholder="Campo" value="Opção 1" onValueChange={onValueChange} options={options} />
      );
    });
    const btns = findWithProp(tree!.root, "onPress");
    act(() => { btns[0]?.props.onPress(); });
    const allBtns = findWithProp(tree!.root, "onPress");
    const clearBtn = allBtns.find((n) => {
      return findText(n, "Limpar").length > 0;
    });
    if (clearBtn) {
      act(() => { clearBtn.props.onPress(); });
    }
    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
