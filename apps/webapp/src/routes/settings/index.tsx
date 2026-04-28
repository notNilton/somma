import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
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
        description="Perfil e saída da sessão."
      />

      <div className="card-premium overflow-hidden p-4 sm:p-5 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
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
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/5 transition-smooth"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </SettingsShell>
  );
}
