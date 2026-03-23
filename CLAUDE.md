# Mirante — Sistema de Gerenciamento Financeiro

Monorepo NestJS + React + Prisma + PostgreSQL para controle de gastos, contas bancárias e veículos.

## Estrutura do monorepo

```
apps/backend/     → NestJS REST API
apps/webapp/      → React + TanStack Router + TanStack Query
packages/database/→ Prisma schema, migrations, seed, client gerado
```

## Comandos principais

```bash
# Tipos TypeScript (sem precisar do DB)
cd packages/database && npx prisma generate

# Migração (requer DB na porta 5433)
cd packages/database && npx prisma migrate dev --name <nome-descritivo>

# Seed
cd packages/database && npx prisma db seed
```

O banco roda na porta **5433** (configurado em `packages/database/.env`).

---

## Arquitetura de contas e transações

### Regra central — sem CREDIT_CARD

**Não existe mais `CREDIT_CARD` como tipo de conta.** A lógica de crédito foi unificada na conta:

- Qualquer conta pode ter `creditLimit?: Decimal` (opcional)
- `Transaction.paymentMethod` enum `DEBIT | CREDIT` indica como a transação foi feita
- O toggle DEBIT/CREDIT só aparece no UI se a conta tiver `creditLimit > 0`

`AccountType` válidos: `CHECKING | SAVINGS | CASH | WALLET | INVESTMENT`

### Titularidade de contas (`AccountOwnership`)

- `PERSONAL` → preenche campo `cpf` (VarChar 14, ex: `"06143981183"`)
- `BUSINESS` → preenche campo `cnpj` (VarChar 18)
- Múltiplas contas **podem** ter o mesmo CPF/CNPJ (sem `@unique` na conta)
- O `@unique` de CPF/CNPJ existe **somente** no modelo `User`

### Cartões (`Card`)

- Cartões são entidades separadas vinculadas a uma `Account` via `accountId`
- `Card.type`: `CREDIT | DEBIT`
- `Transaction.cardId` é opcional — transações sem cartão são diretas na conta

### Transações e saldo

- `affectsAccount: false` em transações de cartão CREDIT (não afeta saldo da conta mãe)
- Soft delete: `isActive: false` + `deletedAt` — **nunca deletar fisicamente**
- Datas sempre em UTC 12:00 para evitar problemas de fuso horário

---

## Padrão de módulos NestJS

Cada módulo segue: `module` → `controller` → `service` → `dto/create-*.dto.ts` + `dto/update-*.dto.ts`

```typescript
// DTOs
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
// UpdateDto sempre estende PartialType
export class UpdateXxxDto extends PartialType(CreateXxxDto) {}
```

- Serviços injetam `DatabaseService` (wrapper do PrismaClient em `src/database/`)
- Módulos devem ser registrados em `apps/backend/src/app.module.ts`
- Valores financeiros: `new Prisma.Decimal(value)` no service, `@db.Decimal(12, 2)` no schema

---

## Convenções de schema Prisma

- `@map("snake_case")` em todos os campos camelCase
- `@@map("table_name")` em todos os modelos (plural, snake_case)
- `@db.VarChar(n)` em todos os campos String com limite conhecido
- Enums com `@map` nas migrations quando necessário

---

## Stack do webapp

- **Roteamento**: TanStack Router (arquivo `routeTree.gen.ts` é gerado — não editar manualmente)
- **Dados**: TanStack Query (`useQuery`, `useMutation`) via funções em `src/lib/api.ts`
- **UI**: Tailwind CSS + shadcn/ui (componentes em `src/components/ui/`)
- **Modais**: estado local com `useState`, dados iniciais via prop `initialData`
