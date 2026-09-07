import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CustomButton } from "@/components/Button";
import { HeaderNav } from "@/components/HeaderNav";

const AVAILABLE_CENTS = 960051; // R$ 9.600,51

function formatAmount(digits: string): string {
  const num = Number.parseInt(digits || "0", 10);
  return (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WithdrawalScreen() {
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

  function handleWithdraw() {
    const cents = Number.parseInt(digits || "0", 10);
    if (cents === 0) {
      setError("Informe um valor para saque.");
    } else if (cents > AVAILABLE_CENTS) {
      setError("Valor superior ao saldo disponível.");
    } else {
      router.push("/withdrawal-success");
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
        <Text style={styles.pageTitle}>Solicitar saque</Text>

        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Saldo disponível</Text>
          <Text style={styles.balanceValue}>R$ 9.600,51</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountSection}>
          <Text style={styles.amountTitle}>Valor do saque (R$)</Text>
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

        <View style={styles.bankSection}>
          <Text style={styles.amountTitle}>Conta bancária</Text>
          <View style={styles.bankCard}>
            {[
              { label: "Tipo de Conta", value: "PIX" },
              { label: "Tipo de Chave", value: "CNPJ" },
              { label: "Chave PIX",     value: "15.546.411/0000-154" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.bankRow}>
                <Text style={styles.bankLabel}>{label}</Text>
                <Text style={styles.bankValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <CustomButton label="Sacar" onPress={handleWithdraw} backgroundColor="#FACC15" labelColor="#000000" />
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
    borderBottomColor: "#FACC15",
    paddingBottom: 8,
    gap: 8,
  },
  prefix: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    padding: 0,
  },
  bankSection: {
    gap: 12,
  },
  bankCard: {
    backgroundColor: "#1a1a1a",
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  bankValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
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
});
