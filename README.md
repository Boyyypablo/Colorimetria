# Glowing

Produto web de **colorimetria pessoal** (*Colorimetria & Estética*): análise sazonal CIELAB → 12 estações, recomendações e looks, com fluxo híbrido self-service + consultora.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **PostgreSQL próprio** (Docker Compose, porta **5433**) + Prisma — **sem Supabase**
- Auth.js (email/senha)
- Storage local privado em `uploads/` (servido só via API autenticada)
- Looks de roupa: catálogo próprio na análise (silhuetas + paleta). VTO cloud (HF/Gemini/fal) estacionado sem crédito.

## Subir o ambiente

```bash
# 1) Postgres (porta 5433 — evita conflito com outros Postgres locais)
npm run db:up

# 2) Dependências (se ainda não)
npm install

# 3) Migrar + seed (12 paletas + usuários demo)
npx prisma migrate dev --name init
npm run db:seed

# 4) App
npm run dev
```

Abra http://localhost:3000

### Contas demo (seed local)

Só existem no Postgres de **localhost**. O seed **não** cria admin/consultora se `NODE_ENV=production` ou se `DATABASE_URL` não for loopback. Nunca rode `db:seed` contra o banco de produção (nem via `ssh -L`).

| Email | Senha | Papel |
|-------|-------|-------|
| `usuaria@colometria.app` | `t1234@` | Usuária |
| `consultora@colometria.app` | `t1234@` | Consultora |
| `admin@colometria.app` | `t1234@` | Admin |

## Variáveis

Copie `.env.example` → `.env`. Principal: `DATABASE_URL` (padrão `localhost:5433`).

## Testes externos via túnel (sem VPS)

Com o app local + Postgres Docker, exponha só a porta 3000:

```bash
npm run db:up
npm run dev
# em outro terminal:
npm run tunnel
```

Copie a URL `https://….trycloudflare.com` e envie aos testadores.  
Opcional: coloque essa URL em `AUTH_URL` no `.env` e reinicie o `npm run dev`.

Requisito: [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (`winget install Cloudflare.cloudflared`).

## Deploy em VPS (Docker)

Stack completa no servidor: app Next.js + Postgres **só na rede interna** (porta do banco não fica pública).

```bash
# Na VPS (Ubuntu/Debian com Docker + Compose)
git clone https://github.com/Boyyypablo/Colometria.git
cd Colometria
cp .env.production.example .env.production
# Edite AUTH_URL, AUTH_SECRET, POSTGRES_PASSWORD, HF_TOKEN

chmod +x scripts/vps-up.sh
./scripts/vps-up.sh
```

- App: `http://SEU_IP:3000` (ou domínio atrás de Caddy/Nginx + HTTPS)
- Crie a conta pela UI de registro. **Não** use o seed de usuários demo na VPS.
- Firewall: liberar só `22` e `3000` (ou `80/443` se usar proxy)

## Testes

```bash
npm test
```

## Estrutura do repositório

| Pasta | Função |
|-------|--------|
| `src/` | App Next.js (UI, API, libs) |
| `prisma/` | Schema e migrations |
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

### Consultora online (Vercel)

Ollama só existe no PC. No ar, o **plano da consultora é montado pelos cards e pela rubrica** — sem token, sem Gemini. A estação continua vindo das regras CIELAB.

No painel da Vercel (opcional; o código já cai nisso se `CONSULTANT_AI=ollama`):

- `CONSULTANT_AI` = `cards`

O resultado mostra o mesmo bloco “Plano personalizado”, alinhado à intenção e à cartela medida. LLM local (Qwen) permanece só em desenvolvimento.

