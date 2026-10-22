# Handoff para outra IA — Somma

Guia para continuar o trabalho sem o histórico da conversa. Leia junto com
[`2026-10-contas-cartoes-e-deploy.md`](2026-10-contas-cartoes-e-deploy.md),
que descreve o que foi feito e as regras de negócio. Este arquivo cobre o
**como**: ambiente, comandos, armadilhas, convenções e próximos passos.

## 1. Quem é o usuário e como ele trabalha

- Dev solo; praticamente o único usuário do produto. Escreve em português,
  rápido e com erros de digitação — interprete a intenção.
- Commits direto na `main`, sem branches (pedido explícito).
- Gosto visual: **reto, quadrado, neutro, minimalista**. Nada de emojis,
  gradientes, sombras, cantos arredondados ou cores fortes. Referência de
  padrão correto: a página `/app/accounts`.
- Quer ver o resultado funcionando: teste no navegador e tire screenshot antes
  de dizer que terminou.
- Os dados locais são de teste ("é tudo teste"), mas confirme antes de apagar
  coisas em produção.
- Responda em português do Brasil.

## 2. Mapa do repositório (`~/Workspace/nilbyte/somma`)

| Pasta | O quê |
|---|---|
| `backend/` | API Go (versão mínima, sqlc + pgx). Entrada `cmd/api/main.go`, rotas em `internal/routes/routes.go`, handlers em `internal/handlers/` |
| `backend/internal/database/` | Código gerado pelo sqlc (`*.sql.go`), `schema.sql` (só para o sqlc), queries em `queries/*.sql` |
| `database/` | Migrations (`migrations/`, golang-migrate), seeds, binário `cmd/migrate` (`up`, `down`, `version`, `seed-complete`, `seed-barebones`) |
| `web/` | React 19 + Vite + TanStack Query. Páginas em `src/pages`, componentes em `src/components`, API em `src/api`, tipos em `src/types.ts`, CSS global em `src/index.css` |
| `app/` | App mobile (Expo). **Fora de escopo**; tem alterações locais não commitadas — não mexa nem commite |
| `.gitea/workflows/onmain.yml` | CI: build/push das imagens e deploy por SSH |
| `docs/` | Documentação (este arquivo) |

Repositório irmão relevante: `~/Workspace/nilbyte/infrastructure`
(`apps/infra/somma/docker-compose.expenses-*.yml`, `nginx.expenses-web.conf`) —
é o que roda no servidor. Não foi alterado.

## 3. Ambiente local

```bash
cd ~/Workspace/nilbyte/somma
make up            # Postgres :5454, migrate + seed, backend :3300, web :3400 (hot reload)
```

- Containers: `somma-db-local` (Postgres), `somma-backend-dev` (Go + Air),
  `somma-web-dev` (Vite). Rede docker `somma-dev`.
- **Não rode `make up`/`make db-setup` de novo sem necessidade**: eles rodam o
  seed e podem recriar dados fictícios. Para só migrar: `make migrate-up`.
- Login local: `nilton.naab@gmail.com` / `dev-password-123`
  (user id `d290f1ee-6c54-4b01-90e6-d701748f0851`).
- Se o Docker falhar com `failed to start shim`/containerd: precisa de
  `sudo systemctl restart containerd docker` — peça ao usuário rodar com `!`.

### Comandos úteis

```bash
# backend: formatar, checar, testar, compilar (dentro do container, que tem Go)
docker exec somma-backend-dev sh -c 'cd /app && gofmt -w internal/ && go vet ./internal/handlers/ ./internal/routes/ && go test ./internal/handlers/ ./internal/models/ && go build ./...'

# web: type-check
docker exec somma-web-dev npx tsc -b

# sqlc (não está instalado; use a imagem)
cd backend && docker run --rm -v "$PWD:/src:z" -w /src sqlc/sqlc:1.27.0 generate

# banco local
docker exec somma-db-local psql -U postgres -d somma -c "..."
docker exec -i somma-db-local psql -U postgres -d somma -v ON_ERROR_STOP=1 <<'SQL' ... SQL   # note o -i para heredoc

# token para testar a API com curl
TOK=$(curl -s -X POST localhost:3300/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"nilton.naab@gmail.com","password":"dev-password-123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s localhost:3300/api/v1/accounts -H "Authorization: Bearer $TOK"
```

O backend recarrega sozinho (Air) alguns segundos depois de salvar; espere
~5 s antes de testar com curl.

### Screenshots logado (Chrome headless + CDP)

Não há Playwright. Há `google-chrome` e Node 22 (WebSocket nativo). O script
abaixo faz login de verdade (cookie), abre a URL, roda um JS opcional e salva
o PNG. Guarde em um diretório temporário e rode com
`node shot.mjs <url> <saida.png> [largura] [altura] [js]`.

