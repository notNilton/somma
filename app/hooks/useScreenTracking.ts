import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";

import { analyticsService } from "@/services/analytics";

/**
 * Mapa de rota (pathname do expo-router) → nome amigável exibido no GA4.
 * Rotas não mapeadas caem no fallback de `friendlyName`.
 */
const SCREEN_NAMES: Record<string, string> = {
  "/": "Início",
  "/login": "Login",
  "/login/login": "Login",
  "/home": "Início",
  "/sales": "Vendas",
  "/sales-success": "Venda - Sucesso",
  "/wallet": "Carteira",
  "/wallet-history": "Carteira - Histórico",
  "/profile": "Perfil",
  "/withdrawal": "Saque",
  "/withdrawal-success": "Saque - Sucesso",
  "/advance": "Antecipação",
  "/advance-success": "Antecipação - Sucesso",
  "/metrics": "Métricas",
  "/notifications": "Notificações",
  "/releases-history": "Histórico de Liberações",
  "/modal": "Modal",
};

/**
 * Converte um pathname em nome de tela legível. Se não estiver mapeado,
 * gera um nome a partir do último segmento (ex.: "/algo-novo" → "Algo Novo").
 */
export function friendlyName(pathname: string): string {
  const mapped = SCREEN_NAMES[pathname];
  if (mapped) return mapped;

  const segment = pathname.split("/").filter(Boolean).pop() ?? "Início";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Dispara o evento `screen_view` do GA4 a cada mudança de rota. Deve ser
 * chamado uma única vez, no layout raiz. Em modo demo o envio é ignorado
 * dentro do próprio `analyticsService`.
 */
export function useScreenTracking() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    analyticsService.logScreenView(friendlyName(pathname));
  }, [pathname]);
}
