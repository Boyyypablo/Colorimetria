# Supabase (banco online — free)

Projeto **colometria** provisionado via MCP (custo **US$ 0**/mês).

| Campo | Valor |
|-------|--------|
| Project ref | `ismrqprvcfgrwhkyriox` |
| Região | `sa-east-1` (São Paulo) |
| Dashboard | https://supabase.com/dashboard/project/ismrqprvcfgrwhkyriox |
| Host DB | `db.ismrqprvcfgrwhkyriox.supabase.co` |

Schema Prisma aplicado + 12 paletas. **Sem usuários demo** em produção.

## Modelo de acesso (máxima proteção)

Este app **não** usa Supabase Auth / client JS no browser.

1. **Servidor Node** fala com o Postgres (Prisma + `DATABASE_URL`): o Next e o `consultant-desk`. O browser não.
2. **Data API / PostgREST fechada** para as tabelas da app:
   - `REVOKE` de `anon`, `authenticated` e `PUBLIC`
   - **RLS ligado** e **nenhuma policy** para `anon`/`authenticated` → zero linhas via API REST mesmo com a chave `anon`
   - A migration `20261116010000_desk_chat_persistence` repete esse par (`ENABLE ROW LEVEL SECURITY` + `REVOKE`) em `DeskReview`, `DeskThread`, `DeskMessage` e `DeskThreadTransfer`
3. **Nunca** coloque `NEXT_PUBLIC_SUPABASE_URL`, `anon` key ou `service_role` no front.
4. Fotos continuam em disco/`UPLOAD_DIR` (ou Blob depois) — **não** Storage público do Supabase por enquanto. O desk guarda anexo de chat como data URL dentro de `DeskMessage.attachments` (até 2 MB × 3), não no Storage.

O advisor “RLS Enabled No Policy” é **esperado** (é o modo “deny all” na Data API).

## Colar a senha (1 passo manual)

O MCP não devolve a senha do role `postgres`. No dashboard:

1. [Database Settings](https://supabase.com/dashboard/project/ismrqprvcfgrwhkyriox/settings/database)
2. Copie a **URI** (Connection string → URI) modo **Direct** (porta 5432) ou **Session pooler**
3. Cole em `.env` / `.env.production` como `DATABASE_URL="postgresql://..."`

Formato típico (direct):

```text
postgresql://postgres:[SUA-SENHA]@db.ismrqprvcfgrwhkyriox.supabase.co:5432/postgres?sslmode=require
```

## Checklist dashboard (recomendado)

Em **Project Settings → API**:

- Não use a chave `anon` / publishable no app Glowing
- Em **Data API**: deixe schemas expostos o mais vazio possível (ideal: nenhum schema da app)

Em **Authentication**: pode ficar desligado — login é Auth.js no Next.

Em **Storage**: não criar buckets públicos.

## Desenvolvimento

`npm run db:up` não sobe container: sai com código 1. Banco do dia a dia é a `DATABASE_URL` deste guia. Postgres local só com `docker compose --profile legacy-local up -d` e URL em `127.0.0.1:5433` (credenciais no `docker-compose.yml`).

Antes do desk ou do app: `npx prisma migrate deploy` nessa URL. O desk lê o `.env` da raiz e depois `consultant-desk/backend/.env`.

`docker-compose.prod.yml` ( `npm run vps:up` ) sobe **outro** Postgres e força a `DATABASE_URL` do container `app` para ele. Não assume que a VPS usa este projeto Supabase. Detalhe no README.

## Cloudflare / Neon

Abandonados para este projeto (R2 cobrava; Neon ficou órfão). O que ainda está em [`cloudflare.md`](./cloudflare.md) é histórico. Banco online: este Supabase.
