# Glowing

Produto web de **colorimetria pessoal** (*Colorimetria & Estética*): análise sazonal CIELAB → 12 estações, recomendações e looks, com fluxo híbrido self-service + consultora.

## Stack

- Next.js (App Router) + TypeScript + Tailwind. Node `>=22` (`.nvmrc`).
- **PostgreSQL no Supabase** (`sa-east-1`) + Prisma. `npm run db:up` não sobe banco: encerra com erro de propósito.
- Auth.js (email/senha) — **sem** Supabase Auth no browser
- Storage local privado em `uploads/` (API autenticada)
- Estação: regras CIELAB. Plano da consultora: `CONSULTANT_AI` (`.env.example` usa `none`; vazio no código cai em `cards`)
- Fila da consultora: app separado em `consultant-desk/` (não sobe com o Next)
- Looks de roupa: catálogo próprio na análise. VTO cloud estacionado sem crédito.

## Subir o ambiente

```bash
cp .env.example .env
# Cole a DATABASE_URL do Supabase. Sem ela o Prisma não conecta.
# Guia: docs/architecture/supabase.md

npm install          # postinstall roda prisma generate
npx prisma migrate deploy
npm run dev          # http://localhost:3000
```

`npm run dev` força `NODE_ENV=development` (`scripts/dev.mjs`). Com `NODE_ENV=production` no ambiente, `next/font` + Turbopack quebram.

`npm run db:up` imprime que o Postgres Docker local foi descontinuado e sai com código 1. O Compose da raiz só sobe no profile `legacy-local`, em `127.0.0.1:5433`:

```bash
docker compose --profile legacy-local up -d
```

Nesse modo o `DATABASE_URL` tem que apontar para esse host. Usuário, senha e database estão no `docker-compose.yml`. O fluxo normal é o Supabase.

### Seed e contas demo

`npm run db:seed` grava as 12 paletas. As contas `usuaria@`, `consultora@` e `admin@` em `colometria.app` só são criadas quando `shouldSeedDemoUsers` (`src/lib/db/seed-policy.ts`) é verdadeiro:

- nunca com `NODE_ENV=production`
- nunca com `ALLOW_DEMO_SEED=false` (valor do `.env.example`)
- com `ALLOW_DEMO_SEED=true`, em qualquer host
- sem a variável, só se o host de `DATABASE_URL` for loopback

Senha dessas contas: `npm run db:set-demo-password -- "senha"` (mínimo 6). O script não imprime a senha. Não use seed de demo no banco de produção.

## Variáveis

Copie `.env.example` → `.env`. O exemplo já usa o pooler Supabase com `[REF]` e `[SENHA]` no lugar dos segredos. `ALLOW_DEMO_SEED=false`.

## Testes externos via túnel (sem VPS)

Com `DATABASE_URL` já preenchida, exponha só a porta 3000:

```bash
npm run dev
# em outro terminal:
npm run tunnel
```

Copie a URL `https://….trycloudflare.com` e envie aos testadores.  
Opcional: coloque essa URL em `AUTH_URL` no `.env` e reinicie o `npm run dev`.

Requisito: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (`winget install Cloudflare.cloudflared`).

## Supabase (banco da app)

Projeto `colometria` (São Paulo). Schema, 12 paletas e Data API fechada: [`docs/architecture/supabase.md`](docs/architecture/supabase.md).

1. Cole a `DATABASE_URL` do dashboard em `.env` (local) ou `.env.production` (host Node).
2. **Nunca** exponha chave `anon` / `service_role` no front.

## Dois jeitos de publicar — não misture

| Caminho | Banco que o app usa | Quando |
|---------|---------------------|--------|
| Host Node com `.env.production` copiado de `.env.production.example` | `DATABASE_URL` do Supabase | App fora do Compose |
| `npm run vps:up` (`scripts/vps-up.sh`) | Postgres **do** `docker-compose.prod.yml` | VPS com Docker |

O Compose de produção **não lê** a `DATABASE_URL` do arquivo de env para o serviço `app`. Ele força `postgresql://…@postgres:5432/…`. Exige `POSTGRES_PASSWORD`, `AUTH_SECRET` e `AUTH_URL`. O `.env.production.example` não traz `POSTGRES_PASSWORD`: copiar só esse arquivo e rodar `vps:up` falha. Esse Postgres da VPS não é o Supabase. O `consultant-desk` não entra em nenhum dos dois Composes.

```bash
git clone https://github.com/Boyyypablo/Colorimetria.git
cd Colorimetria
cp .env.production.example .env.production
# VPS/Compose: acrescente POSTGRES_PASSWORD, AUTH_SECRET, AUTH_URL
chmod +x scripts/vps-up.sh
./scripts/vps-up.sh
```

- App no Compose: porta `${APP_PORT:-3000}` (ou domínio atrás de Caddy/Nginx + HTTPS).
- O container define `NODE_ENV=production`, então o seed **não** cria contas demo.
- Firewall: liberar só `22` e a porta do app (ou `80/443` se usar proxy).

## Desk da consultora

Processos à parte, depois do `npm install` na raiz (o backend usa o Prisma gerado do monorepo):

```bash
cd consultant-desk/backend && npm install && npm run dev   # :4010
cd consultant-desk/frontend && npm install && npm run dev  # :5174
```

Contrato, auth e o que **não** está ligado ao chat do Next: [`consultant-desk/README.md`](consultant-desk/README.md).

## Testes

```bash
npm test
```

## Estrutura do repositório

| Pasta | Função |
|-------|--------|
| `src/` | App Next.js (UI, API, libs) |
| `consultant-desk/` | API Fastify (:4010) + UI Vite (:5174) da consultora |
| `prisma/` | Schema e migrations (inclui tabelas `Desk*`) |
| `data/` | Dados de domínio versionados (ex.: paletas) |
| `docs/` | Arquitetura do produto + QA |
| `scripts/` | Utilitários (build Vercel, ML export, VPS) |
| `aprendizado/` | **Única pasta de estudo/referência** (material + designs Figma) |
| `uploads/` | Imagens privadas (local, gitignored) |
| `artifacts/` | Exports ML (gitignored) |

## LGPD

Cadastro exige consentimento LGPD; upload exige consentimento biométrico. Imagens não vão para pasta pública.

## Colorimetria / IA

Plano vivo (face detect pluggable + modelo treinável): [`docs/architecture/colorimetry-ml.md`](docs/architecture/colorimetry-ml.md).

```bash
# .env
FACE_DETECTOR=blazeface   # heuristic só se quiser forçar o paraquedas
COLOR_PREDICTOR=rules     # trocar para tabular-v1 após treino
```

### Plano da consultora (não é o desk)

`resolveConsultantAiProvider` (`src/lib/ai/consultant-provider.ts`):

| `CONSULTANT_AI` | Efeito |
|-----------------|--------|
| `none` / `off` / `false` | Sem bloco de plano; coaching da paleta continua |
| `cards` ou vazio | Plano pela rubrica + knowledge cards |
| `ollama` | LLM local, só fora de serverless (`VERCEL` desliga e cai em `cards`) |
| `gemini` | Nuvem, só com chave (`GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY` ou `AI_GATEWAY_API_KEY`) |

A estação continua nas regras CIELAB. Esse plano não grava mensagem no desk.

