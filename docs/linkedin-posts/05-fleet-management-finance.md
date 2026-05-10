# Post 05/05: Gestão de Ativos — O Módulo de Veículos Integrado 🚗

**📸 Sugestão de Mídia:** Um print do dashboard do Personalledger mostrando a estatística de autonomia do veículo (km/L) ao lado do gráfico de despesas de combustível.

---

**CONTEÚDO DO POST:**

Gerenciar o seu carro deveria ser apenas sobre as parcelas do financiamento? 🧐

No meu projeto **Personalledger**, decidi que a gestão financeira pessoal só faz sentido se ela estiver conectada à realidade do dia a dia. Por isso, desenvolvi o **Módulo de Veículos (Fleet Module)** integrado diretamente ao core financeiro.

**A Minha Abordagem:**
Cada "abastecimento" ou "manutenção" é tratado como uma transação financeira, mas com **metadados físicos**.

🛠️ **Cálculo de Autonomia:** Ao registrar o odômetro e os litros abastecidos, o backend calcula automaticamente a média de `km/L` (autonomia) e o `custo real por quilômetro rodado`. 
🛠️ **Automação Contábil:** O lançamento do abastecimento gera automaticamente um débito na Categoria "Transporte/Combustível" no extrato principal.

**Por que isso importa?**
Isso transforma o app de um simples "gerenciador de gastos" em uma ferramenta de **otimização de ativos**. Você sabe exatamente quando seu carro está consumindo mais do que o normal ou quando uma manutenção preventiva está atrasada.

**O Desafio Técnico:** Integrar dados físicos (Km, Litros) com dados financeiros (Centavos) em um único fluxo de inserção rápida via mobile.

**Pergunta:** Você prefere ter apps separados para cada tarefa (um para carro, outro para finanças, outro para metas) ou um hub unificado como o Personalledger? 👇

---

**🚀 Dicas para o Algoritmo do LinkedIn:**
1. **Diferencial:** Mostre como a integração gera insights que um app financeiro comum não daria.
2. **Visual:** Use um print da tela de cadastro de veículo, que tende a ter cores e ícones atrativos.
3. **Hashtags:** #PersonalFinance #FleetManagement #ProductDesign #SoftwareEngineering #DataDriven
