import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CloseIcon from "@/assets/icons/close.svg";

export interface SaleBannerData {
  /** Texto do título da notificação (ex: "Compra Gerada") */
  title: string;
  /** Texto do corpo (ex: "Boleto - Comissão de R$ 150,00") */
  body: string;
  /** ID do pedido para navegação */
  pedidoId?: string | number;
}

interface SaleBannerProps {
  data: SaleBannerData | null;
  onDismiss: () => void;
}

const BANNER_HEIGHT = 80;
const DURATION = 400;
const AUTO_DISMISS_MS = 4500;

export function SaleBanner({ data, onDismiss }: SaleBannerProps) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);

  // Animate in when data arrives
  useEffect(() => {
    if (data) {
      // Clear any existing auto-dismiss
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }

      isAnimatingRef.current = true;
      setVisible(true);

      translateY.setValue(-120);
      opacity.setValue(0);
      progressAnim.setValue(1);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 14,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimatingRef.current = false;

        // Start progress bar shrink
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: AUTO_DISMISS_MS,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();

        // Auto-dismiss
        autoDismissRef.current = setTimeout(() => {
          handleDismiss();
        }, AUTO_DISMISS_MS);
      });
    }

    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
      }
    };
  }, [data]);

  function handleDismiss() {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;

    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimatingRef.current = false;
      setVisible(false);
      onDismiss();
    });
  }

  if (!visible && !data) return null;

  // Extract commission info from body
  const commissionMatch = data?.body.match(/Comissão de R\$ ([\d.,]+)/);
  const commissionValue = commissionMatch?.[1] ?? null;

  // Extract payment method (text before " - " in body)
  const methodMatch = data?.body.match(/^(\w+) - /);
  const paymentMethod = methodMatch?.[1] ?? null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.banner}
        onPress={handleDismiss}
      >
        {/* Ícone de venda */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💰</Text>
        </View>

        {/* Conteúdo */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {data?.title || "Nova venda"}
          </Text>

          {commissionValue ? (
            <Text style={styles.commission}>
              Comissão:{" "}
              <Text style={styles.commissionValue}>
                R$ {commissionValue}
              </Text>
            </Text>
          ) : null}

          <Text style={styles.method} numberOfLines={1}>
            {[paymentMethod, data?.body.split(" - ").pop()]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </View>

        {/* Botão fechar */}
        <Pressable
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={8}
        >
          <CloseIcon width={14} height={14} color="#888" />
        </Pressable>
      </Pressable>

      {/* Barra de progresso (auto-dismiss) */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, screenWidth - 32],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A2A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
  },
  commission: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#e0e0e0",
  },
  commissionValue: {
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  method: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2A2A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    height: 2,
    backgroundColor: "#FACC15",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignSelf: "flex-start",
    marginLeft: 0,
  },
});
