import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lock, Eye, EyeOff, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { auth } from '../../lib/auth';

export const Route = createFileRoute('/settings/data-privacy')({
  component: DataPrivacyPage,
});

interface UserProfile {
  id: string;
  privacyModeEnabled?: boolean;
}

function DataPrivacyPage() {
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => api.get<UserProfile>('/api/v1/settings/profile'),
    staleTime: 1000 * 60 * 5,
  });

  // Toggle privacy mode
  const privacyMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      api.patch<UserProfile>('/api/v1/settings/profile', { privacyModeEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
    },
  });

  // Change password
  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/api/v1/settings/change-password', data),
    onSuccess: () => {
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 4000);
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
    },
  });

  // Delete account
  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/api/v1/settings/account'),
    onSuccess: () => {
      auth.logout();
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const isPrivacyOn = profile?.privacyModeEnabled ?? false;

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-4">
        <Link
          to="/settings"
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-smooth"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Privacidade e Dados</h1>
          <p className="text-muted-foreground text-sm">
            Controle como seus dados são tratados e protegidos.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Segurança */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4">
            Segurança
          </h3>
          <div className="card-premium divide-y divide-border overflow-hidden">
            {/* Alterar Senha */}
            <div>
              <button
                onClick={() => setShowPasswordForm((prev) => !prev)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-smooth cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-tight">Alterar Senha</p>
                    <p className="text-xs text-muted-foreground">
                      Mantenha sua conta protegida com uma senha forte.
                    </p>
                  </div>
                </div>
                <ChevronLeft
                  className={`w-4 h-4 text-muted-foreground transition-smooth ${showPasswordForm ? '-rotate-90' : 'rotate-180'}`}
                />
              </button>

              {showPasswordForm && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="px-4 pb-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200"
                >
                  <input
                    type="password"
                    required
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {passwordError && (
                    <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={passwordMutation.isPending}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                  >
                    {passwordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirmar alteração'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Modo Visibilidade */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  {isPrivacyOn ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight">Modo Privacidade</p>
                  <p className="text-xs text-muted-foreground">
                    Ocultar valores por padrão ao iniciar o app.
                  </p>
                </div>
              </div>
              <button
                onClick={() => privacyMutation.mutate(!isPrivacyOn)}
                disabled={privacyMutation.isPending}
                className={`w-10 h-5 rounded-full relative transition-smooth ${isPrivacyOn ? 'bg-primary' : 'bg-muted-foreground/30'} disabled:opacity-50`}
              >
                <div
                  className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-smooth ${isPrivacyOn ? 'right-1' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          {passwordSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Senha alterada com sucesso!
            </div>
          )}
        </div>

        {/* Zona de Risco */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 px-4">
            Zona de Risco
          </h3>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="card-premium border-rose-500/20 bg-rose-500/5 p-4 flex items-center justify-between group cursor-pointer hover:bg-rose-500/10 transition-smooth w-full text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-smooth">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm tracking-tight text-rose-500">
                    Excluir todos os dados
                  </p>
                  <p className="text-xs text-rose-500/70">Esta ação é irreversível.</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="card-premium border-rose-500/30 bg-rose-500/5 p-6 flex flex-col gap-4 animate-in fade-in">
              <p className="text-sm text-rose-600 font-bold">
                Tem certeza? Todos os seus dados (transações, metas, orçamentos) serão excluídos
                permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-60"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Sim, excluir tudo'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
