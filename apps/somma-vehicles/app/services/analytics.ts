import analytics from "@react-native-firebase/analytics";

import { isDemoMode } from "./demo";

/**
 * Camada de Google Analytics (GA4 via Firebase).
 *
 * Regras:
 * - Em modo demo (conta `tester2526`) NADA é enviado — nem eventos customizados
 *   nem a coleta automática (screen_view, session_start...). Assim os dados de
 *   teste não poluem os relatórios reais.
 * - Toda chamada é "best-effort": falha de analytics nunca deve quebrar o app,
 *   então tudo roda dentro de try/catch silencioso.
 */

async function safeLog(fn: () => Promise<void>): Promise<void> {
  if (isDemoMode) return;
  try {
    await fn();
  } catch {}
}

export const analyticsService = {
  /**
   * Liga/desliga a coleta do Analytics no device. Chamado no login:
   * `false` para a conta demo, `true` para login real. A preferência é
   * persistida pelo próprio SDK entre aberturas do app.
   */
  setCollectionEnabled: async (enabled: boolean): Promise<void> => {
    try {
      await analytics().setAnalyticsCollectionEnabled(enabled);
    } catch {}
  },

  /** Login realizado com sucesso. Usa o evento reservado `login` do GA4. */
  logLoginSuccess: async (method = "email"): Promise<void> => {
    await safeLog(() => analytics().logLogin({ method }));
  },

  /** Tentativa de login que falhou (credenciais inválidas, erro de rede, etc.). */
  logLoginFailure: async (reason = "invalid_credentials"): Promise<void> => {
    await safeLog(() =>
      analytics().logEvent("login_failed", { method: "email", reason }),
    );
  },

  /**
   * Registra a visualização de uma tela (evento `screen_view` do GA4).
   * Em React Native isso NÃO é automático — precisa ser disparado a cada
   * navegação (ver `useScreenTracking`). `screenName` é o nome amigável.
   */
  logScreenView: async (screenName: string): Promise<void> => {
    await safeLog(() =>
      analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      }),
    );
  },
};
