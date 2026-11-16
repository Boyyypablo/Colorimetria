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

1. **Só o servidor Next** fala com o Postgres (Prisma + `DATABASE_URL`).
2. **Data API / PostgREST fechada** para as tabelas da app:
   - `REVOKE` de `anon`, `authenticated` e `PUBLIC`
   - **RLS ligado** em todas as 12 tabelas
   - **Nenhuma policy** para `anon`/`authenticated` → zero linhas via API REST mesmo com a chave `anon`
3. **Nunca** coloque `NEXT_PUBLIC_SUPABASE_URL`, `anon` key ou `service_role` no front.
4. Fotos continuam em disco/`UPLOAD_DIR` (ou Blob depois) — **não** Storage público do Supabase por enquanto.

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

## Cloudflare / Neon

Abandonados para este projeto (R2 cobrava; Neon ficou órfão). Preferir Supabase free + app Node/VPS.
