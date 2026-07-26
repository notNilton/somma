# Somma

Plataforma de gestão financeira pessoal e controle de frota/veículos dividida em dois projetos integrados que compartilham o mesmo banco de dados PostgreSQL.

---

## 🚀 Estrutura das Aplicações

O ecossistema **Somma** é composto por duas partes principais:

### 1. `somma-expenses`
- **Descrição**: Módulo completo de controle financeiro pessoal (receitas, despesas, orçamentos envelope, categorias e análises).
- **Backend**: Go (`net/http` + `pgx/v5`) — Porta `3300`
- **Web**: React 19 + React Router v7 + Vite + TanStack Query — Porta `3400`
- **Diretório**: `apps/somma-expenses/`

### 2. `somma-vehicles`
- **Descrição**: Módulo de gestão de veículos e abastecimentos de combustível (cálculo de consumo em km/L, custo por km, histórico de preços e odômetro).
- **Backend**: Go (`net/http` + `pgx/v5`) — Porta `3310`
- **Web**: React 19 + Vite + TailwindCSS + Lucide Icons — Porta `3410`
- **Diretório**: `apps/somma-vehicles/`

---

## 🎯 Pulo do Gato: Banco de Dados Compartilhado & Sincronização Automática

Ambos os projetos compartilham o mesmo banco de dados PostgreSQL (`somma`) e as mesmas tabelas de usuários e autenticação JWT.

### Como funciona a integração:
1. Quando você registra um **Abastecimento** no `somma-vehicles` (informando litros, valor total, preço por litro, posto e km atual):
   - É gravado o registro na tabela `refueling_logs`.
   - **Automaticamente** é criado um lançamento na tabela `transactions` com o tipo `EXPENSE` e categoria `Combustível`.
2. Assim que o abastecimento é salvo, ele **aparece imediatamente no `somma-expenses`** como uma despesa convencional, atualizando os gráficos financeiros e o saldo do mês!
3. Se um abastecimento for editado ou excluído no `somma-vehicles`, a transação vinculada no `somma-expenses` é automaticamente atualizada/excluída via restrições `FOREIGN KEY ... ON DELETE CASCADE` e transação SQL atômica.

---

## 📁 Estrutura do Monorepo

```
apps/
  somma-expenses/
    backend/          → Go API (Porta 3300)
    web/              → React frontend (Porta 3400)
  somma-vehicles/
    backend/          → Go API (Porta 3310)
    web/              → React frontend (Porta 3410)
  doc/                → Especificação OpenAPI + Swagger UI
database/
  migrations/         → Migrações SQL compartilhadas (tabelas de veículos e abastecimentos na 000025)
  seeds/              → Scripts de dados iniciais
  cmd/migrate/        → Ferramenta CLI de migração
docker-compose.yml     → Orquestração dos 4 serviços + banco PostgreSQL
go.work               → Workspaces Go compartilhando o módulo database
```

---

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Go 1.25+
- Node.js 22+
- Docker ou Podman

### Iniciar Todos os Serviços

```bash
make up
```

Este comando:
1. Sobe o container PostgreSQL na porta `5454`.
2. Executa as migrações automáticas no banco.
3. Aplica a seed com dados iniciais (usuário dev, transações, veículos e abastecimentos).
4. Sobe as APIs e frontends do `somma-expenses` e `somma-vehicles`.

---

## 🔌 Portas dos Serviços

| Serviço | Tipo | Porta | URL Local |
|---------|------|-------|-----------|
| **Expenses Web** | Frontend | `3400` | http://localhost:3400 |
| **Expenses API** | Backend | `3300` | http://localhost:3300 |
| **Vehicles Web** | Frontend | `3410` | http://localhost:3410 |
| **Vehicles API** | Backend | `3310` | http://localhost:3310 |
| **PostgreSQL** | Database | `5454` | `localhost:5454/somma` |
