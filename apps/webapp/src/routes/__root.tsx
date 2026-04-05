import {
  createRootRouteWithContext,
  redirect,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { PrivacyProvider } from '../lib/privacy';
import { auth } from '../lib/auth';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    const isPublic = location.pathname.startsWith('/auth');
    const isAuthenticated = auth.isAuthenticated();

    if (!isAuthenticated && !isPublic) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.href },
      });
    }

    if (isAuthenticated && isPublic) {
      throw redirect({ to: '/' });
    }
  },
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <p className="text-muted-foreground">Ops! O caminho que você tentou acessar não existe.</p>
      <a href="/" className="text-primary font-bold hover:underline">
        Voltar para o início
      </a>
    </div>
  ),
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const { queryClient } = Route.useRouteContext();
  const isAuthPage = location.pathname.startsWith('/auth');

  return (
    <div className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)] min-h-screen flex flex-col">
      <QueryClientProvider client={queryClient}>
        <PrivacyProvider>
          {!isAuthPage && <Header />}
          <main className="flex flex-1 flex-col pb-16 sm:pb-0">
            <Outlet />
          </main>
          {!isAuthPage && <Footer />}
          {!isAuthPage && <BottomNav />}
        </PrivacyProvider>
      </QueryClientProvider>
    </div>
  );
}
