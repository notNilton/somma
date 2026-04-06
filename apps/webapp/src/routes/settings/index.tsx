import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { User, Shield, ChevronRight, LogOut, CarFront, Fuel, type LucideIcon } from 'lucide-react';
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

function SettingItem({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-smooth cursor-pointer group"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-muted/50 text-muted-foreground border border-border/50 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-smooth">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="font-bold text-xs">{title}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-smooth shrink-0" />
    </Link>
  );
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
        title="Configuracoes"
        description="Gerencie seu perfil, preferencias e dados da conta."
      />

      <div className="card-premium overflow-hidden divide-y divide-border">
        {/* Perfil */}
        {isLoading ? (
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-2.5 w-36 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
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
            <div className="flex items-center gap-3">
              <Link
                to="/settings/personal-info"
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
              >
                Editar
              </Link>
              <button
                onClick={() => auth.logout()}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline transition-smooth"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </button>
            </div>
          </div>
        ) : null}

        {/* Items */}
        <SettingItem
          icon={User}
          to="/settings/personal-info"
          title="Informações Pessoais"
          description="Nome, email e foto de perfil."
        />
        <SettingItem
          icon={Shield}
          to="/settings/data-privacy"
          title="Privacidade e Dados"
          description="Controle de dados e configurações de privacidade."
        />
        <SettingItem
          icon={CarFront}
          to="/settings/vehicles"
          title="Gerenciar Veículos"
          description="Cadastre veículos e acompanhe o consumo."
        />
        <SettingItem
          icon={Fuel}
          to="/wallet/vehicles"
          title="Resumos de Veículos"
          description="Abastecimentos e manutenções."
        />
      </div>
    </SettingsShell>
  );
}
