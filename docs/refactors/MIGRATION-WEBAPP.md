# Guia de Migração: Qualquer Frontend → TanStack (para LLMs)

Este documento instrui uma LLM a migrar um frontend backoffice/webapp para a stack TanStack
exatamente como está implementado no Personalledger. Siga a ordem das seções.

---

## Stack de destino

| Origem (qualquer)         | Destino                                        |
| ------------------------- | ---------------------------------------------- |
| React Router / Next.js    | `@tanstack/react-router` (file-based)          |
| Axios / fetch manual      | `@tanstack/react-query` + `src/lib/api.ts`     |
| Redux / Zustand / Context | TanStack Query como estado de servidor          |
| CSS Modules / Styled      | Tailwind CSS v4 + shadcn/ui                    |
| class-validator           | `zod` para validação de formulários            |
| Qualquer bundler          | Vite 7 + `@tanstack/react-start`               |
| Ícones variados           | `lucide-react`                                 |

**package.json — dependências principais:**

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5",
    "@tanstack/react-router": "latest",
    "@tanstack/react-start": "latest",
    "@tanstack/router-plugin": "latest",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "tailwind-merge": "^3",
    "class-variance-authority": "^0.7",
    "lucide-react": "latest",
    "clsx": "^2",
    "zod": "^4",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "vite": "^7",
    "@vitejs/plugin-react": "^5",
    "vite-tsconfig-paths": "^5",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

---

## Estrutura de pastas

```
apps/webapp/
├── public/
├── src/
│   ├── components/          ← componentes reutilizáveis
│   │   └── ui/              ← primitivos shadcn/ui (Button, Card, etc.)
│   ├── lib/
│   │   ├── api.ts           ← cliente HTTP centralizado
│   │   ├── auth.ts          ← token JWT no localStorage
│   │   └── utils.ts         ← cn() helper para Tailwind
│   ├── routes/
│   │   ├── __root.tsx       ← layout raiz + auth guard + providers
│   │   ├── index.tsx        ← rota "/"
│   │   ├── login.tsx        ← rota "/login"
│   │   ├── register.tsx     ← rota "/register"
│   │   ├── accounts.tsx     ← layout de "/accounts"
│   │   ├── accounts/
│   │   │   ├── index.tsx    ← página "/accounts/"
│   │   │   └── crud-accounts.tsx ← modal/page de CRUD
│   │   └── ...              ← um arquivo/pasta por módulo
│   ├── routeTree.gen.ts     ← GERADO AUTOMATICAMENTE — não editar
│   ├── router.tsx           ← setup do router + QueryClient
│   └── styles.css           ← Tailwind + variáveis CSS
├── nginx.conf
├── vite.config.ts
├── tsconfig.json
├── package.json
└── package-lock.json
```

---

## Padrões obrigatórios

### 1. Cliente HTTP — `src/lib/api.ts`

Único ponto de acesso à API. Injeta JWT automaticamente. Redireciona para `/login` no 401.

```typescript
import { auth } from './auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth.getToken();
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) auth.logout();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: 'DELETE' }),
  postForm: async <T>(path: string, form: FormData) => {
    const token = auth.getToken();
    const res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      if (res.status === 401) auth.logout();
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },
};
```

### 2. Auth — `src/lib/auth.ts`

```typescript
const TOKEN_KEY = 'personalledger_token';

export const auth = {
  getToken: ()             => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  logout:   ()             => { localStorage.removeItem(TOKEN_KEY); window.location.href = '/login'; },
  isAuthenticated: ()      => !!localStorage.getItem(TOKEN_KEY),
};
```

### 3. Router setup — `src/router.tsx`

```typescript
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30s
        retry: 1,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

### 4. Layout raiz — `src/routes/__root.tsx`

Auth guard, providers e layout global ficam aqui.

```typescript
import {
  HeadContent, Scripts, Outlet, useLocation,
  createRootRouteWithContext, redirect,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { auth } from '../lib/auth';
import appCss from '../styles.css?url';

// Script inline para evitar flash de tema errado no carregamento
const THEME_INIT_SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem('theme');
    var mode = (stored==='light'||stored==='dark'||stored==='auto') ? stored : 'auto';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = mode==='auto' ? (prefersDark?'dark':'light') : mode;
    document.documentElement.classList.add(resolved);
  } catch(e) {}
})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (typeof window === 'undefined') return; // SSR safety

    const isPublic = ['/login', '/register'].includes(location.pathname);
    const isAuthenticated = auth.isAuthenticated();

    if (!isAuthenticated && !isPublic) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    if (isAuthenticated && location.pathname === '/login') {
      throw redirect({ to: '/' });
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'App' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootDocument,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold">Página não encontrada</h2>
      <a href="/" className="text-primary hover:underline">Voltar para o início</a>
    </div>
  ),
});

function RootDocument() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <QueryClientProvider client={queryClient}>
          {!isAuthPage && <Header />}
          <main className="flex-1">
            <Outlet />
          </main>
          {!isAuthPage && <Footer />}
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### 5. Rota de página — padrão

Cada arquivo em `src/routes/` exporta `Route` com `createFileRoute`.

