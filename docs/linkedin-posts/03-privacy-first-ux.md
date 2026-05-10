# Post 03/05: UX e Segurança — O Modo de Privacidade 👁️‍🗨️

**📸 Sugestão de Mídia:** Um GIF curto do dashboard do Personalledger: ao clicar no botão "olho", todos os valores financeiros ficam borrados (blur).

---

**CONTEÚDO DO POST:**

Você se sente confortável abrindo o seu app financeiro no ônibus, no café ou no escritório? 🧐

Ao projetar a interface do **Personalledger**, percebi que a maior barreira para o uso constante de ferramentas de gestão financeira pessoal não é a complexidade, mas a **exposição**. Ninguém quer que a pessoa ao lado veja seu saldo bancário ou quanto gasta em delivery.

**A Minha Solução de UX:**
Implementei o **Modo de Privacidade (Privacy Mode)** com um clique.

🛡️ **Como funciona tecnicamente:**
Através de um estado global (Zustand) no React, o sistema aplica uma classe CSS condicional em todos os componentes de moeda. O efeito de `blur` não é apenas visual; no meu projeto, o estado de privacidade é persistido nas preferências do usuário no banco de dados.

🛡️ **O Impacto:** 
Isso permite que o usuário gerencie suas finanças em qualquer lugar, mantendo os dados sensíveis protegidos de curiosos. É o equilíbrio perfeito entre **usabilidade e discrição**.

**Dica de Frontend:** No Tailwind CSS, usei `blur-md` aplicado via `class-variance-authority` (CVA) para garantir consistência em toda a aplicação.

**Pergunta:** Qual funcionalidade de UX você considera indispensável em um app que lida com dados sensíveis? Comentem abaixo! 👇

---

**🚀 Dicas para o Algoritmo do LinkedIn:**
1. **Vídeo:** O GIF chama muita atenção no feed.
2. **Escrita:** Use as quebras de linha para facilitar a leitura no mobile.
3. **Hashtags:** #Frontend #ReactJS #UXDesign #FinancialSecurity #TailwindCSS
