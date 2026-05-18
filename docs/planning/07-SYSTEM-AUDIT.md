# 07 — Auditoria do Sistema Atual

> **Data:** Abril 2026 | **Branch:** `development` | **Backend:** v1.0.36 | **Webapp:** v1.0.37

Análise do estado atual do Tallyoh — o que está sólido, o que está pendente e onde estão os riscos técnicos.

---

## Estado Atual por Módulo

| Módulo | Backend | Webapp | Testes | Status |
|--------|---------|--------|--------|--------|
| Auth (JWT + bcrypt) | ✅ | ✅ | ✅ unitário | Sólido |
| Contas (`accounts`) | ✅ | ✅ | ✅ unitário | Sólido |
| Transações | ✅ | ✅ | ✅ unitário | Sólido |
| Transferências | ✅ | ✅ | — | Sem testes |
| Cartões de crédito | ✅ | ✅ | ✅ unitário | Sólido |
| Categorias e Tags | ✅ | ✅ | ✅ unitário | Sólido |
| Veículos e Frota | ✅ | ✅ | ✅ unitário | Sólido |
| Calendário | ✅ | ✅ | — | Sem testes |
| Orçamentos (budgets) | ✅ | ✅ | — | Sem testes |
| Planejamento (plans) | ✅ | ✅ | — | Sem testes |
| Dashboard / Analytics | ✅ | ✅ | ✅ unitário | Sólido |
| Relatórios | — | ⏳ stub | — | Não implementado |
| Importação CSV | ✅ | ✅ | — | Sem testes |
| Exportação CSV | ✅ | ✅ | — | Sem testes |
| Colaboração em contas | ✅ | — | — | Backend ok, UI pendente |

---

## Riscos Técnicos Identificados

### 1. Ausência de Testes de Integração
**Risco: Alto**

Os testes existentes são unitários (handlers mockados). Não há testes que validem a interação real com o banco de dados. Bugs em queries SQL (ex: JOIN incorreto no `budgets/status`, condição de corrida em transferências) não seriam detectados antes de produção.

**Mitigação planejada:** Fase 3 — banco de teste isolado com `pgx` real.

---

### 2. Sem Validação Centralizada de Input
**Risco: Médio**

Cada handler valida sua entrada de forma ad hoc. Não há um middleware ou schema de validação (ex: `go-playground/validator`) garantindo que campos obrigatórios estejam presentes e dentro dos limites esperados.

**Mitigação planejada:** Fase 3 — helper de validação centralizado.

---

### 3. Cache em Memória sem TTL Persistido
**Risco: Baixo**

O cache interno (`internal/cache`) é volátil: reinicializações do container limpam o cache. Em produção isso é aceitável (o cache reaquece em minutos), mas pode causar picos de carga no banco imediatamente após um deploy.

**Mitigação:** Comportamento aceitável no estágio atual. Monitorar em produção.

---

### 4. Importação CSV sem Idempotência
**Risco: Médio**

Se o usuário importar o mesmo arquivo duas vezes (seja por erro ou por re-upload), as transações serão duplicadas. Não há mecanismo de deduplicação por hash de linha.

**Mitigação planejada:** Fase 5 — tabela `idempotency_keys`.

---

### 5. `account_access` sem UI
**Risco: Baixo**

O backend de colaboração em contas (`account_access`) está implementado e testado, mas a interface no webapp (`/wallet/accounts` — seção de membros) ainda não foi construída.

**Mitigação:** Implementar na Fase 3 junto com a página de relatórios.

---

### 6. Modelo Mono-Usuário
**Risco: Baixo (agora) / Alto (futuro)**

Todas as tabelas são filtradas por `user_id`. Compartilhar um orçamento ou uma conta entre dois usuários requer a lógica de `account_access`, que é limitada. Para colaboração real (ex: casal com orçamento compartilhado), é necessária a arquitetura multi-tenant da Fase 6.

**Mitigação planejada:** Fase 6 — `tenants` + RLS.

---

## O que Está Bem

- **Precisão monetária:** `BIGINT` (centavos) em toda a stack — sem risco de erro de arredondamento.
- **Migrations SQL puras:** Schema versionado e auditável. Sem magia de ORM.
- **CI/CD robusto:** Build, bump de versão e publicação de imagens totalmente automatizados.
- **Infraestrutura simples:** Cloudflare Tunnel + Caddy + Docker Compose. Sem complexidade desnecessária.
- **Dependências vendorizadas:** Builds Go reproduzíveis offline.
- **Cobertura de domínios:** Módulos de accounts, cards, vehicles, budgets e planning cobrem os casos de uso centrais de um app de finanças pessoais completo.

---

## Próxima Ação Recomendada

Iniciar **Fase 3** com foco em:
1. Testes de integração para transferências e orçamentos.
2. Página `/planning/reports` (stub já existe no webapp).
3. UI de colaboração em contas (members).
