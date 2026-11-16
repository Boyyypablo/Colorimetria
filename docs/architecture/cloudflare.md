# Deploy Cloudflare (legado)

> **Descontinuado para o Glowing.** R2 exigia plano pago. Banco online agora é **Supabase free** — ver [`supabase.md`](./supabase.md).

Estado histórico: preparação Hyperdrive + Postgres. Conta Cloudflare existia; R2 bloqueou no checkout.

## Decisão de banco

| Opção | Usar? | Motivo |
|-------|-------|--------|
| **PostgreSQL + Hyperdrive** | **Sim** | Mantém `prisma/` e migrations atuais |
| D1 (SQLite) | Não | Exigiria reescrever enums/JSON/migrations e retestar tudo |

O Cloudflare **não hospeda o Postgres da aplicação**. Ele oferece:

1. **Hyperdrive** — pool de conexões na borda até um Postgres (Neon, Prisma Postgres, RDS, etc.)
2. **R2** — object storage (fotos no lugar de `uploads/` / Vercel Blob)
3. **Workers / Pages** — runtime do app (fase 2; ver limites abaixo)

## Fase 0 — agora (feito no repo)

- Schema continua `provider = "postgresql"`
- Local: `DATABASE_URL` → Docker `localhost:5433`
- Arquivos: `.env.cloudflare.example`, `wrangler.jsonc`, `.env.production` (local, gitignored)
- Cliente Prisma já aceita aliases de URL (Neon/Hyperdrive)

### Já provisionado (MCP, 2026-11-15)

| Recurso | Valor |
|---------|--------|
| Cloudflare account | `a3141ca352baaf12bdc4c24eddbf29af` |
| Neon project | `colometria` / `royal-mountain-27391011` (us-east-1, PG16) |
| Hyperdrive | `colometria-pg` / `08003e727a194db19303e9a6ab6963fd` |
| Migrations + seed paletas | aplicados no Neon (`ALLOW_DEMO_SEED=false`) |
| R2 | **pendente** — ativar no dashboard (checkout free) |

Credenciais: só em `.env.production` (não versionado).

## Fase 1 — o que falta (R2 + app online)

1. Ativar R2 (uma vez, no browser):
   [R2 Overview](https://dash.cloudflare.com/a3141ca352baaf12bdc4c24eddbf29af/r2/overview) → aceite o plano free.
2. Depois avise — criamos o bucket `colometria-uploads` via MCP/API.
3. App online: ainda pode ser VPS/Docker com `DATABASE_URL` de `.env.production`, ou Workers (OpenNext/vinext) com binding Hyperdrive.

## Fase 2 — app na borda (opcional, depois do banco)

Este app usa **Sharp + TensorFlow/BlazeFace + `maxDuration` alto** na análise. Workers têm limites de CPU/memória/tempo.

Ordem sugerida:

1. **Banco cloud + Hyperdrive** (Fase 1) — obrigatório para “online”
2. App ainda em **VPS Docker** ou outro host Node, apontando `DATABASE_URL` para o Postgres cloud
3. Só então avaliar **OpenNext / vinext** no Workers, com:
   - `@prisma/adapter-pg` + Hyperdrive (`maxUses: 1` por request)
   - `nodejs_compat`
   - R2 para imagens
   - Análise pesada eventualmente em **Cloudflare Containers** ou job fora do Worker

## Variáveis (produção)

Ver `.env.cloudflare.example`. Mínimo:

- `DATABASE_URL` — Postgres cloud (direct/pooled conforme o provedor)
- `AUTH_SECRET` / `AUTH_URL` — URL pública HTTPS
- `CONSULTANT_AI=none`
- `ALLOW_DEMO_SEED=false`
- R2 ou Blob para uploads (disco local da VPS também serve na Fase 1–2 híbrida)

## O que não fazer

- Não trocar `provider` do Prisma para `sqlite`/D1 sem projeto explícito
- Não rodar `db:seed` demo em produção
- Não commitar `wrangler` secrets / connection strings reais
