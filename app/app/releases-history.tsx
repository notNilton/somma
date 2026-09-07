import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BottomNav } from "@/components/BottomNav";
import { CustomButton } from "@/components/Button";
import { HeaderNav } from "@/components/HeaderNav";
import { LoadingDots } from "@/components/LoadingDots";
import { useUpdateContext } from "@/context/UpdateContext";
import { releasesService } from "@/services/releases";
import type { Release } from "@/types/releases";

export default function ReleasesHistoryScreen() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<
    "idle" | "checking" | "upToDate" | "error"
  >("idle");

  const appVersion = Constants.expoConfig?.version ?? "0.0.0";
  const { checkNow } = useUpdateContext();

  const handleCheckUpdates = useCallback(async () => {
    if (__DEV__) {
      setCheckFeedback("upToDate");
      setTimeout(() => setCheckFeedback("idle"), 3000);
      return;
    }

    setCheckFeedback("checking");
    const result = await checkNow();

    if ("error" in result) {
      setCheckFeedback("error");
    } else if (!result.found) {
      setCheckFeedback("upToDate");
    }
    // Se found=true, o modal abre — não mostra feedback

    setTimeout(() => setCheckFeedback("idle"), 3000);
  }, [checkNow]);

  async function loadReleases() {
    const data = await releasesService.getReleases();
    setReleases(data);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadReleases();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReleases().finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.screen}>
      <HeaderNav />
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FACC15"
            colors={["#FACC15"]}
          />
        }
      >
        <Text style={styles.title}>Novidades</Text>

        <View style={styles.currentVersion}>
          <Text style={styles.currentVersionLabel}>Versão atual</Text>
          <Text style={styles.currentVersionValue}>v.{appVersion}</Text>
        </View>

        <View style={styles.checkSection}>
          <CustomButton
            label={
              checkFeedback === "checking"
                ? "Verificando..."
                : "Verificar atualizações"
            }
            onPress={handleCheckUpdates}
            type="secondary"
            loading={checkFeedback === "checking"}
          />
          {checkFeedback === "upToDate" && (
            <Text style={styles.feedbackText}>
              ✓ Você está usando a versão mais recente.
            </Text>
          )}
          {checkFeedback === "error" && (
            <Text style={[styles.feedbackText, { color: "#ef4444" }]}>
              Erro ao verificar. Tente novamente.
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <LoadingDots color="#FACC15" />
          </View>
        ) : (
          <View style={styles.timeline}>
            {releases.map((release, index) => (
              <View key={release.version} style={styles.releaseCard}>
                <View style={styles.releaseHeader}>
                  <View style={styles.versionBadge}>
                    <Text style={styles.versionText}>v.{release.version}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(release.date)}</Text>
                </View>

                <View style={styles.changesList}>
                  {release.changes.map((change, changeIndex) => (
                    <View key={changeIndex} style={styles.changeRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.changeText}>{change}</Text>
                    </View>
                  ))}
                </View>

                {index < releases.length - 1 && (
                  <View style={styles.separator} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
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
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  currentVersion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  checkSection: {
    gap: 8,
  },
  feedbackText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#3BB166",
    textAlign: "center",
  },
  currentVersionLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  currentVersionValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
  },
  loadingWrapper: {
    alignItems: "center",
    paddingVertical: 48,
  },
  timeline: {
    gap: 0,
  },
  releaseCard: {
    paddingBottom: 20,
  },
  releaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  versionText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  changesList: {
    gap: 6,
    paddingLeft: 4,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: "#FACC15",
    lineHeight: 20,
  },
  changeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#cccccc",
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: "#2a2a2a",
    marginTop: 20,
  },
});
