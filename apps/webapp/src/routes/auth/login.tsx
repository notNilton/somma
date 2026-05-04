import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ArrowRight, Mail, Lock, Loader2 } from "lucide-react";
import { auth } from "../../lib/auth";
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
      const { accessToken } = await api.post<{ accessToken: string }>(
        "/api/auth/login",
        { email, password },
      );
      auth.setToken(accessToken);

      // Pequeno delay para feedback visual
      setTimeout(() => {
        navigate({ to: "/" });
      }, 500);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro inesperado.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen transactions-bg-starfield transactions-starfield flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-none bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/20 border border-primary-foreground/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight uppercase">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase tracking-widest">
            Acesse sua conta PersonalLedger.
          </p>
        </div>

        <div className="card-premium p-6 flex flex-col gap-5 rounded-none border-slate-300/80">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] uppercase font-bold tracking-wider animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-none transactions-primary font-bold transition-all group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">
                    Entrar
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-[1px] bg-border" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">
              ou
            </span>
            <div className="flex-1 h-[1px] bg-border" />
          </div>

          <p className="text-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">
              Crie uma agora
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
