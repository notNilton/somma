import { createContext, useContext, useMemo } from "react";

import type { CheckUpdateResult } from "@/hooks/useCheckForUpdates";

interface UpdateContextValue {
  updateAvailable: boolean;
  checking: boolean;
  checkNow: () => Promise<CheckUpdateResult>;
}

const defaultCheckNow = async (): Promise<CheckUpdateResult> => ({ found: false });

const UpdateContext = createContext<UpdateContextValue>({
  updateAvailable: false,
  checking: false,
  checkNow: defaultCheckNow,
});

export function UpdateProvider({
  updateAvailable,
  checking,
  checkNow,
  children,
}: Readonly<{
  updateAvailable: boolean;
  checking: boolean;
  checkNow: () => Promise<CheckUpdateResult>;
  children: React.ReactNode;
}>) {
  const value = useMemo(
    () => ({ updateAvailable, checking, checkNow }),
    [updateAvailable, checking, checkNow],
  );
  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useUpdateContext(): UpdateContextValue {
  return useContext(UpdateContext);
}

export function useUpdateAvailable(): boolean {
  return useContext(UpdateContext).updateAvailable;
}
