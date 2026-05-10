# Post 02/05: Partidas Dobradas — A Contabilidade de 1494 no App de 2026 📖

**📸 Sugestão de Mídia:** Um diagrama simples mostrando o fluxo: "Saída (Crédito) Conta Corrente" -> "Entrada (Débito) Categoria Supermercado".

---

**CONTEÚDO DO POST:**

Por que um sistema de 500 anos ainda é a melhor forma de organizar as suas finanças pessoais hoje? 🧐

Muitos apps de finanças se limitam a registrar um "log de gastos". No **Personalledger**, optei por uma abordagem de **Partidas Dobradas (Double-Entry Bookkeeping)**. Parece complexo, mas é o segredo para nunca ter que perguntar "uai, para onde foi esse dinheiro?".

**O Conceito:**
Cada transação não é apenas uma "saída de caixa". É um movimento entre contas:
1. Sai da sua **Conta Corrente** (Ativo).
2. Entra na sua **Categoria de Lazer** (Despesa).

**Por que isso importa na Engenharia de Software?**
✅ **Auditabilidade:** É possível rastrear cada centavo de forma bidirecional. 
✅ **Consistência:** O saldo total do seu patrimônio é a soma matemática exata de todos os débitos e créditos.
✅ **Previsibilidade:** No Personalledger, cada "conta" (corrente, poupança, investimento, cofre) é tratada como uma entidade independente no banco, permitindo reconciliações bancárias robustas.

No meu backend em Go, cada transação financeira garante a atomicidade desse movimento. Se um lado do lançamento falhar, o outro não acontece.

**Curiosidade:** Vocês já tinham ouvido falar em Partidas Dobradas (ou *Double-Entry*) aplicada a apps de uso pessoal? Comentem aqui! 👇

---

**🚀 Dicas para o Algoritmo do LinkedIn:**
1. **Dwell Time:** Este post educativo retém o usuário enquanto ele processa o conceito contábil.
2. **Engajamento:** Poste uma imagem do mestre Luca Pacioli para dar contexto histórico.
3. **Link:** No primeiro comentário, coloque o link para o README do projeto Personalledger.