```js
import { spawn } from 'node:child_process'
const [url, out, w = '1440', h = '1100', js = ''] = process.argv.slice(2)
const port = 9333 + Math.floor(Math.random() * 500)
const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/shot-${port}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let target
for (let i = 0; i < 50; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); if (target) break } catch {} await sleep(200) }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
let id = 0; const pending = {}
ws.onmessage = e => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m.result); delete pending[m.id] } }
const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })) })
const ev = expression => send('Runtime.evaluate', { expression, awaitPromise: true })
const origin = new URL(url).origin
await send('Page.navigate', { url: origin + '/login' }); await sleep(1500)
await ev(`fetch('/api/auth/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'nilton.naab@gmail.com',password:'dev-password-123'})}).then(()=>{localStorage.setItem('somma:authed','1');localStorage.setItem('somma:email','nilton.naab@gmail.com')})`)
await send('Page.navigate', { url }); await sleep(3000)
if (js) { await ev(js); await sleep(1200) }
const { data } = await send('Page.captureScreenshot', { format: 'png' })
;(await import('node:fs')).writeFileSync(out, Buffer.from(data, 'base64'))
ws.close(); chrome.kill(); process.exit(0)
```

Para preencher inputs controlados pelo React no JS injetado, use o setter nativo
e dispare o evento (`input` para input, `change` para select):

```js
const setIn=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
const setSel=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('change',{bubbles:true}))};
```

Para digitar tecla a tecla (testar o `MoneyInput`), use `Input.insertText` via CDP.

## 4. Armadilhas já encontradas

1. **Dois schemas.** O banco real vem de `database/migrations`. O
   `backend/internal/database/schema.sql` existe só para o sqlc e precisa ser
   mantido em sincronia manualmente para as tabelas usadas por queries sqlc
   (`accounts`, `transactions`). `credit_cards` e `categories` no `schema.sql`
   descrevem **outro** formato (usado pelo `card_service` legado); por isso
   `handlers/creditcards.go` e `handlers/categories.go` usam pgx direto.
2. **IDs são TEXT**, não UUID: contas do seed têm ids como `acc-nubank`. Em
   `schema.sql`, `accounts.id`, `transactions.*_id` são TEXT. `users.id` e
   `accounts.user_id` continuam `pgtype.UUID` no código gerado.
3. **Enums do Postgres** (`transaction_direction`, `transaction_kind`,
   `transaction_status`) aparecem como VARCHAR no `schema.sql`; nas queries,
   leia com `::TEXT` (`type::TEXT AS type`).
4. **sqlc**: reutilizar o mesmo `@param` duas vezes ou `@x::BIGINT - coluna`
   quebrou a geração ("edited query syntax is invalid"). Use parâmetros
   posicionais (`$9, $9`) ou faça a conta em Go.
5. **Pico CSS** (`pico.classless` via CDN no `index.html`) estiliza `input`,
   `button`, `article`, `table`, `kbd` sozinho e aumenta a fonte raiz em telas
   largas. O app fixa `html:has(.app-nav) { font-size: 15px }`. Para
   sobrescrever, use seletores mais específicos (`.drawer-panel .drawer-input`)
   ou `:where()` para resets de margem. Há uma regra global no app que zera
   `border-radius` e `box-shadow` (exceto classes com `spinner`, `dot`, `pulse`).
6. **CSS em camadas**: `src/index.css` tem os estilos antigos no início e
   blocos de override no fim ("Flat theme (app)", "Página de contas", "Drawer
   de lançamento", "Lançamentos: tipografia maior", "Projeções"…). Acrescente
   no fim, no bloco certo, em vez de editar as regras antigas.
7. **Autenticação**: o web usa cookie `somma_session` (`credentials: 'include'`);
   o middleware aceita cookie ou `Authorization: Bearer`. Em 401, o
   `src/api/client.ts` limpa `localStorage` e manda para `/login`.
8. **Saldo calculado**: não grave saldo em `balance_cents` ao criar/editar
   lançamento. O saldo vem de `ListAccountBalances` (base + lançamentos até agora).
9. **Datas**: use `parseDay`/`dayTimestamp` (`handlers/ledger.go`), que tratam
   o dia em Brasília e gravam ao meio-dia. O web compara `tx.date.slice(0, 10)`.
10. **Migrations e produção**: a produção está (ou estará) na versão do
    servidor; **nunca reutilize um número já aplicado lá**. Antes de criar uma
    migration, confira `git ls-tree --name-only gitea/main database/migrations/`.
    Valide em banco temporário: `create database x`, rode
    `docker run --rm --network somma-dev -e DATABASE_URL=postgresql://postgres:postgres@somma-db-local:5432/x?sslmode=disable --entrypoint ./migrate somma-database-dev up`
    (rebuild da imagem com `make migrate-image` antes), depois `drop database x`.
11. **Modo automático do Claude Code** bloqueou: consulta à API do Gitea,
    leitura de variáveis de ambiente em produção e qualquer etapa da troca do
    banco de produção. Não contorne; peça ao usuário regras em `/permissions`.
12. **Remotes git**: `origin` envia para Gitea **e** GitHub; o usuário pediu
    "pelo Gitea" — use `git push gitea main`.

## 5. Convenções de código

- UI, mensagens de erro da API e comentários em **português**. Nomes de
  identificadores em inglês, como o resto do código.
