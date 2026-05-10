    # Guia de Migração para Monorepo

    Este documento descreve o processo utilizado para consolidar múltiplos repositórios independentes em um único **Monorepo**, preservando o histórico completo de commits de cada projeto.

    ## Estratégia Utilizada

    Para manter a integridade do histórico sem utilizar _git submodules_, utilizamos a técnica de **Git Remote Merging**. Este processo envolve importar cada repositório como um "remote", mesclar as histórias e reorganizar os arquivos em subpastas.

    ---

    ## Passo a Passo da Migração

    ### 1. Preparação do Monorepo

    Inicialização do novo repositório base:

    ```bash
    mkdir super-app-monorepo
    cd super-app-monorepo
    git init

    # Commit inicial vazio para estabelecer a base
    git commit --allow-empty -m "chore: inicializar monorepo"
    ```

    ### 2. Migração dos Serviços (Backend, Backoffice e Mobile)

    O processo seguiu o mesmo padrão para os três repositórios principais: `super-app-api`, `super-app-backoffice` e `super-app-mobile`.

    #### Exemplo: Migração do Backend (`apps/backend`)

    1.  **Adição do Remote:** Conectamos o repositório original como um remote temporário.

        ```bash
        git remote add origin-api ../super-app-api
        git fetch origin-api
        ```

    2.  **Merge do Histórico:** Realizamos o merge permitindo histórias não relacionadas.

        ```bash
        git merge origin-api/main --allow-unrelated-histories --no-commit
        ```

    3.  **Organização de Diretórios:** Movemos todos os arquivos para a estrutura de pastas do monorepo (`apps/backend`).

        ```bash
        mkdir -p apps/backend
        # Move todos os arquivos exceto a pasta apps/ e o próprio .git
        find . -maxdepth 1 ! -name . ! -name .git ! -name apps -exec git mv {} apps/backend/ \;
        ```

    4.  **Finalização:** Comitamos a mudança e removemos o remote temporário.
        ```bash
        git commit -m "feat: migrar backend para apps/backend mantendo histórico"
        git remote remove origin-api
        ```

    ### 3. Consolidação dos outros serviços

    O mesmo processo foi repetido para os outros módulos:

    - **Backoffice:** Movido para `apps/backoffice`.
    - **Mobile:** Movido para `apps/mobile`.

    ---

    ## Estrutura Final

    Após a migração, o repositório ficou estruturado da seguinte forma:

    ```text
    super-app-monorepo/
    ├── apps/
    │   ├── backend/      # Antigo super-app-api
    │   ├── backoffice/   # Antigo super-app-backoffice
    │   ├── personalledger-go/    # App Standalone (antigo super-app-mobile)
    │   └── personalledger-sdk/   # SDK simplificado
    ├── .gitea/           # Workflows de CI/CD centralizados
    ├── pnpm-workspace.yaml
    └── package.json
    ```

    ## Benefícios Alcançados

    1.  **Histórico Preservado:** É possível usar `git log` ou `git blame` em qualquer arquivo e ver o histórico desde a criação no repositório original.
    2.  **Facilidade de Desenvolvimento:** Código compartilhado e dependências podem ser gerenciados de forma centralizada via PNPM Workspaces.
    3.  **CI/CD Unificado:** Pipelines agora podem detectar alterações em pastas específicas e agir de acordo (ex: buildar apenas o que mudou).
