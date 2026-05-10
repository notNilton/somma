import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Lock, Loader2, Mail, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post<{ sessionToken: string }>(
        "/api/auth/login",
        { email, password },
      );
      navigate({ to: "/" });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full min-h-[100dvh] overflow-hidden transactions-bg-starfield transactions-starfield text-foreground">
      <div className="absolute inset-0 bg-background/35" />
      <div className="relative flex h-full min-h-[100dvh] items-center justify-center px-4 py-4">
        <div className="w-full max-w-sm">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-none border border-primary-foreground/20 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Faça login para continuar
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="card-premium flex flex-col gap-3 rounded-2xl border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(242,246,250,0.86))] p-4 shadow-sm sm:rounded-none sm:p-5"
          >
            <div className="flex flex-col gap-1">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white/55 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-white/55 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="transactions-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-opacity disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="pt-1 text-center text-xs text-muted-foreground">
              Não tem conta?{" "}
              <Link to="/auth/register" className="font-semibold text-primary">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
