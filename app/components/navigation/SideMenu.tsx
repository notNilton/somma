import { useAuth } from "@/context/AuthContext";
import { useUpdateAvailable } from "@/context/UpdateContext";
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import { useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BellIcon from "@/assets/icons/bell.svg";
import CloseIcon from "@/assets/icons/close.svg";
import ExitIcon from "@/assets/icons/exit.svg";
import HistoryIcon from "@/assets/icons/history.svg";
import HomeIcon from "@/assets/icons/home.svg";
import MetricsIcon from "@/assets/icons/metrics.svg";
import ProfileIcon from "@/assets/icons/profile.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

const TABS = [
  { label: "Home", icon: HomeIcon, route: "/home" },
  { label: "Relatórios", icon: MetricsIcon, route: "/metrics" },
  { label: "Notificações", icon: BellIcon, route: "/notifications" },
  { label: "Meu Perfil", icon: ProfileIcon, route: "/profile" },
] as const;

// Rotas que fazem parte do PagerView em home.tsx (índice = posição no pager)
const PAGER_ROUTES: Record<string, number> = {
  "/home": 0,
  "/metrics": 1,
};

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  currentPage?: number;
  onPageChange?: (index: number) => void;
}

export function SideMenu({
  visible,
  onClose,
  currentPage = 0,
  onPageChange,
}: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const updateAvailable = useUpdateAvailable();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const animateOpen = () => {
    translateX.setValue(-DRAWER_WIDTH);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleClose = () => animateClose(onClose);

  const isActive = (route: string) => {
    const pagerIndex = PAGER_ROUTES[route];
    if (pagerIndex !== undefined) {
      return pathname === "/home" && currentPage === pagerIndex;
    }
    return pathname === route;
  };

  const handleNavigate = (route: string) => {
    animateClose(() => {
      onClose();
      const pagerIndex = PAGER_ROUTES[route];
      if (pagerIndex !== undefined) {
        if (onPageChange && pathname === "/home") {
          onPageChange(pagerIndex);
        } else {
          router.replace({
            pathname: "/home",
            params: { page: pagerIndex },
          } as any);
        }
      } else {
        router.push(route as any);
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      onShow={animateOpen}
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
            { transform: [{ translateX }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Menu</Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <CloseIcon width={22} height={22} color="#888888" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.list}>
            {TABS.map(({ label, icon: Icon, route }) => {
              const active = isActive(route);
              return (
                <TouchableOpacity
                  key={route}
                  style={styles.item}
                  onPress={() => handleNavigate(route)}
                  activeOpacity={0.7}
                >
                  <Icon
                    width={22}
                    height={22}
                    color={active ? "#FACC15" : "#888888"}
                  />
                  <Text
                    style={[styles.itemLabel, active && styles.itemLabelActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.item, { position: "relative" }]}
              onPress={() => handleNavigate("/releases-history")}
              activeOpacity={0.7}
            >
              <HistoryIcon width={22} height={22} color="#888888" />
              <Text style={styles.itemLabel}>Novidades</Text>
              {updateAvailable && <View style={styles.badgeDot} />}
            </TouchableOpacity>
            <Text style={styles.versionText}>
              v{Constants.expoConfig?.version ?? "0.0.0"}
            </Text>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                animateClose(async () => {
                  onClose();
                  await logout();
                  router.replace("/login/login" as any);
                })
              }
              activeOpacity={0.7}
            >
              <ExitIcon width={22} height={22} color="#ef4444" />
              <Text style={styles.exitLabel}>Sair</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#0a0a0a",
    borderRightWidth: 1,
    borderRightColor: "#2a2a2a",
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginBottom: 24,
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  itemLabel: {
    color: "#888888",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  itemLabelActive: {
    color: "#FACC15",
  },
  footer: {
    marginTop: "auto",
  },
  exitLabel: {
    color: "#ef4444",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  versionText: {
    color: "#555555",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FACC15",
    position: "absolute",
    left: 28,
    top: 10,
  },
});
