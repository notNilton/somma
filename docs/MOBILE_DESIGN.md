# Mobile UX Design — BudgetWise

Guia de implementação para tornar o app plenamente utilizável em dispositivos móveis.
O foco é experiência nativa: navegação por polegar, touch targets adequados e layouts que fazem sentido em tela pequena.

---

## Diagnóstico atual

| Problema                            | Onde está                                     | Impacto                                         |
| ----------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| **Navegação inacessível no mobile** | `Header.tsx` — links com `hidden sm:flex`     | Crítico: usuário não consegue trocar de tela    |
| **Header pesado em tela pequena**   | Logo + 4 ícones de ação empilhados            | Consome espaço vertical desnecessário           |
| **Nenhum FAB**                      | Telas de lista (`/transactions`, `/accounts`) | Ação primária escondida no topo da tela         |
| **Grids de formulário**             | `crud-accounts`, `crud-transactions`          | Já usam `grid-cols-1 md:grid-cols-3` — OK       |
| **Linhas de lista**                 | Rows de transações e contas                   | Touch target pode ser insuficiente              |
| **Sem safe area**                   | Footer e bottom nav futuros                   | Conteúdo fica atrás do home indicator do iPhone |

---

## 1. Bottom Navigation Bar (prioridade máxima)

### Por que é crítico

O `Header.tsx` usa `hidden sm:flex` nos links de navegação — no mobile eles simplesmente somem. Não existe atualmente nenhum mecanismo de navegação em telas menores que `sm` (640px).

### Estrutura proposta

No mobile: header minimalista (só logo + ações de conta) + barra de navegação fixa na parte inferior.
No desktop: layout atual sem mudanças.

```
┌─────────────────────────────┐
│  BudgetWise        👁 🌙 👤 │  ← Header: só logo + ações utilitárias
├─────────────────────────────┤
│                             │
│         Conteúdo            │
│                             │
│                             │
│                        ➕   │  ← FAB (ação primária da tela)
├─────────────────────────────┤
│ 🏠  💳  👛  🚗  ⚙️         │  ← Bottom Nav (mobile only)
└─────────────────────────────┘
```

### Implementação — `BottomNav.tsx`

Criar `apps/webapp/src/components/BottomNav.tsx`:

```tsx
import { Link } from '@tanstack/react-router';
import { LayoutGrid, Activity, Wallet, Fuel, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutGrid, label: 'Panorama' },
  { to: '/transactions', icon: Activity, label: 'Transações' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/vehicles', icon: Fuel, label: 'Veículos' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
] as const;

export default function BottomNav() {
  return (
    <nav
      className="
      sm:hidden                          /* só aparece no mobile */
      fixed bottom-0 left-0 right-0 z-50
      border-t border-border
      bg-background/95 backdrop-blur-lg
      pb-safe                            /* safe area do iPhone (ver seção 5) */
    "
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="
              flex flex-1 flex-col items-center justify-center
              gap-0.5 py-2 min-h-[56px]
              text-muted-foreground text-[10px] font-medium
              transition-colors
            "
            activeProps={{
              className: 'text-primary',
            }}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

### Ajustes no `__root.tsx`

```tsx
import BottomNav from '../components/BottomNav';

// Dentro de RootDocument():
{
  !isAuthPage && <Header />;
}
<main className="flex-1 pb-16 sm:pb-0">
  {' '}
  {/* padding para não sobrepor o BottomNav */}
  <Outlet />
</main>;
{
  !isAuthPage && <Footer />;
}
{
  !isAuthPage && <BottomNav />;
}
{
  /* adicionar após o Footer */
}
```

### Ajustes no `Header.tsx`

O link de Settings no header pode sair no mobile (vai para o BottomNav). Os links de navegação (`hidden sm:flex`) continuam como estão — funcionam no desktop normalmente.

```tsx
{
  /* Ícone de settings: só visível no desktop, pois no mobile está no BottomNav */
}
<Link to="/settings" className="hidden sm:flex p-2 rounded-xl ...">
  <User className="w-5 h-5" />
</Link>;
```

---

## 2. FAB — Floating Action Button

Nas telas de lista, o botão de criar nova entidade fica no header desktop mas no mobile deve ser um FAB fixo no canto inferior direito, acima do BottomNav.

### Implementação — `Fab.tsx`

Criar `apps/webapp/src/components/Fab.tsx`:

```tsx
import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
  label?: string;
}

