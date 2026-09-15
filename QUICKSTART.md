# Quick Start - PR #2 Local Development

## Setup Rápido (sem DATABASE_URL)

### 1. Instalar dependências
```bash
npm install
```

### 2. Gerar Prisma Client
```bash
bash scripts/prisma-generate-local.sh
```

Isso gera o Prisma Client TypeScript sem precisar de conexão com banco de dados.

### 3. Rodar dev server
```bash
npm run dev
```

### 4. Acessar
- App: http://localhost:3000
- Login: `usuaria@colometria.app` (ver seed script para senha)

---

## Troubleshooting

### Erro: "Unknown field `entitlement` on model Analysis"

**Fix:**
```bash
bash scripts/prisma-generate-local.sh
```

Isso regenera o Prisma Client com o schema atualizado.

### Erro: "Cannot find module '@prisma/client'"

**Fix:**
```bash
npm install
bash scripts/prisma-generate-local.sh
```

### Preciso aplicar migrations?

**Para desenvolvimento local:** Não! O script `prisma-generate-local.sh` só gera o client TypeScript.

**Para rodar com banco real:** Sim, você precisa:
1. Ter `DATABASE_URL` no `.env`
2. Rodar `npx prisma migrate dev` ou `npx prisma migrate deploy`

---

## Estrutura do PR #2

### Branches
- Base: `cursor/confidence-pipeline-audit-135f`
- Feature: `cursor/p0-confidence-implementation-2f6e`

### Principais mudanças
1. **P0 Pipeline:** Face detection, quality gates, confidence breakdown, sister seasons
2. **Figma specs:** Reject/retake flow, confidence UI, sister seasons card
3. **Day-1 lock:** Single SKU (Avaliação), removed consultant CTAs
4. **Produto fine-lock:** Face crop (25% padding), hard reject bad framing
5. **Paywall:** Backend completo (AnalysisEntitlement model, API endpoints)
6. **Offer UI v3.1:** FREE (station + blurb + video slot), PAID (frosted placeholders)

### Arquivos principais modificados
- `src/components/AnalyzeFormV2.tsx` - Flow completo (capture → reject → result)
- `src/components/analysis/AnalysisResultView.tsx` - Result UI com paywall
- `src/components/analysis/PaywallCard.tsx` - Paywall flow (S1→S2→S4)
- `src/app/analyses/[id]/page.tsx` - Server-side com entitlement check
- `prisma/schema.prisma` - AnalysisEntitlement model

---

## Known Issues

### Login via Cloudflare tunnel não funciona
**Workaround:** Use `localhost:3000` para QA visual.

### Vercel preview builds sem DATABASE_URL
**Esperado:** Funcionam para preview de UI, mas DB calls falham.

---

## Links Úteis

- **PR #2:** https://github.com/Boyyypablo/Colorimetria/pull/2
- **Docs:** `/workspace/docs/`
- **Design specs:** `/workspace/docs/design/landing-redesign-spec.md`
- **Paywall spec:** `/workspace/docs/offers/paywall-spec.md`
