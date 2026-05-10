# Post 01/05: Precisão Monetária — Por que nunca usar Floats para Dinheiro 💸

**📸 Sugestão de Mídia:** Um comparativo visual entre `0.1 + 0.2 = 0.30000000000000004` (float) vs `10 + 20 = 30` (cents).

---

**CONTEÚDO DO POST:**

Você confiaria o seu suado dinheiro a um sistema que arredonda "pra baixo" aleatoriamente? 🧐

Ao desenvolver o **Personalledger**, meu projeto de gestão financeira pessoal, a primeira decisão não negociável foi: **Zero Floats para valores monetários**. Na engenharia de software financeira, usar tipos de ponto flutuante (como `float64` no Go ou `DOUBLE` no SQL) é um erro clássico que gera erros cumulativos de centavos em balanços de longo prazo.

**A Minha Solução Técnica:**
Adotei a estratégia de **Armazenamento em Cents (Integers)** em todo o stack:

🛠️ **Backend (Go):** Uso `int64` para representar todos os valores. R$ 19,90 vira `1990`. 
🛠️ **Banco (PostgreSQL):** Utilizo o tipo `BIGINT`. Sem `DECIMAL` ou `NUMERIC` onde não há necessidade de casas decimais variáveis, o que acelera queries de agregação.
🛠️ **Frontend (React):** A formatação para a moeda local (BRL) acontece apenas na "borda" do sistema — no momento da renderização para o usuário.

**O resultado?** Precisão matemática absoluta. Um balanço de R$ 1.000.000,00 tem a mesma integridade de um de R$ 10,00.

No próximo post, vou mostrar como uso o conceito de **Partidas Dobradas** para garantir que nenhum centavo se perca no limbo.

**Pergunta para os devs:** Qual estratégia você prefere para lidar com dinheiro? Tipos decimais nativos ou inteiros em centavos?

---

**🚀 Dicas para o Algoritmo do LinkedIn:**
1. **Horário:** Poste entre 08:00 e 09:30 (horário comercial).
2. **Hashtags:** #SoftwareEngineering #Golang #Fintech #CleanCode #BackendDevelopment
