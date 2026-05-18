# Post 04/05: Arquitetura — Go Standard Library + React 19 no Monorepo ⚡

**📸 Sugestão de Mídia:** Um print do terminal rodando `make up`, mostrando o backend em Go, o banco Postgres e o webapp Vite subindo simultaneamente.

---

**CONTEÚDO DO POST:**

O segredo de um projeto escalável não está em frameworks da moda, mas na **simplicidade arquitetural**. 🛠️

Ao construir o ecossistema **Tallyoh**, optei por uma abordagem de **Modular Monolith** que me permite ser ágil hoje, sem gerar dívida técnica para amanhã. O stack? Go 1.24 no backend e React 19 no frontend.

**Minhas Escolhas de Engenharia:**

🚀 **Backend (Go):** Preferi usar a Standard Library (`net/http`) para o roteamento e o driver `pgx` para o Postgres. Sem ORMs pesados ou frameworks gigantes. Isso garante uma API extremamente rápida, com consumo de memória baixíssimo.
🚀 **Frontend (React 19):** Adotei o **TanStack Router** para garantir rotas 100% tipadas. A integração com o backend é via **TanStack Query**, o que remove 90% da dor de gerenciar estados do servidor no client.
🚀 **Monorepo:** Tudo vive em um único repositório, com um **Makefile** robusto orquestrando o ambiente local com Docker.

**O benefício prático:** Posso refatorar um DTO no backend e saber imediatamente no frontend que uma rota quebrou, tudo graças à tipagem forte do ecossistema Go/TS.

**Dúvida técnica:** Vocês preferem "frameworks tudo-em-um" ou montar o próprio stack com bibliotecas especializadas? Comentem aqui embaixo! 👇

---

**🚀 Dicas para o Algoritmo do LinkedIn:**
1. **Engajamento:** Mencione como você prefere desenvolver as suas APIs.
2. **Foto:** Um print do código bem formatado sempre ajuda a atrair outros devs.
3. **Hashtags:** #Fullstack #Golang #ReactJS #Monorepo #SoftwareArchitecture
