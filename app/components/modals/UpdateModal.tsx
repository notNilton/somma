import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomButton } from "@/components/Button";
import { LoadingDots } from "@/components/LoadingDots";

const SCREEN_H = Dimensions.get("window").height;

export type UpdateModalState =
  | { type: "hidden" }
  | { type: "available" }
  | { type: "downloading" }
  | { type: "error"; message: string }
  | { type: "success" };

interface UpdateModalProps {
  readonly state: UpdateModalState;
  readonly onDismiss: () => void;
  readonly onConfirm: () => void;
  readonly onRestart: () => void;
}

export function UpdateModal({
  state,
  onDismiss,
  onConfirm,
  onRestart,
}: UpdateModalProps) {
  const insets = useSafeAreaInsets();
  const visible = state.type !== "hidden";
  const scale = useRef(new Animated.Value(0.9)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, overlayOpacity]);

  if (!visible) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible>
      <View style={styles.root}>
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={
              state.type === "available" || state.type === "success"
                ? onDismiss
                : undefined
            }
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 32,
              transform: [{ scale }],
            },
          ]}
        >
          {state.type === "available" && (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>🔄</Text>
              </View>

              <Text style={styles.title}>Atualização disponível</Text>
              <Text style={styles.description}>
                Uma nova versão do Pagah está disponível. Baixe agora para ter
                acesso às últimas funcionalidades e melhorias.
              </Text>

              <View style={styles.buttons}>
                <CustomButton label="Atualizar agora" onPress={onConfirm} />
                <CustomButton
                  label="Agora não"
                  type="secondary"
                  onPress={onDismiss}
                />
              </View>
            </>
          )}

          {state.type === "downloading" && (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>⬇️</Text>
              </View>

              <Text style={styles.title}>Baixando atualização</Text>

              <View style={styles.loadingWrapper}>
                <LoadingDots color="#FACC15" />
              </View>

              <Text style={styles.description}>
                Aguarde enquanto a nova versão está sendo baixada...
              </Text>
            </>
          )}

          {state.type === "success" && (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>✅</Text>
              </View>

              <Text style={styles.title}>Atualização concluída</Text>
              <Text style={styles.description}>
                A nova versão foi baixada com sucesso. Reinicie o app para
                aplicar as mudanças.
              </Text>

              <View style={styles.buttons}>
                <CustomButton label="Reiniciar agora" onPress={onRestart} />
                <CustomButton
                  label="Depois"
                  type="secondary"
                  onPress={onDismiss}
                />
              </View>
            </>
          )}

          {state.type === "error" && (
            <>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>❌</Text>
              </View>

              <Text style={styles.title}>Erro ao atualizar</Text>
              <Text style={styles.description}>
                {state.message}
              </Text>

              <View style={styles.buttons}>
                <CustomButton label="Fechar" onPress={onDismiss} />
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  card: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  buttons: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  loadingWrapper: {
    paddingVertical: 16,
  },
});