- Comentários curtos explicando o porquê, no mesmo tom dos existentes.
- Valores em dinheiro: centavos (`int64`) no backend; reais (`number`) na API e
  no web; `formatMoney` (`web/src/lib/format.ts`) para exibir; `MoneyInput` para
  campos de valor.
- Componentes visuais seguem o padrão da página de contas: classes `acc-*`
  (`acc-summary`, `acc-group-head`, `acc-row`, `acc-num`), `config-section`,
  `config-title`, botões `btn-action-sm`.
- Commits: Conventional Commits em inglês, com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` no fim.
- Não commitar: `app/`, binários (`backend/api`, `backend/tmp/`, `tmp/` já no
  `.gitignore`), `.legacy/`.

## 6. Produção

- Servidor `niflheim`. Acesso SSH funcionando: `ssh niflheim-backup`
  (IP público, usuário `notNilton`). O alias `niflheim` usa Tailscale e não
  conecta desta máquina.
- Containers: `nilbyte_postgres_prod` (banco `somma`, compartilhado com o app
  de veículos), `somma_migrate_prod`, `somma_expenses_backend_prod`,
  `somma_expenses_web_prod` (nginx com `/api/` → backend:3300),
  `somma_vehicles_*`, `somma_doc_prod`.
- Web: https://sommae.nilbyte.com.br (`somma.nilbyte.com.br` também responde).
- Deploy: push na `main` → CI builda `expenses-backend`/`expenses-web` → job
  `deploy` faz `docker compose pull` + `up -d` em
  `/home/notNilton/infrastructure/apps/infra/somma`. O migrate roda antes do backend.
- Para saber se o deploy entrou: o `index.html` aponta para um bundle novo
  (`/assets/index-*.js`) que contém "Pagar fatura". O bundle antigo era
  `/assets/index-VhhpjoD1.js`. Ou `docker ps` no servidor (containers recriados).

## 7. Próximos passos, em ordem

1. **Conferir o deploy de 22/10** (commit `60b2b96`). Se o pipeline falhou,
   ver o log em Actions no Gitea e corrigir; candidatos: rede do runner no
   `docker build` (o README antigo do CI menciona `--network=host`) e a imagem
   `golang:1.26-alpine`.
2. **Trocar o banco de produção pelo local** (usuário autorizou; precisa de
   regras de permissão). Só depois do item 1. Passos:
   ```bash
   # local
   docker exec -i somma-db-local psql -U postgres -d somma -v ON_ERROR_STOP=1 < database/migrations/000025_vehicles_and_refueling.up.sql
   docker exec somma-db-local pg_dump -U postgres -d somma -Fc --no-owner --no-acl > ~/somma_local.dump
   scp ~/somma_local.dump niflheim-backup:~/
   # servidor (ssh niflheim-backup)
   docker exec nilbyte_postgres_prod pg_dump -U somma -d somma -Fc > ~/somma_prod_backup_$(date +%F_%H%M).dump
   docker stop somma_expenses_backend_prod somma_vehicles_backend_prod
   docker exec nilbyte_postgres_prod psql -U somma -d somma -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
   docker exec -i nilbyte_postgres_prod pg_restore -U somma -d somma --no-owner --no-acl < ~/somma_local.dump
   docker start somma_expenses_backend_prod somma_vehicles_backend_prod
   ```
   Confira o usuário do banco no `DATABASE_URL` do container do backend antes
   (padrão do compose: `somma`). Depois, login em produção e pedir ao usuário
   para trocar a senha (a de dev passa a valer).
3. **Faturas por mês**: agrupar compras no crédito por ciclo (fechamento da
   conta), mostrar "fatura de outubro: R$ X, vence dia N" e pagar uma fatura
   específica. A tabela `card_invoice_payments` (migration 26) existe e não é usada.
4. **Recorrência sem fim**: ligar um job que estende as séries mensais
   (o `jobs/recurring_transactions.go` atual não conhece conta/cartão e não
   está ligado no `main.go`).
5. **Backend das telas restantes** (orçamentos, metas, importação,
   configurações, relatórios): portar do backend completo do commit `ab24ead`
   (`git show ab24ead:backend/internal/handlers/<arquivo>.go`), adaptando ao
   padrão atual.
6. Gerenciar categorias pelo app; atualizar o seed com contas/categorias reais;
   apagar componentes sem uso (`CardsSettingsSection.tsx`,
   `CardInvoicesModal.tsx`, `FutureInstallmentsModal.tsx`).

## 8. Como verificar que nada quebrou

- `go vet`, `go test ./internal/handlers/ ./internal/models/` e `npx tsc -b`
  sem erros.
- Saldos das contas iguais antes e depois (via `GET /api/v1/accounts`).
- Screenshots de `/app`, `/app/accounts`, `/app/projections` e do painel
  `/app/new` (abas Lançamento, Transferência, Pagar fatura), em 1440 px e 390 px.
- Dados de teste criados nos testes (descrição começando com `TESTE`) apagados
  no fim: `delete from transactions where description like 'TESTE%'`.
