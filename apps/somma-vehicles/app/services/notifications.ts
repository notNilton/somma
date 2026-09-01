import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import api from "./api";

export type RegisterPushTokenOptions = {
  /** Nº máximo de tentativas em erros transitórios. Default: 3. */
  maxRetries?: number;
  /** Quando true, suprime logs e não propaga erros — útil para refresh em background. */
  silent?: boolean;
};

export type RegisterPushTokenResult =
  | { ok: true; token: string; attempts: number }
  | {
      ok: false;
      reason:
        | "permission_denied"
        | "empty_token"
        | "client_error"
        | "network_error"
        | "server_error";
      attempts: number;
      status?: number;
      message?: string;
    };

const DELAY_BETWEEN_ATTEMPTS_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Registra o Expo Push Token no backend PayBuy.
 *
 * Robustez:
 * - Não aborta em `Device.isDevice === false` (simulador/Expo Go): deixa `getExpoPushTokenAsync`
 *   da SDK decidir, que em desenvolvimento retorna um token determinístico.
 * - Retry automático em erros de rede/5xx (3 tentativas com backoff fixo).
 * - Erros 4xx do servidor (ex.: 401, 422) não são retentados — não adianta repetir.
 * - Permissão negada é terminal e retornada via `result.reason = "permission_denied"`.
 * - Logs preservados por padrão; pode passar `{ silent: true }` em refresh de token.
 */
export async function registerPushToken(
  options: RegisterPushTokenOptions = {},
): Promise<RegisterPushTokenResult> {
  const { maxRetries = 3, silent = false } = options;
  const log = silent ? () => {} : console.log;
  const logWarn = silent ? () => {} : console.warn;

  log("[PushToken] registerPushToken iniciado (maxRetries=" + maxRetries + ")");

  const { status: existing } = await Notifications.getPermissionsAsync();
  log("[PushToken] permissao existente:", existing);
  const finalStatus =
    existing === "granted"
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  log("[PushToken] permissao final:", finalStatus);

  if (finalStatus !== "granted") {
    log("[PushToken] permissao negada, abortando");
    return { ok: false, reason: "permission_denied", attempts: 0 };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  let pushToken = "";
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    pushToken = token ?? "";
    log("[PushToken] token obtido:", pushToken?.substring(0, 30));
  } catch (err) {
    logWarn("[PushToken] falha ao obter expo push token:", err);
    return {
      ok: false,
      reason: "empty_token",
      attempts: 0,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  if (!pushToken) {
    logWarn("[PushToken] token vazio, sem nada para enviar");
    return { ok: false, reason: "empty_token", attempts: 0 };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`[PushToken] POST /api/app/salvar-token (attempt ${attempt}/${maxRetries})`);
      const response = await api.post("/api/app/salvar-token", {
        push_token: pushToken,
      });
      log("[PushToken] resposta da API:", response.status, response.data);
      return { ok: true, token: pushToken, attempts: attempt };
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.message ?? err?.message ?? "unknown error";
      logWarn(
        `[PushToken] tentativa ${attempt}/${maxRetries} falhou (status=${status ?? "sem status"}):`,
        message,
      );

      // 4xx: não adianta repetir, é erro do cliente ou auth
      if (status && status >= 400 && status < 500) {
        return {
          ok: false,
          reason: "client_error",
          attempts: attempt,
          status,
          message,
        };
      }

      // Última tentativa, retorna erro
      if (attempt >= maxRetries) {
        return {
          ok: false,
          reason: status && status >= 500 ? "server_error" : "network_error",
          attempts: attempt,
          status,
          message,
        };
      }

      // Espera antes da próxima tentativa
      await sleep(DELAY_BETWEEN_ATTEMPTS_MS);
    }
  }

  // Nunca chega aqui, mas para satisfazer o TypeScript
  return { ok: false, reason: "network_error", attempts: maxRetries };
}

/**
 * Remove o Expo Push Token do backend quando o usuário desinstala, troca conta
 * ou faz logout. Erros são silenciosos — não bloqueiam logout.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete("/api/app/salvar-token");
  } catch (err) {
    console.warn("[PushToken] falha ao remover token (continuando):", err);
  }
}

export interface SaleNotificationPayload {
  /** Valor da venda em centavos */
  amount?: number;
  /** Canal de venda (ex: "Site", "Instagram") */
  channel?: string;
  /** Nome do cliente que realizou a compra */
  customerName?: string;
  /** Forma de pagamento (ex: "Cartão de crédito", "Pix", "Boleto") */
  paymentMethod?: string;
  /** Identificador do pedido */
  orderId?: string;
}

/**
 * Constrói o corpo da notificação com todos os detalhes da venda disponíveis.
 */
function buildSaleBody(payload: SaleNotificationPayload): string {
  const lines: string[] = [];

  const formattedAmount = payload.amount
    ? (payload.amount / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : null;

  if (formattedAmount) {
    lines.push(`Valor: ${formattedAmount}`);
  }
  if (payload.customerName) {
    lines.push(`Cliente: ${payload.customerName}`);
  }
  if (payload.channel) {
    lines.push(`Canal: ${payload.channel}`);
  }
  if (payload.paymentMethod) {
    lines.push(`Pagamento: ${payload.paymentMethod}`);
  }
  if (payload.orderId) {
    lines.push(`Pedido: #${payload.orderId}`);
  }

  return lines.length > 0 ? lines.join("\n") : "Nova venda registrada!";
}

/**
 * Dispara uma notificação local com todos os detalhes da venda.
 *
 * 1. Verifica se a permissão de push está concedida.
 * 2. Se não estiver, tenta solicitar permissão.
 * 3. Se concedida, exibe a notificação com valor, cliente, canal,
 *    forma de pagamento e ID do pedido (conforme disponíveis).
 *
 * @returns `true` se a notificação foi exibida, `false` caso contrário.
 */
export async function notifyNewSale(
  payload?: SaleNotificationPayload,
): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === "granted"
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") return false;

  const body = payload ? buildSaleBody(payload) : "Nova venda registrada!";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💰 Nova venda",
      body,
      data: { screen: "/home" },
      sound: true,
    },
    trigger: null, // dispara imediatamente
  });

  return true;
}
