import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import CashIcon from "@/assets/icons/cash.svg";
import CursorIcon from "@/assets/icons/cursor.svg";
import PersonIcon from "@/assets/icons/person.svg";
import PhoneIcon from "@/assets/icons/phone.svg";
import WorldIcon from "@/assets/icons/world.svg";
import { LoadingDots } from "@/components/LoadingDots";
import { Text } from "@/components/Themed";
import type { SalesChannel } from "@/types/home";

const CARD_BG = "#1a1a1a";
const PAGE_BG = "#111111";
const VISIBLE_COUNT = 3;
const GAP = 12;

type SvgIcon = React.ComponentType<{
  width?: number;
  height?: number;
  color?: string;
}>;

const CHANNEL_META: Record<string, { icon: SvgIcon; iconColor: string; iconBg: string }> = {
  site:          { icon: WorldIcon,  iconColor: "#3b82f6", iconBg: "#1e3a5f" },
  callcenter:    { icon: PhoneIcon,  iconColor: "#7c3aed", iconBg: "#2d1a4a" },
  orderbump:     { icon: CashIcon,   iconColor: "#FACC15", iconBg: "#2a2200" },
  upsell:        { icon: CursorIcon, iconColor: "#f97316", iconBg: "#3d1f0a" },
  afiliados:     { icon: PersonIcon, iconColor: "#10b981", iconBg: "#0a2d1f" },
};

const FALLBACK_META = { icon: CashIcon, iconColor: "#888888", iconBg: "#252525" };



function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ChannelCard({
  channel,
}: {
  readonly channel: SalesChannel;
}) {
  const meta = CHANNEL_META[channel.key] ?? FALLBACK_META;
  const { icon: Icon, iconColor, iconBg } = meta;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Icon width={22} height={22} color={iconColor} />
        </View>
        <View>
          <Text style={styles.methodLabel}>{channel.label}</Text>
          <Text style={styles.methodSales}>
            {channel.orders_sem_juros ?? channel.orders} {channel.orders_sem_juros ?? channel.orders === 1 ? "pedido" : "pedidos"}
          </Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.methodValue}>{formatBRL(channel.revenue_sem_juros ?? channel.revenue)}</Text>
        <Text style={[styles.methodPercentage, { color: iconColor }]}>
          {channel.percentage_sem_juros ?? channel.percentage}%
        </Text>
      </View>
    </View>
  );
}

interface Props {
  channels: SalesChannel[];
  loading: boolean;
}

export function PaymentMethodsCard({ channels, loading }: Readonly<Props>) {
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);

  const extraHeight = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const measuredH = useRef(0);

  const activeChannels = [...(channels ?? [])].sort((a, b) => {
    const revA = a.revenue_sem_juros ?? a.revenue;
    const revB = b.revenue_sem_juros ?? b.revenue;
    if (revA === 0 && revB === 0) return 0;
    if (revA === 0) return 1;
    if (revB === 0) return -1;
    return revB - revA;
  });

  const hasMore = activeChannels.length > VISIBLE_COUNT;
  const alwaysVisible = activeChannels.slice(0, VISIBLE_COUNT);
  const extraItems = activeChannels.slice(VISIBLE_COUNT);

  function toggle() {
    const opening = !expanded;
    setExpanded(opening);

    Animated.parallel([
      Animated.timing(extraHeight, {
        toValue: opening ? measuredH.current : 0,
        duration: 350,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fadeOpacity, {
        toValue: opening ? 0 : 1,
        duration: opening ? 150 : 250,
        useNativeDriver: true,
      }),
    ]).start();
  }



  const totalOrders = activeChannels.reduce(
    (sum, ch) => sum + (ch.orders_sem_juros ?? ch.orders),
    0,
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Divisão de vendas</Text>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <LoadingDots />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <View style={styles.list}>
            {alwaysVisible.map((channel: SalesChannel) => (
              <View key={channel.key} style={(channel.revenue_sem_juros ?? channel.revenue) === 0 ? styles.zeroChannel : undefined}>
                <ChannelCard channel={channel} />
              </View>
            ))}

            {hasMore && (
              <Animated.View style={{ height: extraHeight, overflow: "hidden" }}>
                <View style={styles.extraInner}>
                  {extraItems.map((channel: SalesChannel) => (
                    <View key={channel.key} style={(channel.revenue_sem_juros ?? channel.revenue) === 0 ? styles.zeroChannel : undefined}>
                      <ChannelCard channel={channel} />
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
          </View>

          {hasMore && (
            <Animated.View
              style={[styles.fadeOverlay, { opacity: fadeOpacity }]}
              pointerEvents="none"
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={PAGE_BG} stopOpacity="0" />
                    <Stop offset="1" stopColor={PAGE_BG} stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#fadeGrad)" />
              </Svg>
            </Animated.View>
          )}

          {hasMore && !measured && (
            <View
              style={styles.measureView}
              pointerEvents="none"
              onLayout={(e) => {
                measuredH.current = e.nativeEvent.layout.height;
                setMeasured(true);
              }}
            >
              {extraItems.map((channel: SalesChannel) => (
                <View key={channel.key} style={(channel.revenue_sem_juros ?? channel.revenue) === 0 ? styles.zeroChannel : undefined}>
                  <ChannelCard channel={channel} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {!loading && hasMore && (
        <Pressable
          style={styles.seeMoreBtn}
          onPress={toggle}
          disabled={!measured}
        >
          <Text style={styles.seeMoreLabel}>
            {expanded ? "Ver menos ⬆️" : "Ver mais ⬇️"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  loadingWrapper: {
    width: "100%",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  listWrapper: {
    width: "100%",
  },
  list: {
    width: "100%",
    gap: GAP,
  },
  extraInner: {
    gap: GAP,
  },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  methodLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
  methodSales: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    backgroundColor: CARD_BG,
  },
  methodValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
  methodPercentage: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    backgroundColor: CARD_BG,
  },
  fadeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  measureView: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
    gap: GAP,
  },
  seeMoreBtn: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  seeMoreLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
  },
  zeroChannel: {
    opacity: 0.4,
  },
});
