---
name: seed
description: Roda o seed do banco de dados para popular com dados de desenvolvimento
---

Execute o seed do projeto mirante.

## Passos

1. Verifique se o banco está acessível:

   ```bash
   cd packages/database && npx prisma db execute --stdin <<< "SELECT 1" 2>&1 | head -5
   ```

   Se falhar, informe que o PostgreSQL não está rodando na porta 5433 e pare.

2. Avise o usuário que o seed **apaga todos os dados existentes** e peça confirmação antes de continuar.

3. Execute o seed:

   ```bash
   cd packages/database && npx prisma db seed
   ```

4. Exiba um resumo do que foi criado (usuário Nilton, 4 contas, categorias, veículos).

## O que o seed cria

- **Usuário**: Nilton Aguiar dos Santos (`nilton.naab@gmail.com`, senha `@2Organela`)
- **Contas**:
  - Banco do Brasil — PERSONAL, CPF 06143981183, CHECKING
  - Nubank — PERSONAL, CPF 06143981183, CHECKING
  - Mercado Pago — PERSONAL, CPF 06143981183, WALLET
  - Nubank PJ — BUSINESS, CNPJ aleatório, CHECKING
- **Categorias**: 12 categorias padrão (receitas e despesas)
- **Veículos**: 2 veículos com logs de abastecimento
- **Transações**: ~40 transações aleatórias