```typescript
// src/routes/accounts/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '#/lib/api';

export const Route = createFileRoute('/accounts/')({
  component: AccountsPage,
});

interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET' | 'INVESTMENT';
  balance: number;
}

function AccountsPage() {
  const queryClient = useQueryClient();

  // Leitura com useQuery
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts'),
  });

  // Mutação com invalidação automática
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      {accounts.map(account => (
        <div key={account.id}>
          <span>{account.name}</span>
          <button onClick={() => deleteMutation.mutate(account.id)}>Deletar</button>
        </div>
      ))}
    </div>
  );
}
```

### 6. Rota de layout (nested) — padrão

Para criar sub-rotas que compartilham layout:

```typescript
// src/routes/accounts.tsx  ← layout pai
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/accounts')({
  component: () => (
    <div>
      {/* Layout compartilhado por /accounts/ e /accounts/$id */}
      <Outlet />
    </div>
  ),
});

// src/routes/accounts/index.tsx  ← /accounts/
// src/routes/accounts/$id.tsx    ← /accounts/:id  (parâmetro dinâmico)
// src/routes/accounts/crud-accounts.tsx ← /accounts/crud-accounts
```

### 7. Navegação programática

```typescript
import { useNavigate, Link } from '@tanstack/react-router';

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate({ to: '/accounts' });
    // Com parâmetro: navigate({ to: '/accounts/$id', params: { id: '123' } });
  };

  return (
    <>
      <Link to="/accounts">Contas</Link>
      <button onClick={handleClick}>Ir para contas</button>
    </>
  );
}
```

### 8. Parâmetro de rota dinâmico

```typescript
// src/routes/accounts/$id.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/accounts/$id')({
  component: AccountDetail,
});

function AccountDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => api.get(`/accounts/${id}`),
  });
  // ...
}
```

### 9. Utilitário Tailwind — `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Vite config — `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: { port: 3400 },
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
```

---

## tsconfig.json

```json
{
  "include": ["**/*.ts", "**/*.tsx"],
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "baseUrl": ".",
    "paths": {
      "#/*": ["./src/*"],
      "@/*": ["./src/*"]
    },
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

---

## Regras obrigatórias

| Regra | Detalhe |
|---|---|
| `routeTree.gen.ts` | Nunca editar — gerado pelo `@tanstack/router-plugin` ao rodar `vite` |
| Nomes de arquivos de rota | Underscore duplo `__root.tsx` para especiais; hífen `-` para excluir da árvore |
| Auth guard | Sempre em `__root.tsx` → `beforeLoad` — nunca em cada página |
| Token | `localStorage` via `auth.ts` — nunca manipular diretamente fora do módulo |
| Query keys | Array com hierarquia: `['accounts']`, `['accounts', id]`, `['accounts', 'credit-summary']` |
| Invalidação | Sempre via `queryClient.invalidateQueries({ queryKey: [...] })` no `onSuccess` |
| Erro 401 | Tratado centralmente no `api.ts` → `auth.logout()` automático |
| Estado de formulário | `useState` local — TanStack Query é só para estado de servidor |
| Rotas públicas | Hardcoded em `__root.tsx`: `['/login', '/register']` |
| Imports | Usar alias `#/` → `src/` (configurado no tsconfig paths) |

---

## Ordem de implementação

1. `package.json` + `package-lock.json` → `npm install`
2. `vite.config.ts`
3. `tsconfig.json`
4. `src/styles.css` — Tailwind import + variáveis CSS (dark/light mode)
5. `src/lib/utils.ts` — helper `cn()`
6. `src/lib/auth.ts` — token management
7. `src/lib/api.ts` — cliente HTTP
8. `src/router.tsx` — QueryClient + createRouter
9. `src/routes/__root.tsx` — layout raiz + auth guard
10. `src/routes/login.tsx` + `src/routes/register.tsx` — rotas públicas
11. `src/routes/index.tsx` — dashboard (rota `/`)
12. Um módulo por vez: `accounts`, `transactions`, `vehicles`, etc.
    - Criar `src/routes/modulo.tsx` (layout pai, se necessário)
    - Criar `src/routes/modulo/index.tsx` (lista)
    - Criar `src/routes/modulo/crud-modulo.tsx` (formulário/modal)
13. `src/components/` — Header, Footer, componentes compartilhados
14. `src/components/ui/` — primitivos shadcn/ui conforme necessário

---

## Arquivos de rota — prefixos especiais

| Prefixo/Padrão | Significado |
|---|---|
| `__root.tsx` | Layout raiz obrigatório |
| `$param.tsx` | Parâmetro dinâmico (ex: `$id`) |
| `-arquivo.tsx` | Excluído da árvore de rotas (arquivo auxiliar) |
| `_layout.tsx` | Layout sem segmento na URL |
| `modulo/index.tsx` | Rota index do segmento (ex: `/modulo/`) |

---

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:3000
VITE_APP_VERSION=dev
```

Acessar em código: `import.meta.env.VITE_API_URL`

Injetado no Docker via `--build-arg`:
```dockerfile
ARG VITE_API_URL
ARG VITE_APP_VERSION
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION
```
