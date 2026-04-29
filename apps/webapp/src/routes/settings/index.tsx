import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CarFront, ChevronRight, LogOut, Tag } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import SettingsShell from '../../components/SettingsShell';
import SectionPageHeader from '../../components/SectionPageHeader';
import { api } from '../../lib/api';
import { auth } from '../../lib/auth';

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
});

interface UserProfile {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return (email?.[0] ?? 'U').toUpperCase();
}

function SettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => api.get<UserProfile>('/api/v1/settings/profile'),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <SettingsShell>
      <SectionPageHeader
        title="Config"
        description="Perfil, saída da sessão e atalhos de organização."
      />

      <div className="settings-panel flex flex-col gap-4 overflow-hidden p-4 sm:p-5">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 bg-muted animate-pulse" />
              <div className="h-2.5 w-40 bg-muted animate-pulse" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(profile.name, profile.email)
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{profile.name ?? 'Usuário'}</p>
                  <p className="text-[10px] text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => auth.logout()}
                className="inline-flex w-full items-center justify-center gap-2 border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest text-rose-500 transition-smooth hover:bg-rose-500/5 sm:w-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Link
                to="/settings/vehicles"
                className="settings-card group flex items-center justify-between gap-3 border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(242,246,250,0.84))] px-4 py-4 transition-smooth hover:border-primary/40 sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="settings-card-icon flex h-11 w-11 shrink-0 items-center justify-center border border-slate-300/80 bg-white/80 text-slate-700">
                    <CarFront className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                      Frota
                    </p>
                    <h2 className="mt-1 text-sm font-bold text-slate-900">Gerenciar carros</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cadastre, edite e acompanhe seus veículos.
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                to="/settings/categories"
                className="settings-card group flex items-center justify-between gap-3 border border-slate-300/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(242,246,250,0.84))] px-4 py-4 transition-smooth hover:border-primary/40 sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="settings-card-icon flex h-11 w-11 shrink-0 items-center justify-center border border-slate-300/80 bg-white/80 text-slate-700">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                      Categorias
                    </p>
                    <h2 className="mt-1 text-sm font-bold text-slate-900">Gerenciar categorias</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Organize receitas e despesas com mais clareza.
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </SettingsShell>
  );
}
