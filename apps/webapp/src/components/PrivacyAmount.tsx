import type { ReactNode } from "react";
import { usePrivacy } from "../lib/privacy";
import { cn } from "../lib/utils";

type PrivacyAmountProps = {
  value: number;
  showSign?: boolean;
  className?: string;
  /**
   * Caso o usuário queira renderizar um conteúdo customizado.
   * (mantido para compatibilidade com usos que passam `value` como ReactNode em alguns lugares)
   */
  children?: ReactNode;
};

export default function PrivacyAmount({
  value,
  showSign,
  className,
}: PrivacyAmountProps) {
  const { privacyMode } = usePrivacy();
  const num = Number(value);
  const abs = Math.abs(num);
  const signPrefix = showSign ? (num < 0 ? "-" : "+") : num < 0 ? "-" : "";

  const formatted = abs.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <span
      className={cn(
        className,
        privacyMode && "blur-[6px] select-none pointer-events-none",
      )}
    >
      {`${signPrefix}${formatted}`}
    </span>
  );
}
