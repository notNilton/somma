---
name: migrar
description: Roda prisma migrate dev para aplicar mudanças no schema ao banco de dados PostgreSQL
---

Execute uma migração do Prisma para o projeto mirante.

## Passos

1. Verifique se o usuário forneceu um nome para a migração em `$ARGUMENTS`. Se não forneceu, pergunte antes de prosseguir.

2. Confirme que o banco de dados está acessível:

   ```bash
   cd packages/database && npx prisma db execute --stdin <<< "SELECT 1" 2>&1 | head -5
   ```

   Se falhar com erro de conexão (P1001), informe o usuário que o PostgreSQL não está rodando na porta 5433 e pare.

3. Rode a migração:

   ```bash
   cd packages/database && npx prisma migrate dev --name $ARGUMENTS
   ```

4. Confirme o sucesso e liste as migrations existentes:
   ```bash
   ls packages/database/prisma/migrations/
   ```

## Erros comuns

- **P1001 (Can't reach database)**: PostgreSQL não está rodando. O banco usa porta 5433.
- **Drift detectado**: o schema e o banco estão dessincronizados. Pode ser necessário `prisma migrate reset` em dev.
- **Nome vazio**: a flag `--name` é obrigatória. Use nomes descritivos em snake_case (ex: `add_account_ownership`).
