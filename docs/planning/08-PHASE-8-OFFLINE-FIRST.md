# 08 - Fase 8: Offline-First e Sync Local

> **Status: ⏳ Planejada**

A Fase 8 transforma o Tallyoh em um app **offline-first**: a interface responde primeiro com estado local instantaneo e a sincronizacao com o backend acontece depois, em segundo plano.

O objetivo nao e mover toda a regra de negocio para o dispositivo. O objetivo e separar:

- **Interacao local:** formularios, filtros, listas, estado visual e criacao/edicao otimista.
- **Persistencia remota:** consolidacao final, auditoria, conflitos e fonte de verdade.

---

## 1. Principios

### 1.1. Local primeiro
- Toda acao do usuario precisa refletir na UI sem depender de round-trip da rede.
- O app deve continuar util mesmo com conexao lenta, intermitente ou indisponivel.
- O estado visivel vem do armazenamento local, nao do servidor em tempo real.

### 1.2. Sync assincrono
- As mutacoes viram eventos numa fila local.
- Um worker de sincronizacao reenvia as operacoes quando houver rede.
- A UI mostra o item como `pending` ate a confirmacao do backend.

### 1.3. Conflitos explicitos
- O backend continua sendo a fonte de verdade.
- Alteracoes concorrentes precisam de versionamento e resolucao previsivel.
- Operacoes precisam ser idempotentes para evitar duplicacao na reconexao.

---

## 2. Alcance da primeira etapa

### 2.1. Webapp
- [ ] Persistir o cache de consultas em armazenamento local.
- [ ] Criar outbox local para mutacoes pendentes.
- [ ] Executar criacao/edicao de transacoes de forma otimista.
- [ ] Exibir faixa visual de offline e sincronizacao pendente.
- [ ] Marcar registros locais com status `pending_sync` enquanto nao houver confirmacao.

### 2.2. Backend
- [ ] Aceitar identificadores gerados no cliente.
- [ ] Adicionar idempotencia por operacao.
- [ ] Criar endpoint de sync em lote.
- [ ] Expor delta incremental por `updatedAt`/`version`.

---

## 3. Arquitetura proposta

### 3.1. Camada local
O navegador passa a manter um banco local com:

- `transactions`
- `categories`
- `budgets`
- `vehicles`
- `sync_outbox`
- `sync_state`

A interface le esses dados primeiro. Se a rede falhar, o usuario ainda navega e continua operando.

### 3.2. Camada de dominio
As regras que precisam ser instantaneas ficam em funcoes puras:

- validacao de formulario
- normalizacao de payload
- calculo de estado otimista
- ordenacao e filtragem

### 3.3. Camada de sync
Cada mudanca gera um item de fila com:

- `id` da operacao
- `kind` da mudanca
- `payload`
- `tempEntityId`
- `attempts`
- `lastError`
- `createdAt`

O sync processa a fila, aplica o resultado no cache local e remove o item quando houver confirmacao do servidor.

---

## 4. Contrato de sync

### 4.1. IDs do cliente
O cliente precisa criar IDs antes de falar com o backend.

Isso evita bloquear a criacao de entidades enquanto a conexao nao responde.

### 4.2. Operacoes idempotentes
Mutacoes precisam poder ser reenviadas sem duplicar registros.

Sugestao de abordagem:

- `clientMutationId` unico por operacao
- backend salva chave de idempotencia por usuario
- respostas repetidas retornam o mesmo resultado

### 4.3. Reconciliacao
Quando o backend confirmar uma operacao:

- o item otimista local e substituido pelo registro real
- o estado `pending` vira `synced`
- listas e dashboards sao revalidados ou atualizados incrementalmente

---

## 5. Ordem de implementacao

### Etapa 1
- Persistencia local da fila
- Banner de online/offline
- Criacao otimista de transacao

### Etapa 2
- Persistencia local do cache de consultas
- Marcar registros locais com estado visual de sync
- Reconciliacao da fila no retorno da rede

### Etapa 3
- Endpoint de sync em lote
- Idempotencia no backend
- Resolucao de conflitos e revisao de versao

---

## 6. Critérios de aceite

- O usuario consegue criar uma transacao com a rede lenta sem sentir bloqueio visual.
- O app mostra claramente quando existe estado pendente de sync.
- Ao reconectar, as operacoes pendentes sao reenviadas automaticamente.
- O backend continua sendo a verdade final dos dados.

