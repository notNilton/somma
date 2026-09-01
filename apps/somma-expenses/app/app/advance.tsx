import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { HeaderNav } from "@/components/HeaderNav";

const AVAILABLE_CENTS = 324000; // R$ 3.240,00

function formatAmount(digits: string): string {
  const num = Number.parseInt(digits || "0", 10);
  return (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdvanceScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");

  function handleChange(text: string) {
    const cleaned = text.replaceAll(/\D/g, "").slice(0, 10);
    const cents = Number.parseInt(cleaned || "0", 10);
    setDigits(cents > AVAILABLE_CENTS ? String(AVAILABLE_CENTS) : cleaned);
    setError("");
  }

  function handleAdvance() {
    const cents = Number.parseInt(digits || "0", 10);
    if (cents === 0) {
      setError("Informe um valor para antecipar.");
    } else if (cents > AVAILABLE_CENTS) {
      setError("Valor superior ao disponível para antecipação.");
    } else {
      router.push("/advance-success");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderNav />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Antecipar saldo</Text>

        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Antecipação disponível</Text>
          <Text style={styles.balanceValue}>R$ 3.240,00</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountSection}>
          <Text style={styles.amountTitle}>Valor de antecipação (R$)</Text>
          <Pressable style={styles.inputRow} onPress={() => inputRef.current?.focus()}>
            <Text style={styles.prefix}>R$</Text>
            <Text style={styles.input}>{formatAmount(digits)}</Text>
            <TextInput
              ref={inputRef}
              value={digits}
              onChangeText={handleChange}
              keyboardType="numeric"
              style={styles.hiddenInput}
            />
          </Pressable>
          {error !== "" && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.divider} />

        <View style={styles.button}>
          <Pressable style={styles.advanceButton} onPress={handleAdvance}>
            <Text style={styles.advanceButtonLabel}>Antecipar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  balance: {
    gap: 6,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#bbbbbb",
  },
  balanceValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  divider: {
    height: 0.5,
    backgroundColor: "#444444",
  },
  amountSection: {
    gap: 12,
  },
  amountTitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#bbbbbb",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#f97316",
    paddingBottom: 8,
    gap: 8,
  },
  prefix: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    color: "#f97316",
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    padding: 0,
  },
  hiddenInput: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#F87171",
    marginTop: 6,
  },
  button: {
    gap: 0,
  },
  advanceButton: {
    width: "100%",
    backgroundColor: "#f97316",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  advanceButtonLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
