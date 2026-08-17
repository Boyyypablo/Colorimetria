# Colometria — Living QA Docs

Árvore canônica de QA real-user. Planejamento: skill `qa-report`. Execução: skill `qa-execution`.

## Area codes

| Código | Escopo |
|--------|--------|
| `AUTH` | Cadastro, login, sessão, LGPD |
| `ANL` | Upload, análise CIELAB, resultado sazonal |
| `DSH` | Dashboard / histórico de análises |
| `CNS` | Fila e aprovação da consultora |
| `VTO` | Simulação visual (drape / blusa) |

## Entry points

| URL | Quem | Notas |
|-----|------|-------|
| `http://localhost:3000/` | público | Landing → register / analyze |
| `/login` | público | Demo local: `usuaria@colometria.app` / `t1234@` |
| `/register` | público | Checkbox LGPD obrigatório |
| `/dashboard` | USER+ | Lista de análises |
| `/analyze` | USER+ | Upload + consentimento biométrico |
| `/analyses/[id]` | dona ou staff | Resultado, VTO, pedir revisão |
| `/consultant` | CONSULTANT / ADMIN | Fila de revisão |

Contas seed **só no Postgres local** (após `npm run db:seed`; bloqueadas em produção):

- `usuaria@colometria.app` / `t1234@` — USER  
- `consultora@colometria.app` / `t1234@` — CONSULTANT  
- `admin@colometria.app` / `t1234@` — ADMIN  

## Dev server

```bash
npm run db:up
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

App: `http://localhost:3000` · Postgres: `localhost:5433`.

Pré-condição de execução: suite automatizada verde (`npm test`) + build de paridade com auth real (sem mocks).

## Evidence policy

Padrão lean: `docs/qa/evidence/` é **gitignored**. Relatórios referenciam paths locais; só checkpoints e falhas. Vídeos/HAR ficam fora da árvore.

## Cadence atual

Bootstrap inicial — ciclo **smoke** em `charters/` (5 sessões; uma por jornada P0).

Taxonomia (planejamento): happy path + roles + upload/network cobertos. Adiado para ciclo full: Locale Tour, Paste/Autofill, Accessibility charter dedicado (persona Renata mapeada, sem sessão smoke).

Próximo passo: `qa-execution` — pré-condições: `npm test` verde + `npm run dev` com seed.
