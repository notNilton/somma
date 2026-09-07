import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import CashIcon from "@/assets/icons/cash.svg";
import InfoIcon from "@/assets/icons/info.svg";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { HeaderNav } from "@/components/HeaderNav";
import { LoadingDots } from "@/components/LoadingDots";
import { registerPushToken } from "@/services/notifications";
import { notificationsService } from "@/services/notifications_list";
import type { Notification, NotificationType } from "@/types/notifications";

const TYPE_MAP: Record<
  NotificationType,
  {
    icon: React.ComponentType<{
      width?: number;
      height?: number;
      color?: string;
    }>;
    iconColor: string;
    iconBg: string;
  }
> = {
  cash: {
    icon: CashIcon,
    iconColor: "#3BB166",
    iconBg: "#0F2A1A",
  },
  info: {
    icon: InfoIcon,
    iconColor: "#60A5FA",
    iconBg: "#0a1a2a",
  },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<"granted" | "denied" | "unknown">("unknown");

  async function loadNotifications() {
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch {}
  }

  async function checkPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationPermission(status === "granted" ? "granted" : "denied");
  }

  async function handleEnableNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      setNotificationPermission("granted");
      registerPushToken().catch(() => {});
    } else {
      Linking.openSettings();
    }
  }

  useEffect(() => {
    checkPermission();
    loadNotifications().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.screen}>
      <HeaderNav />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Notificações</Text>

        {notificationPermission === "denied" && (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionTitle}>Notificações desativadas</Text>
            <Text style={styles.permissionDescription}>
              Ative as notificações para receber alertas de novas vendas em tempo real.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={handleEnableNotifications} activeOpacity={0.8}>
              <Text style={styles.permissionButtonLabel}>Ativar notificações</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && <LoadingDots />}

        {!loading && notifications.length === 0 && (
          <EmptyState
            title="Nenhuma notificação!"
            description="Quando você tiver notificações, elas serão exibidas aqui."
          />
        )}

        {!loading && notifications.length > 0 && notifications.map(({ id, type, message }) => {
            const { icon: Icon, iconColor, iconBg } = TYPE_MAP[type] ?? TYPE_MAP.info;
            return (
              <View key={id} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <Icon width={22} height={22} color={iconColor} />
                </View>
                <Text style={styles.message}>{message}</Text>
              </View>
            );
          })
        }
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
  fill: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  permissionBanner: {
    backgroundColor: "#1a1a1a",
    borderWidth: 0.5,
    borderColor: "#FACC15",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  permissionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
  },
  permissionDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#aaaaaa",
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 4,
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  permissionButtonLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
