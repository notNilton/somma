# Referências: Engenharia de Software (Tallyoh)

Este documento detalha os fundamentos técnicos, padrões de projeto e escolhas arquiteturais que regem o desenvolvimento do ecossistema **Tallyoh**. O sistema prioriza simplicidade, robustez e performance.

---

## 📚 1. Livros de Referência (Top 5 Fundamentais)

As decisões de design e estrutura foram guiadas por estas obras:

1. **Clean Architecture: A Craftsman's Guide to Software Structure and Design**
   - *Autor:* Robert C. Martin (2017).
   - *Contexto:* Guia a separação clara entre a lógica de domínio financeira (serviços) e a camada de entrega (HTTP/API).

2. **The Go Programming Language**
   - *Autores:* Alan A. A. Donovan & Brian W. Kernighan (2015).
   - *Contexto:* O Tallyoh utiliza Go de forma idiomática, preferindo a **Standard Library** (`net/http`) para o core do roteamento e concorrência nativa.

3. **Fundamentals of Software Architecture: An Engineering Approach**
   - *Autores:* Mark Richards & Neal Ford (2020).
   - *Contexto:* Base para a escolha do padrão **Modular Monolith**, otimizando a agilidade de desenvolvimento sem a complexidade prematura de microserviços.

4. **Modern Frontend Development with React**
   - *Contexto:* O Tallyoh utiliza React 19 em sua vanguarda, adotando o paradigma de **Server State Management** via TanStack Query.

5. **Designing Data-Intensive Applications**
   - *Autor:* Martin Kleppmann (2017).
   - *Contexto:* Guia as decisões sobre persistência de dados no **PostgreSQL**, garantindo atomicidade e isolamento em transações financeiras.

---

## 🏗️ 2. Padrões de Arquitetura e Design

1. **Double-Entry Domain Model**
   - Implementação de um modelo de domínio que reflete a realidade contábil, garantindo que o saldo seja sempre um estado derivado e auditável.

2. **The Twelve-Factor App**
   - *Conceito:* Metodologia para construção de apps modernos e portáteis.
   - *Aplicação:* O Tallyoh segue rigorosamente a gestão de configurações via variáveis de ambiente, paridade entre dev/prod e processos stateless.

3. **Outbox Pattern** (Planejado)
   - Utilizado para garantir que eventos disparados por transações financeiras (ex: notificações) sejam enviados de forma resiliente após a persistência no banco.

4. **Monorepo Strategy**
   - Adoção de um repositório único para `apps/backend`, `apps/webapp` e `database`, facilitando a gestão de versões, testes integrados e atomicidade de mudanças entre frontend e backend.

---

## 🎓 3. Paradigmas e Tecnologias Core

- **ACID Transactions:** Uso extensivo das garantias ACID do PostgreSQL 18 para assegurar que lançamentos financeiros nunca fiquem em estado inconsistente.
- **Type-Safe Routing:** O frontend utiliza o **TanStack Router** para garantir segurança de tipos entre a URL e o código da aplicação.
- **Standard Library First:** O backend prioriza bibliotecas nativas do Go para reduzir dependências externas e garantir estabilidade de longo prazo.
- **RESTful API:** Design de API pragmático, seguindo os níveis de maturidade de Richardson e priorizando a previsibilidade.

---

## 📐 4. Padrões de Código e Convenções

- **SemVer:** Controle de versões via Semantic Versioning.
- **Conventional Commits:** Padronização de mensagens de commit para automação de changelogs.
- **Linting & Formatting:** Aplicação automática de `go fmt`, `eslint` e `prettier` para manter a consistência estética do código.
