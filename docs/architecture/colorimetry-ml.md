# Colorimetria: face detect + IA treinável

Plano vivo do produto. Se um provider falhar em produção, **troca-se o adapter** — não o fluxo de negócio.

Documento irmão (roadmap detalhado): [`colorimetry-ml-roadmap.md`](./colorimetry-ml-roadmap.md).  
IA local sem tokens pagos + rubrica de avaliação: [`ia-local-conhecimento.md`](./ia-local-conhecimento.md).  
Melhorias seguintes: [`melhorias-sistema.md`](./melhorias-sistema.md).

## Objetivos

1. Identificar o rosto e amostrar só ROIs estáveis (bochechas, mandíbula, testa).
2. Evoluir de regras fixas para modelo treinável + calibração por pessoa.
3. Usar feedback (consultora + usuária) como ground truth do que ajuda ou não.

## Fases (resumo)

| Fase | Status | Entrega |
|------|--------|---------|
| 1 | **feita (commit)** | Face detect pluggable + ROI + features tipadas + stubs schema |
| 1b | **feita** | BlazeFace padrão (`FACE_DETECTOR=blazeface`; heuristic só fallback) |
| 2 | **parcial** | Feedback UI + `ml:export` + painel `/admin/ml` + correção de pele |
| 2b | **em curso** | Consultora IA (`intention` + plano flexível; visão híbrida) |
| 3 | planejada | Modelo tabular v1 + bias de estação (`UserColorProfile`) + retreino |

## Contrato de troca (adapters)

```
FACE_DETECTOR=heuristic|blazeface|onnx-yunet
COLOR_PREDICTOR=rules|tabular-v1
```

| Camada | Pasta | Hoje | Swap |
|--------|-------|------|------|
| Visão | `src/lib/vision/face/` | `blazeface` | env + implementar provider |
| Predição | `src/lib/color/predictor/` | `rules` | env + artefato `ModelVersion` |

Regras de resiliência:

1. Falha do detector ativo → fallback `heuristic` + warning em `photoQuality`.
2. Preditor desconhecido / artefato ausente → `rules`.
3. Bump de `featureSchemaVersion` exige migração de export + não misturar samples antigos no mesmo treino sem adapter.

### Providers de face

| Id | Deps | Quando usar | Critério de abandono |
|----|------|-------------|----------------------|
| `heuristic` | nenhuma | Fallback eterno / `FACE_DETECTOR=heuristic` | Nunca remover — é o paraquedas |
| `blazeface` | tfjs + blazeface | Selfies frontais melhores bbox | >15% fallback ou p95 latência >2s |
| `onnx-yunet` | onnxruntime-node | Escala / Node pesado | Se BlazeFace falhar em prod |

### ROIs amostrados

- `leftCheek`, `rightCheek` — **subtom** (prioridade em `labUndertone`)
- `forehead` — valor / luminosidade + consistência com bochecha
- `jaw` — validação cruzada
- `hair` — contraste pele×cabelo (`labHair`)
- `leftEye`, `rightEye` — contraste auxiliar (`labEyes`)
- Excluir boca do Lab de subtom

## Dados

Já no schema (Fase 1 foundation):

- `AnalysisSample` — features + predicted + label gold
- `FeedbackEvent` — HELPED / DID_NOT_HELP + `target`
- `UserColorProfile` — bias por usuária (uso na Fase 3)
- `ModelVersion` — artefato + metrics + `active`

Labels gold:

1. `ConsultantReview.overrideSeasonId` → `AnalysisSample.labelSeasonId`
2. Feedback de item → ranking / personalização (não substitui estação sozinho)

## LGPD

- Consentimento biométrico no upload (já existe).
- Imagens e crops só em `UPLOAD_DIR` privado.
- API cloud de face = **novo texto de consentimento** + DPA.
- **TTL:** `PHOTO_RETENTION_DAYS=365` (default) — `npm run retention:purge` remove análises/imagens/samples vencidos (`--dry-run`, `--days=N`).
- Export de treino: sem email/nome; só `userId` hash opcional.

## Calibração (caso Inverno Brilhante)

Erro observado: pele clara + contraste alto (cabelo/olhos escuros) + luz quente → **Primavera Clara** (e “evitar preto”), enquanto a cartela aprovada era **Inverno Brilhante**.

Correção em `predictor/rules.ts` (`resolveSeasonAxes`):

1. Valor efetivo usa gap pele×cabelo (pele clara + cabelo escuro ≠ estação “clara/suave”).
2. Contraste alto não mapeia para `light_spring`.
3. Cabelo escuro/frio + contraste alto corrige subtom “quente” induzido por luz → frio / `bright_winter`.
4. UI de confiança nunca mostra 100% sem selo real (cap 85%).

- `aprendizado/material/` (PDFs + vídeo) → conhecimento em `src/lib/color/season-knowledge.ts` + paleta `bright_winter` enriquecida.
- Coaching na entrega: cartela irmã, contraste, estilo, make, cabelo, fora da paleta.
- Objetivo de upload **`cabelo`**: tips de mechas + fundamentos (quente/frio, complementares).
- Extratos: `aprendizado/material/_extracted/` (não republicar conteúdo de terceiros).

## Manutenção contínua

1. Dashboard interno (ou query SQL) semanal: faceDetected %, NEEDS_REVIEW %, concordância consultora.
2. Abaixo do limiar → trocar `FACE_DETECTOR` / investigar ROI.
3. Retreino (Fase 3): `npm run ml:train` → nova `ModelVersion` → activate só após eval holdout ≥ baseline `rules`.

## Correção da pele

Camada opcional (`buildSkinCorrection`), ativada só pelos **objetivos do upload** (`Analysis.goals`: olheiras, manchas, vermelhidão, base). Feedback com target `correction:…`.

## Confiabilidade

- Confiança do `rules` calibrada e **capada em 85%** (sem selo consultora).
- `NEEDS_REVIEW` se confiança &lt; 55%, luz ruim, fallback de face ou subtom ambíguo (|temp| &lt; 3).
- Export: `npm run ml:export` → `artifacts/ml/YYYYMMDD/`.
- Painel: `/admin/ml` (role ADMIN).
