import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    cpf: "",
    cnpj: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post<{ sessionToken: string }>(
        "/api/auth/register",
        formData,
      );
      navigate({ to: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen transactions-bg-starfield transactions-starfield flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-none bg-primary text-primary-foreground mb-3 shadow-lg shadow-primary/20 border border-primary-foreground/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight uppercase">
            Criar sua conta
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-bold uppercase tracking-widest">
            Comece a gerenciar suas finanças hoje.
          </p>
        </div>

        <div className="card-premium p-6 flex flex-col gap-4 rounded-none border-slate-300/80">
          <form
            onSubmit={handleRegister}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="name"
                  required
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                CPF
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2 bg-white/50 border border-border rounded-none focus:ring-0 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="sm:col-span-2 p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] uppercase font-bold tracking-wider animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="sm:col-span-2 mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-none transactions-primary font-bold transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs">
                    Criar Conta
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground mt-2">
            Já tem uma conta?{" "}
            <Link to="/auth/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
