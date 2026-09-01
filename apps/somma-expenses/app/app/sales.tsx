import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomNav } from "@/components/BottomNav";
import { CustomButton } from "@/components/Button";
import { DropdownInput } from "@/components/DropdownInput";
import { HeaderNav } from "@/components/HeaderNav";
import { CustomInput } from "@/components/Input";
import { notifyNewSale } from "@/services/notifications";
import { salesService } from "@/services/sales";

const CHANNEL_OPTIONS = [
  "Site",
  "Instagram",
  "Google",
  "Afiliados",
  "Venda Interna",
  "Upsell",
  "Email",
] as const;

const PAYMENT_OPTIONS = [
  "Cartão de crédito",
  "Cartão de débito",
  "Pix",
  "Boleto",
] as const;

function formatAmount(digits: string): string {
  const num = Number.parseInt(digits || "0", 10);
  return (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesScreen() {
  const router = useRouter();
  const amountInputRef = useRef<TextInput>(null);
  const [customerName, setCustomerName] = useState("");
  const [amountDigits, setAmountDigits] = useState("");
  const [channel, setChannel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAmountChange(text: string) {
    const cleaned = text.replaceAll(/\D/g, "").slice(0, 10);
    setAmountDigits(cleaned);
    setError("");
  }

  async function handleRegister() {
    if (!customerName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    const cents = Number.parseInt(amountDigits || "0", 10);
    if (cents === 0) {
      setError("Informe o valor da venda.");
      return;
    }
    if (!channel) {
      setError("Selecione o canal de venda.");
      return;
    }
    if (!paymentMethod) {
      setError("Selecione a forma de pagamento.");
      return;
    }

    setLoading(true);

    try {
      const { id: orderId } = await salesService.create({
        customer_name: customerName.trim(),
        amount: cents,
        channel,
        payment_method: paymentMethod,
      });

      await notifyNewSale({
        amount: cents,
        customerName: customerName.trim(),
        channel,
        paymentMethod,
        orderId,
      });

      router.push("/sales-success" as any);
    } catch {
      setError("Erro ao registrar venda. Tente novamente.");
    } finally {
      setLoading(false);
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
        <Text style={styles.pageTitle}>Registrar venda</Text>

        <CustomInput
          placeholder="Nome do cliente"
          value={customerName}
          onChangeText={(text) => {
            setCustomerName(text);
            setError("");
          }}
        />

        <View style={styles.amountSection}>
          <Text style={styles.amountTitle}>Valor da venda (R$)</Text>
          <Pressable
            style={styles.inputRow}
            onPress={() => amountInputRef.current?.focus()}
          >
            <Text style={styles.prefix}>R$</Text>
            <Text style={styles.input}>{formatAmount(amountDigits)}</Text>
            <TextInput
              ref={amountInputRef}
              value={amountDigits}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              style={styles.hiddenInput}
            />
          </Pressable>
        </View>

        <DropdownInput
          placeholder="Canal de venda"
          value={channel}
          onValueChange={(val) => {
            setChannel(val);
            setError("");
          }}
          options={CHANNEL_OPTIONS}
        />

        <DropdownInput
          placeholder="Forma de pagamento"
          value={paymentMethod}
          onValueChange={(val) => {
            setPaymentMethod(val);
            setError("");
          }}
          options={PAYMENT_OPTIONS}
        />

        {error !== "" && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.divider} />

        <CustomButton
          label="Registrar venda"
          onPress={handleRegister}
          loading={loading}
        />
      </ScrollView>
      <BottomNav />
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
    gap: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  amountSection: {
    gap: 10,
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
  hiddenInput: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
  divider: {
    height: 0.5,
    backgroundColor: "#444444",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#F87171",
    textAlign: "center",
  },
});
