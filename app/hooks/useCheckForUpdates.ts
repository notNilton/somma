import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Updates from "expo-updates";

import type { UpdateModalState } from "@/components/UpdateModal";

export type CheckUpdateResult =
  | { found: true }
  | { found: false }
  | { error: string };

interface UpdateCheckState {
  checking: boolean;
  updateAvailable: boolean;
  checkNow: () => Promise<CheckUpdateResult>;
  modalState: UpdateModalState;
  dismissModal: () => void;
  confirmUpdate: () => Promise<void>;
  dismissSuccess: () => void;
}

/**
 * Hook that checks for OTA updates via EAS Update when the app starts.
 *
 * - On mount (after a short delay), calls `Updates.checkForUpdateAsync()`.
 * - If an update is available, opens a custom UpdateModal.
 * - Also exposes a `checkNow()` function for manual refresh.
 *
 * Only runs in production builds (skips in dev/expo go).
 */
export function useCheckForUpdates(): UpdateCheckState {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [modalState, setModalState] = useState<UpdateModalState>({ type: "hidden" });

  const checkNow = useCallback(async (): Promise<CheckUpdateResult> => {
    if (__DEV__) return { found: false };
    if (Platform.OS === "web") return { found: false };

    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateAvailable(true);
        setModalState({ type: "available" });
        return { found: true };
      }
      return { found: false };
    } catch (err) {
      console.warn("[Updates] checkForUpdateAsync falhou:", err);
      return { error: "Erro ao verificar atualizações." };
    } finally {
      setChecking(false);
    }
  }, []);

  const dismissModal = useCallback(() => {
    setModalState({ type: "hidden" });
  }, []);

  const dismissSuccess = useCallback(() => {
    setModalState({ type: "hidden" });
  }, []);

  const confirmUpdate = useCallback(async () => {
    setModalState({ type: "downloading" });
    try {
      await Updates.fetchUpdateAsync();
      setModalState({ type: "success" });
    } catch {
      setModalState({
        type: "error",
        message:
          "Não foi possível baixar a atualização. Verifique sua conexão e tente novamente mais tarde.",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkNow();
    }, 5000);

    return () => clearTimeout(timer);
  }, [checkNow]);

  return {
    checking,
    updateAvailable,
    checkNow,
    modalState,
    dismissModal,
    confirmUpdate,
    dismissSuccess,
  };
}
