import React, { useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";

interface TableProps<T> {
  readonly headers: React.ReactNode;
  readonly data: readonly T[];
  readonly renderRow: (item: T, index: number) => React.ReactNode;
  readonly keyExtractor: (item: T, index: number) => string;
  readonly cellWidth?: number;
}

interface CellEntry {
  key: string;
  node: React.ReactNode;
}

function flattenChildren(children: React.ReactNode): CellEntry[] {
  const result: CellEntry[] = [];
  let fallbackIndex = 0;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const nested = flattenChildren(
        (child.props as { children?: React.ReactNode }).children,
      );
      result.push(...nested);
    } else if (child !== null && child !== undefined) {
      const key =
        React.isValidElement(child) && child.key !== null
          ? child.key
          : `cell-${fallbackIndex}`;
      fallbackIndex += 1;
      result.push({ key, node: child });
    }
  });

  return result;
}

export function Table<T>({
  headers,
  data,
  renderRow,
  keyExtractor,
  cellWidth = 100,
}: TableProps<T>) {
  const headerCells = flattenChildren(headers);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 2;
    setCanScrollRight(!atEnd);
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View>
          <View style={styles.headerRow}>
            {headerCells.map(({ key, node }) => (
              <View
                key={key}
                style={[styles.cell, styles.headerCell, { width: cellWidth }]}
              >
                {node}
              </View>
            ))}
          </View>

          {data.map((item, rowIndex) => {
            const rowKey = keyExtractor(item, rowIndex);
            const rowCells = flattenChildren(renderRow(item, rowIndex));
            const isLast = rowIndex === data.length - 1;
            return (
              <View
                key={rowKey}
                style={[styles.row, !isLast && styles.rowDivider]}
              >
                {rowCells.map(({ key, node }) => (
                  <View
                    key={key}
                    style={[styles.cell, styles.bodyCell, { width: cellWidth }]}
                  >
                    {node}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {canScrollRight && (
        <View pointerEvents="none" style={styles.scrollHint}>
          <Text style={styles.scrollHintArrow}>›</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#131313",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
  },
  cell: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: "center",
  },
  headerCell: {
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  bodyCell: {},
  scrollHint: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: "rgba(19,19,19,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#2a2a2a",
  },
  scrollHintArrow: {
    fontSize: 16,
    color: "#555555",
    fontFamily: "Inter_400Regular",
  },
});