export default function Fab({ onClick, label = 'Novo' }: FabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="
        sm:hidden                          /* só aparece no mobile */
        fixed bottom-20 right-4 z-40       /* acima do BottomNav (56px) + gap */
        flex items-center justify-center
        w-14 h-14 rounded-full
        bg-primary text-primary-foreground
        shadow-lg shadow-primary/30
        active:scale-95 transition-transform
      "
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
```

### Uso em `/transactions/index.tsx`

```tsx
import Fab from '../../components/Fab';

// No JSX, antes do fechamento do fragment:
<Fab
  label="Nova transação"
  onClick={() => void navigate({ to: '/transactions/crud-transactions' })}
/>;
```

Mesmo padrão para `/accounts/index.tsx`.

---

## 3. Touch targets mínimos

O padrão WCAG e as diretrizes da Apple/Google recomendam área de toque mínima de **48×48px**.

### Linhas de lista de transações

Garantir que cada row tenha `min-h-[48px]` e `py-3` para que o toque não precise ser preciso:

```tsx
// Rows da lista de transações
<div className="flex items-center gap-3 py-3 min-h-[48px] px-4 ...">
```

### Botões de ação em linha (editar, deletar)

Ícones de ação pequenos precisam de área de toque expandida:

```tsx
<button className="p-2.5 rounded-lg ...">
  {' '}
  {/* p-2.5 = 10px padding → área ~44px */}
  <Trash2 className="w-4 h-4" />
</button>
```

---

## 4. Formulários — `crud-accounts` e `crud-transactions`

Os grids já usam `grid-cols-1 md:grid-cols-3`, então o colapso para uma coluna no mobile já acontece. Os ajustes pendentes são:

### Header da página em mobile

O header de páginas de crud usa `flex items-center justify-between`. Em telas pequenas com título longo isso quebra. Solução: esconder o título no mobile e manter só o botão de voltar e o de salvar.

```tsx
<div className="flex items-center justify-between gap-3">
  <div className="flex items-center gap-3">
    <button onClick={goBack} className="p-2 rounded-xl ...">
      <ArrowLeft className="w-4 h-4" />
    </button>
    {/* Título: oculto em telas muito pequenas */}
    <h1 className="hidden xs:block text-xl font-bold">
      {isEditing ? 'Editar conta' : 'Nova conta'}
    </h1>
  </div>
  <div className="flex gap-2">
    <button className="hidden sm:flex ...">Cancelar</button>
    <button className="...">Salvar</button>
  </div>
</div>
```

### Inputs: tipo correto para mobile keyboard

Garantir que campos numéricos abram o teclado numérico no celular:

```tsx
<input type="number" inputMode="decimal" />  {/* valores monetários */}
<input type="number" inputMode="numeric"  />  {/* dias (closingDay, dueDay) */}
<input type="tel"    inputMode="numeric"  />  {/* CPF, CNPJ */}
```

---

## 5. Safe Area — iPhone com home indicator

iPhones sem botão físico têm uma área de 34px na parte inferior reservada para o home indicator. Conteúdo fixo (BottomNav, FAB) precisa respeitar essa área.

### Configurar no Tailwind

Adicionar ao `apps/webapp/src/styles.css`:

```css
@layer utilities {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .mb-safe {
    margin-bottom: env(safe-area-inset-bottom);
  }
}
```

Adicionar no `<head>` do `__root.tsx` (já existe, só confirmar):

```tsx
{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
```

> O `viewport-fit=cover` é o que ativa o `env(safe-area-inset-bottom)` no iOS.

---

## 6. Scroll e gestos

### Evitar bounce scroll horizontal

Em mobile, qualquer elemento com `overflow-x` mal configurado causa o scroll lateral indesejado:

```css
/* apps/webapp/src/styles.css */
body {
  overflow-x: hidden;
}
```

### Tabelas e listas horizontais

Tabelas de transações que têm muitas colunas devem ser envoltas em scroll horizontal contido:

```tsx
<div className="overflow-x-auto -mx-4 px-4">
  {' '}
  {/* negative margin trick */}
  <table className="min-w-[600px] w-full">...</table>
</div>
```

---

## 7. Ordem de implementação recomendada

| #   | O que implementar                     | Arquivo(s)                                                             |
| --- | ------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **BottomNav**                         | `components/BottomNav.tsx` + `__root.tsx`                              |
| 2   | **FAB**                               | `components/Fab.tsx` + `transactions/index.tsx` + `accounts/index.tsx` |
| 3   | **Safe area**                         | `styles.css` + `__root.tsx` (viewport-fit)                             |
| 4   | **inputMode nos formulários**         | `crud-accounts.tsx` + `crud-transactions.tsx`                          |
| 5   | **Touch targets nas listas**          | `transactions/index.tsx` + `accounts/index.tsx`                        |
| 6   | **Header settings: hidden no mobile** | `Header.tsx`                                                           |

---

_Documentação gerada em 2026-03-22 — projeto BudgetWise / nilByte_
