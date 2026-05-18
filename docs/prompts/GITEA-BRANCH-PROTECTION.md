# Gitea: Proteção de Branch via API

Documentação de referência para configurar e manter regras de proteção de branch no Gitea usando `curl` com o token da CLI `tea`.

---

## Pré-requisitos

Token disponível em `~/.config/tea/config.yml`:

```bash
grep token ~/.config/tea/config.yml
# token: <SEU_TOKEN>
```

---

## Listar regras existentes

```bash
curl -s "https://gitea.nilbyte.com.br/api/v1/repos/tallyoh/<repo>/branch_protections" \
  -H "Authorization: token <TOKEN>" | python3 -m json.tool
```

---

## Criar regra de proteção

Bloqueia push direto, exige que os status checks passem e impede admin de fazer bypass:

```bash
curl -s -X POST \
  "https://gitea.nilbyte.com.br/api/v1/repos/tallyoh/<repo>/branch_protections" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "branch_name": "main",
    "enable_push": false,
    "enable_status_check": true,
    "status_check_contexts": [
      "onpullrequest / build-backend (pull_request)",
      "onpullrequest / build-onboarding (pull_request)"
    ],
    "block_admin_merge_override": true,
    "required_approvals": 0
  }'
```

### Campos principais

| Campo | Tipo | Descrição |
|---|---|---|
| `enable_push` | bool | `false` = bloqueia push direto na branch |
| `enable_force_push` | bool | `false` = bloqueia force push |
| `enable_status_check` | bool | `true` = exige checks para merge |
| `status_check_contexts` | array | Nomes exatos dos checks obrigatórios |
| `block_admin_merge_override` | bool | `true` = admin também não pode fazer bypass |
| `required_approvals` | int | Número mínimo de aprovações em code review |
| `block_on_rejected_reviews` | bool | `true` = bloqueia se houver review rejeitado |
| `block_on_outdated_branch` | bool | `true` = exige branch atualizada com a base |

---

## Atualizar regra existente

```bash
curl -s -X PATCH \
  "https://gitea.nilbyte.com.br/api/v1/repos/tallyoh/<repo>/branch_protections/main" \
  -H "Authorization: token <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"block_admin_merge_override": true}'
```

Envie apenas os campos que deseja alterar.

---

## Como descobrir o nome exato dos status checks

O nome do check no Gitea Actions segue o padrão:

```
<nome-do-workflow> / <nome-do-job> (<evento>)
```

Exemplo: workflow `onpullrequest`, job `build-backend`, evento `pull_request`:

```
onpullrequest / build-backend (pull_request)
```

Para confirmar os nomes, consulte a aba **Checks** de qualquer PR aberto no repositório antes de cadastrar na regra.

---

## Remover regra

```bash
curl -s -X DELETE \
  "https://gitea.nilbyte.com.br/api/v1/repos/tallyoh/<repo>/branch_protections/main" \
  -H "Authorization: token <TOKEN>"
```

---

## Configuração aplicada no tallyoh-baas-api

Branch protegida: `main`

```json
{
  "enable_push": false,
  "enable_status_check": true,
  "status_check_contexts": [
    "onpullrequest / build-backend (pull_request)",
    "onpullrequest / build-onboarding (pull_request)"
  ],
  "block_admin_merge_override": true,
  "required_approvals": 0
}
```
