# Design System: Modais Premium

Este documento define os padrões visuais e comportamentais para os modais (janelas de diálogo) na plataforma Pagway. O objetivo é garantir consistência, acessibilidade e uma estética "premium" em todos os pontos de interação do usuário.

## 1. Estrutura Visual

### Container Principal

- **Background**: `bg-card` (geralmente branco ou cinza muito escuro no modo dark).
- **Borda**: `1px border-border`.
- **Raio de Borda (Border Radius)**: `3xl` (24px) para um visual moderno e suave.
- **Sombra**: `shadow-2xl` com um leve tom da cor primária para profundidade.
- **Overlay**: Fundo com `backdrop-blur-sm` e opacidade reduzida (`bg-background/40`).

### Cabeçalho

- **Título**: Fonte `font-bold` ou `font-black` (font-display), tamanho `text-xl`.
- **Subtítulo/Badge**: Texto em uppercase, `text-[10px]`, tracking espaçado, cor `text-muted-foreground`.
- **Ação de Fechar**: Botão `X` (Lucide) no canto superior direito com hover suave.

## 2. Padrões de Input e Formulário

### Labels

- Devem estar sempre acima do campo.
- Estilo: Uppercase, `text-[10px]`, `font-bold`, `tracking-widest`, cor `text-muted-foreground`.

### Campos de Entrada (Inputs/Selects)

- **Background**: `bg-muted/40`.
- **Borda**: `border-border`.
- **Borda no Foco**: `ring-2 ring-primary/20` com transição suave.
- **Raio de Borda**: `xl` (12px).
- **Tipografia**: `text-sm`, com `font-bold` para valores numéricos/monetários.

### Máscaras de Valores

- **Moeda (BRL)**: Formatação em tempo real conforme digitação (ex: `R$ 1.250,00`).
- **Números**: Alinhamento à direita ou destaque visual (ex: verde para valores acumulados, primário para alvos).

## 3. Ações e Botões (Footer)

Os botões de ação devem ser organizados horizontalmente, priorizando a ação principal.

- **Ação Principal**: `flex-[3]`, background `primary`, texto branco, sombra correspondente.
- **Ação Secundária (Cancelar)**: `flex-1`, borda simples, texto `muted-foreground`.
- **Ação Destrutiva (Excluir)**: Ícone `Trash2` em botão quadrado/arredondado com contorno vermelho sutil (`text-rose-500`).

## 4. Animações e Feedback

- **Entrada**: `animate-in fade-in zoom-in-95 duration-200`.
- **Carregamento**: Uso de `Loader2` (spin) dentro do botão de confirmação durante requisições.
- **Hover**: Efeito de escala leve (`hover:scale-[1.02]`) nos botões de ação.
- **Erros**: Alertas em `rose-500/10` com borda sutil, posicionados logo acima dos botões de ação.

## 5. Exemplos de Referência

- `TransactionModal.tsx`: O padrão "ouro" para lançamentos financeiros.
- `GoalModal.tsx`: Implementação simplificada para objetivos de longo prazo.

---

_Ultima atualização: Março de 2026_
