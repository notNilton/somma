import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { authService } from "@/services/auth";
import { setOnForceLogout, setOnTokenRefreshed } from "@/services/api";
import { enableDemoMode, disableDemoMode, isDemoMode, DEMO_USER } from "@/services/demo";
import { registerPushToken, unregisterPushToken } from "@/services/notifications";
import type { User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_BUFFER_MS = 60_000; // refresh 60s before expiry
const REFRESH_RETRY_MS = 30_000; // retry refresh after 30s on failure

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function execRefreshAndReschedule() {
    try {
      await authService.refresh();
      const newExpiresAt = await authService.getTokenExpiresAt();
      if (newExpiresAt) scheduleTokenRefresh(newExpiresAt);
    } catch {
      scheduleRetryRefresh();
    }
  }

  /**
   * Schedule a preemptive token refresh before the token expires.
   * `expiresAtMs` should be a real token expiry timestamp.
   * For retries, use `scheduleRetryRefresh` instead.
   */
  function scheduleTokenRefresh(expiresAtMs: number) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(0, expiresAtMs - Date.now() - REFRESH_BUFFER_MS);
    refreshTimerRef.current = setTimeout(execRefreshAndReschedule, delay);
  }

  function scheduleRetryRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(execRefreshAndReschedule, REFRESH_RETRY_MS);
  }

  // Register force-logout callback so api.ts can clear auth state
  useEffect(() => {
    setOnForceLogout(() => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      setUser(null);
    });
    return () => setOnForceLogout(null);
  }, []);

  // Listener disparado quando o api interceptor refresca o JWT em background.
  // Aproveitamos para re-registrar o push token em modo silencioso — assim o
  // backend mantém o Expo token atualizado mesmo se o app ficou aberto dias.
  useEffect(() => {
    setOnTokenRefreshed((expiresAtMs: number) => {
      scheduleTokenRefresh(expiresAtMs);
      registerPushToken({ silent: true, maxRetries: 1 }).catch(() => {});
    });
    return () => setOnTokenRefreshed(null);
  }, []);

  useEffect(() => {
    authService.isAuthenticated().then(async (authenticated) => {
      if (authenticated) {
        try {
          const expiresAt = await authService.getTokenExpiresAt();

          // refresh if about to expire
          if (expiresAt && expiresAt - Date.now() < REFRESH_BUFFER_MS) {
            await authService.refresh();
            const newExpiresAt = await authService.getTokenExpiresAt();
            if (newExpiresAt) scheduleTokenRefresh(newExpiresAt);
          } else if (expiresAt) {
            scheduleTokenRefresh(expiresAt);
          }

          const me = await authService.getMe();
          setUser(me);
          // Sincroniza o push token em background para garantir que o backend o tem
          registerPushToken({ silent: true, maxRetries: 2 }).catch(() => {});
        } catch {
          // getMe/renew failed — try to restore from cached user as fallback
          const cached = await authService.getCachedUser();
          if (cached) {
            setUser(cached);
          }
        }
      }
      setIsLoading(false);
    });

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authService.login({ email, password });
    setUser(user);
    // Registra o push token logo após o login: fundamental para que as
    // notificações de novas vendas cheguem ao usuário. Falha aqui é logada
    // mas não bloqueia o login — o app segue funcionando, apenas sem push.
    registerPushToken({ silent: false, maxRetries: 3 }).catch((e) => {
      console.warn("registerPushToken após login:", e);
    });
    const expiresAt = await authService.getTokenExpiresAt();
    if (expiresAt) scheduleTokenRefresh(expiresAt);
  }, []);

  const demoLogin = useCallback(() => {
    enableDemoMode();
    setUser(DEMO_USER);
  }, []);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const wasDemo = isDemoMode;
    disableDemoMode();
    try {
      if (!wasDemo) {
        // O `unregisterPushToken` é silencioso (não lança) e tem timeout interno,
        // então não trava o logout caso o backend esteja lento. A ordem importa:
        // o DELETE precisa do JWT válido no SecureStore, então `unregister` ANTES
        // de `authService.logout()`.
        const unregisterPromise = unregisterPushToken();
        const unregisterTimeout = new Promise<void>((resolve) =>
          setTimeout(resolve, 3000),
        );
        await Promise.race([unregisterPromise, unregisterTimeout]);
        await authService.logout();
      }
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, demoLogin, logout }),
    [user, isLoading, login, demoLogin, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
