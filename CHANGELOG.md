# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.2.3](http://gitea:3000/nilbyte-studios/mirante/compare/backend-v1.2.1...backend-v1.2.3) (2026-03-23)


### Bug Fixes

* tornar prepare script tolerante a falha em CI/Docker ([7d73bd7](http://gitea:3000/nilbyte-studios/mirante/commit/7d73bd73fa56d7f0bfb6e5b0d83203ccf97c1f33))

### [1.2.2](http://gitea:3000/nilbyte-studios/mirante/compare/webapp-v1.2.0...webapp-v1.2.2) (2026-03-23)


### Bug Fixes

* desabilitar husky nos Dockerfiles com HUSKY=0 ([52ee563](http://gitea:3000/nilbyte-studios/mirante/commit/52ee563f23e116d9a6d09f7bac94f5e9d6f4bd99))

### [1.2.1](http://gitea:3000/nilbyte-studios/mirante/compare/backend-v1.1.0...backend-v1.2.1) (2026-03-23)


### Bug Fixes

* desabilitar husky nos Dockerfiles com HUSKY=0 ([52ee563](http://gitea:3000/nilbyte-studios/mirante/commit/52ee563f23e116d9a6d09f7bac94f5e9d6f4bd99))

## 1.2.0 (2026-03-23)


### Features

* Add initial pages and components for managing accounts and financial goals. ([73147f1](http://gitea:3000/nilbyte-studios/mirante/commit/73147f16da228fa35b13cea5e1b3be7827ca174a))
* adicionar aba Fatura no modal de transações ([76e401e](http://gitea:3000/nilbyte-studios/mirante/commit/76e401e2074883e16fbd1cf18ddd478190b9777c))
* adicionar badges, filtros e ações rápidas na tela de transações ([8ace5a8](http://gitea:3000/nilbyte-studios/mirante/commit/8ace5a89d6fbcdcebac4787d6c62cd413a2e4d07))
* adicionar cálculo de vencimento de fatura de cartão de crédito, classificação de abastecimento e ajuste de centavos em parcelas. ([5f0360c](http://gitea:3000/nilbyte-studios/mirante/commit/5f0360c204e46acc338755e4a609bce2631af4c7))
* adicionar CRUD de veículos e custom select na tela de veículos ([8f6a9fd](http://gitea:3000/nilbyte-studios/mirante/commit/8f6a9fd1e5133199aa936841b7e7d173069b63e0))
* adicionar dashboard funcional ([4288952](http://gitea:3000/nilbyte-studios/mirante/commit/42889522575d4a4a9b380d1a06dff503398aab88))
* adicionar data de fechamento e de vencimento de cartão e ajustar estilo da tela de gestão de cartão ([ab2f039](http://gitea:3000/nilbyte-studios/mirante/commit/ab2f0391e7a931b846df7b16dec391ea7e1e79dc))
* adicionar hooks e api para o settings e implementar tanstack query em toda query do sistema ([46208c3](http://gitea:3000/nilbyte-studios/mirante/commit/46208c3317a22207f1cdcab8b625a4895a4437b6))
* adicionar modais para criar e editar orçamentos e metas, e refatorar a exibição em cards interativos com navegação mensal. ([fb7b8b3](http://gitea:3000/nilbyte-studios/mirante/commit/fb7b8b34734a2958a8c24db0d7812572132e05c2))
* adicionar nova rota de gerenciamento de contas e atualizar o cabeçalho para incluir link para contas ([ed4ba09](http://gitea:3000/nilbyte-studios/mirante/commit/ed4ba0954a1baa4de9153448dd213d68bda8ccd0))
* adicionar novas rotas para gerenciamento de orçamentos, metas e combustível, incluindo componentes e tipos de dados correspondentes ([66b72c3](http://gitea:3000/nilbyte-studios/mirante/commit/66b72c378b8d4cf676093ab8850584bb54ad6b2b))
* adicionar saldo do período no resumo de transações ([c207c43](http://gitea:3000/nilbyte-studios/mirante/commit/c207c43afa88cf74e4a15753439562e930e21ccb))
* adicionar suporte a cartões vinculados a contas, incluindo modais para criação e edição, e atualizar a estrutura de dados para gerenciar cartões no backend ([6bb263c](http://gitea:3000/nilbyte-studios/mirante/commit/6bb263ce36244856c4c8c6a40fd8d5e175d0c288))
* adicionar suporte para parcelas em transações, permitindo a criação de transações parceladas com logs de abastecimento e manutenção vinculados ([b34fda9](http://gitea:3000/nilbyte-studios/mirante/commit/b34fda9587923840b525e7a4366468b451409866))
* ajustar geração de contas removendo cartões e melhorando modal de criação de contas bancárias ([310df47](http://gitea:3000/nilbyte-studios/mirante/commit/310df47b26ac63c9023abdb603130616470cd1f2))
* ajustar lógica de recorrência em transações, desabilitando a opção para parcelas e atualizando a exibição no modal ([b4225a4](http://gitea:3000/nilbyte-studios/mirante/commit/b4225a4e26eca0a5b56f0d889f884986fb536ce9))
* exibir receitas e despesas no resumo e aba atual mostra mês inteiro ([0d4a8ff](http://gitea:3000/nilbyte-studios/mirante/commit/0d4a8ffb8edb3822aa00a4d7649a8953621cfa54))
* expandir o gerenciamento de transações para incluir logs de manutenção de veículos e ajustar a estrutura de dados para suportar novos campos de manutenção ([d6ccabc](http://gitea:3000/nilbyte-studios/mirante/commit/d6ccabc882ac9b8ed256064a105123a6ca10924f))
* Implement core backend services and database schema for users, transactions, and vehicles, alongside initial web app routes and components. ([7419ee8](http://gitea:3000/nilbyte-studios/mirante/commit/7419ee861a53055bb9f282319a18b5df6ebbf26a))
* implement transactions page with search, filters, and a new transaction modal, alongside a project TODO list. ([c9a30e1](http://gitea:3000/nilbyte-studios/mirante/commit/c9a30e133c029f4a5677fbe6ab20acf35e6abffd))
* implementar mobile UX com BottomNav, FAB e layouts responsivos ([a87c87f](http://gitea:3000/nilbyte-studios/mirante/commit/a87c87f26fc166c688a29820594417a3f975b137))
* implementar nova seção de evolução com rotas aninhadas para orçamentos, metas e combustível. ([a1300ec](http://gitea:3000/nilbyte-studios/mirante/commit/a1300ec9da07d11d74131b323ec714578198e126))
* Initialize core web application structure with main routes, navigation header, and basic styling. ([175d160](http://gitea:3000/nilbyte-studios/mirante/commit/175d16035d13cfd98212e27477f83d508708be5a))
* Initialize webapp with core layout, navigation, and initial pages for transactions, accounts, and budgets, including privacy mode. ([a602f89](http://gitea:3000/nilbyte-studios/mirante/commit/a602f89fdbb83366a383b528d671f6df9e4eb34a))
* integrar gerenciamento de logs de abastecimento em transações e ajustar modal de edição ([2175663](http://gitea:3000/nilbyte-studios/mirante/commit/21756633e970d1abc3c83dd5fce6489d51caa7d4))
* Introduce TransactionModal component for adding and editing financial transactions. ([20f2021](http://gitea:3000/nilbyte-studios/mirante/commit/20f202177580c95e04f44acfe499e9a734cc7c9c))
* ordenação por coluna, agrupamento por dia e limpar filtros em transações ([7586ae4](http://gitea:3000/nilbyte-studios/mirante/commit/7586ae42ca763f7b9dc12d342b3f22b8c8dd11f3))
* parcelas visíveis somente no tipo crédito ([12612fd](http://gitea:3000/nilbyte-studios/mirante/commit/12612fd183190229d3c561c43533404b54f1dbf7))
* remover lógica de cartão e adicionar fatura paga no resumo ([e12cd77](http://gitea:3000/nilbyte-studios/mirante/commit/e12cd772157e606a63a685a560b3200216fe0687))
* renomear campo 'make' para 'brand' e adicionar suporte a ícones de marcas de veículos ([e964356](http://gitea:3000/nilbyte-studios/mirante/commit/e964356865bad8c1a680125ce34faf61d682c8a7))
* resumo de transações com breakdown por canal de pagamento ([99c73b1](http://gitea:3000/nilbyte-studios/mirante/commit/99c73b1e854fa6f7f290130cccd30b78a59a554f))
* unificar crédito/débito na conta e adicionar metadados de titularidade ([6406a61](http://gitea:3000/nilbyte-studios/mirante/commit/6406a61f639e4527c20fdddfd5a3cb849177c15c))
* **webapp:** adicionar componente de seleção customizado e aplicá-lo em campos do modal de transação. ([9ccab09](http://gitea:3000/nilbyte-studios/mirante/commit/9ccab091bbaf07c032e91161dced384ef8c57f79))
* **webapp:** adicionar seleção de mês para transações passadas na tela de transações ([4d97b3d](http://gitea:3000/nilbyte-studios/mirante/commit/4d97b3d866df9aa12b9cb141d6c790ae081b8040))
* **webapp:** melhora tela de transações com import e ações em massa ([e80bcb6](http://gitea:3000/nilbyte-studios/mirante/commit/e80bcb67f3a6e3f91013892ec72f6a37d711256b))


### Bug Fixes

* corrigir data padrão para fuso local e exibição de valores em transações ([607bf54](http://gitea:3000/nilbyte-studios/mirante/commit/607bf54d25256626db9869578b232fe267b405ed))
* corrigir filtro de transações do dia atual ignorando horário UTC ([681c97b](http://gitea:3000/nilbyte-studios/mirante/commit/681c97b3cdda193862ce24dde6415e5a9390ce49))
* resolver vulnerabilidades de segurança de alta prioridade ([daa79a8](http://gitea:3000/nilbyte-studios/mirante/commit/daa79a87290758fbbd9ce66fd85a2c394a0d015c))

## 1.1.0 (2026-03-23)


### Features

* adicionar badges, filtros e ações rápidas na tela de transações ([8ace5a8](http://gitea:3000/nilbyte-studios/mirante/commit/8ace5a89d6fbcdcebac4787d6c62cd413a2e4d07))
* adicionar cálculo de vencimento de fatura de cartão de crédito, classificação de abastecimento e ajuste de centavos em parcelas. ([5f0360c](http://gitea:3000/nilbyte-studios/mirante/commit/5f0360c204e46acc338755e4a609bce2631af4c7))
* adicionar dashboard funcional ([4288952](http://gitea:3000/nilbyte-studios/mirante/commit/42889522575d4a4a9b380d1a06dff503398aab88))
* adicionar data de fechamento e de vencimento de cartão e ajustar estilo da tela de gestão de cartão ([ab2f039](http://gitea:3000/nilbyte-studios/mirante/commit/ab2f0391e7a931b846df7b16dec391ea7e1e79dc))
* adicionar no backend modulo de settings e ajustar modulo de budget para de adequar com o webapp ([6e49084](http://gitea:3000/nilbyte-studios/mirante/commit/6e4908489e4a95667b1c1054e7ffb742e093ce3b))
* adicionar suporte a cartões vinculados a contas, incluindo modais para criação e edição, e atualizar a estrutura de dados para gerenciar cartões no backend ([6bb263c](http://gitea:3000/nilbyte-studios/mirante/commit/6bb263ce36244856c4c8c6a40fd8d5e175d0c288))
* adicionar suporte para parcelas em transações, permitindo a criação de transações parceladas com logs de abastecimento e manutenção vinculados ([b34fda9](http://gitea:3000/nilbyte-studios/mirante/commit/b34fda9587923840b525e7a4366468b451409866))
* adicioner testes unitários de transação ([1a3d61f](http://gitea:3000/nilbyte-studios/mirante/commit/1a3d61f8f675b9df6390aa1cdbacf4ba2e053fc2))
* ajustar backend para comportar a informação do combustivel do veiculo ([5cdbe67](http://gitea:3000/nilbyte-studios/mirante/commit/5cdbe675ece41a26f25b5dbe5b889d5a9021346d))
* ajustar geração de contas removendo cartões e melhorando modal de criação de contas bancárias ([310df47](http://gitea:3000/nilbyte-studios/mirante/commit/310df47b26ac63c9023abdb603130616470cd1f2))
* ajustar modulo accounts e adicionar validacao estrutural para suportar database design ([26d2886](http://gitea:3000/nilbyte-studios/mirante/commit/26d2886bf6130e5d22c9e38fd4de64e06670835d))
* **backend:** aprimora importação csv com dedupe, parcelas e canais ([19f0fea](http://gitea:3000/nilbyte-studios/mirante/commit/19f0feac2bf2b12a7c73f6d713163b0b5f43ae02))
* expandir o gerenciamento de transações para incluir logs de manutenção de veículos e ajustar a estrutura de dados para suportar novos campos de manutenção ([d6ccabc](http://gitea:3000/nilbyte-studios/mirante/commit/d6ccabc882ac9b8ed256064a105123a6ca10924f))
* habilitar CORS, exportar o UsersService e ajustar a tipagem na inicialização do PrismaPg. ([f937585](http://gitea:3000/nilbyte-studios/mirante/commit/f9375857b9fd0d89f6a866d3badd10b937afea42))
* Implement core backend services and database schema for users, transactions, and vehicles, alongside initial web app routes and components. ([7419ee8](http://gitea:3000/nilbyte-studios/mirante/commit/7419ee861a53055bb9f282319a18b5df6ebbf26a))
* implementar auth guard global da workos convertendo para internal user id ([cb76230](http://gitea:3000/nilbyte-studios/mirante/commit/cb76230a9a2c32c17f15aa74c9c84e72f1bfe104))
* implementar scaffold e serviços do backend NestJS ([865d669](http://gitea:3000/nilbyte-studios/mirante/commit/865d669e3a45c7aa3cc990f51b1dcfbdbc52ae81))
* implementar suporte a accounts, categories e budgets no backend ([18a6dd0](http://gitea:3000/nilbyte-studios/mirante/commit/18a6dd00265047b170807f6a00fb2011f687742a))
* implementar validadores e transformer de classes para a manipulacao de transacoes ([8dfc039](http://gitea:3000/nilbyte-studios/mirante/commit/8dfc0397de29afccf14a2169bb1723b73d803e64))
* integrar gerenciamento de logs de abastecimento em transações e ajustar modal de edição ([2175663](http://gitea:3000/nilbyte-studios/mirante/commit/21756633e970d1abc3c83dd5fce6489d51caa7d4))
* refatorar module de budgets com dotos de validacao e safe typing para db ([fc129f6](http://gitea:3000/nilbyte-studios/mirante/commit/fc129f678dc944d665832c7946eb5cf2d85ff760))
* refatorar modulo categories com dtos para tipagem restrita ([46d2a0c](http://gitea:3000/nilbyte-studios/mirante/commit/46d2a0c50e13dfbcb7076e1579600c90995775a0))
* refatorar modulo goals com validacao estrita de dotos e parsing de prisma decimal ([25ccad4](http://gitea:3000/nilbyte-studios/mirante/commit/25ccad42047dad44ead27a6314452289cd0f358f))
* renomear campo 'make' para 'brand' e adicionar suporte a ícones de marcas de veículos ([e964356](http://gitea:3000/nilbyte-studios/mirante/commit/e964356865bad8c1a680125ce34faf61d682c8a7))
* unificar crédito/débito na conta e adicionar metadados de titularidade ([6406a61](http://gitea:3000/nilbyte-studios/mirante/commit/6406a61f639e4527c20fdddfd5a3cb849177c15c))


### Bug Fixes

* ajustar calculo de contabilização de receitas baseada em transações deletadas ([7ed16a7](http://gitea:3000/nilbyte-studios/mirante/commit/7ed16a77cf71946be6a5c9e71045ffd92d7c50b5))
* resolver vulnerabilidades de segurança de alta prioridade ([daa79a8](http://gitea:3000/nilbyte-studios/mirante/commit/daa79a87290758fbbd9ce66fd85a2c394a0d015c))
