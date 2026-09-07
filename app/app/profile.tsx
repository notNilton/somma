import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AvatarImage } from "@/components/AvatarImage";
import { BottomNav } from "@/components/BottomNav";
import { CustomButton } from "@/components/Button";
import { HeaderNav } from "@/components/HeaderNav";
import { CustomInput } from "@/components/Input";
import { NotificationRow } from "@/components/NotificationRow";
import { authService } from "@/services/auth";
import type { PushValorTipo } from "@/types/auth";
import { applyCpfMask, applyPhoneMask } from "@/utils/masks";

import DollarIcon from "@/assets/icons/dollar.svg";
import CashIcon from "@/assets/icons/cash.svg";

export function ProfileContent() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [pushValorTipo, setPushValorTipo] = useState<PushValorTipo>("comissao");
  const [saving, setSaving] = useState(false);
  const [nomeError, setNomeError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const inputsLoading = loadingData || saving || refreshing;

  async function loadProfile() {
    const profile = await authService.getProfile();
    setNome(profile.first_name ?? "");
    setSobrenome(profile.last_name ?? "");
    setEmail(profile.email ?? "");
    setCpf(profile.cpf ?? "");
    setWhatsapp(applyPhoneMask(profile.phone ?? ""));
    setPushValorTipo(profile.push_valor_tipo ?? "comissao");
  }

  async function handleSave() {
    if (!nome.trim()) {
      setNomeError("Nome é obrigatório");
      return;
    }
    setNomeError("");
    setSaving(true);
    try {
      await authService.updateProfile({
        first_name: nome,
        last_name: sobrenome || undefined,
        push_valor_tipo: pushValorTipo,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadProfile().finally(() => setLoadingData(false));
  }, []);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#FACC15"
          colors={["#FACC15"]}
        />
      }
    >
      <Text style={styles.title}>Meu Perfil</Text>

      <AvatarImage size={80} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Informações pessoais</Text>
        <View style={styles.fields}>
          <CustomInput
            placeholder="Nome"
            value={nome}
            onChangeText={(text) => {
              setNome(text);
              if (text.trim()) setNomeError("");
            }}
            autoCapitalize="words"
            loading={inputsLoading}
            errorMessage={nomeError}
          />
          <CustomInput
            placeholder="Sobrenome"
            value={sobrenome}
            onChangeText={setSobrenome}
            autoCapitalize="words"
            loading={inputsLoading}
          />
          <CustomInput
            placeholder="CPF"
            value={cpf}
            onChangeText={(text) => setCpf(applyCpfMask(text))}
            keyboardType="numeric"
            disabled
            loading={inputsLoading}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contato</Text>
        <View style={styles.fields}>
          <CustomInput
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            type="email"
            disabled
            loading={inputsLoading}
          />
          <CustomInput
            placeholder="WhatsApp"
            value={whatsapp}
            onChangeText={(text) => setWhatsapp(applyPhoneMask(text))}
            keyboardType="phone-pad"
            disabled
            loading={inputsLoading}
          />
          <CustomInput
            placeholder="Instagram"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
            disabled
            loading={inputsLoading}
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notificações</Text>
        <View style={styles.notifCard}>
          <Text style={styles.notifCardTitle}>Notificações de Venda</Text>
          {/* Exclusivo: o push mostra UM valor (total OU comissão). Ligar um desliga o outro. */}
          <NotificationRow
            icon={DollarIcon}
            label="Valor total"
            value={pushValorTipo === "total"}
            onValueChange={(on) => on && setPushValorTipo("total")}
            disabled={inputsLoading}
          />
          <NotificationRow
            icon={CashIcon}
            label="Comissão a receber"
            value={pushValorTipo === "comissao"}
            onValueChange={(on) => on && setPushValorTipo("comissao")}
            disabled={inputsLoading}
          />
        </View>
      </View>

      <View style={styles.buttons}>
        <CustomButton label="Salvar" onPress={handleSave} loading={saving} />
        <CustomButton
          label="Sair"
          type="secondary"
          onPress={() => router.push("/tela-inexistente" as any)}
        />
      </View>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          Pagah v{Constants.expoConfig?.version ?? "0.0.0"}
        </Text>
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <HeaderNav />
      <ProfileContent />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
  },
  fill: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 28,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fields: {
    gap: 4,
  },
  notifCard: {
    backgroundColor: "#1a1a1a",
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  notifCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
  },
  buttons: {
    gap: 14,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 12,
  },
  versionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
});
