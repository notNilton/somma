import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Themed";

const CARD_BG = "#1a1a1a";

export function OrdersCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Pedidos</Text>
      <Text style={styles.value}>3</Text>
      <Text style={styles.comparison}>+100% vs ontem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    gap: 4,
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#b1b1b1",
    backgroundColor: CARD_BG,
  },
  value: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
  comparison: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#3BB166",
    backgroundColor: CARD_BG,
  },
});
