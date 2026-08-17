# Roadmap — Colorimetria ML / Face / Personalização

Complemento operacional de [`colorimetry-ml.md`](./colorimetry-ml.md).  
**Não commitado ainda** — este arquivo é planejamento; implementação por fase após aprovação.

## 0. Estado atual (working tree)

Já existe (pendente de commit quando você pedir):

- Detector `heuristic` + factory com fallback
- Stubs `blazeface` / `onnx-yunet`
- Classificador usa bbox + ROIs; `labUndertone` nas bochechas
- Preditor `rules` atrás de interface
- Schema: `AnalysisSample`, `FeedbackEvent`, `UserColorProfile`, `ModelVersion`
- Persistência de sample no `POST /api/analyses`
- Label gold no approve da consultora
- `POST /api/feedback`
- VTO mock alinhado ao `faceBox`
- Doc de arquitetura + testes de ROI/heuristic

**Ainda não existe:** treino tabular, calibração por pessoa (bias), métricas em produção, fila assíncrona de análise.

---

## 1. Fase 1 — fechar e validar (antes de ML)

### Objetivo de produto

Selfie → rosto localizado → amostra só de pele útil → estação com confiança mais honesta.

### Critérios de pronto (DoD)

| # | Critério | Como verificar |
|---|----------|----------------|
| 1.1 | Foto com rosto central → `faceDetected` ou density alta sem fallback cego | 10 selfies fixture |
| 1.2 | Foto sem rosto / paisagem → warning + `NEEDS_REVIEW` | fixture negativa |
| 1.3 | Features gravadas com `featureSchemaVersion: 1` + `roiLabs` | inspecionar `Analysis.features` / `AnalysisSample` |
| 1.4 | Trocar `FACE_DETECTOR` inválido não quebra API | env lixo → heuristic |
| 1.5 | Suite `npm test` verde + smoke QA ANL revisitado | `qa-execution` charter analyze |

### Trabalho restante Fase 1

1. **Validação visual** — charter QA: upload com selfie real vs foto de produto.
2. **Opcional:** salvar `faceCropPath` (jpeg privado) para debug/consultora — ligável por `SAVE_FACE_CROP=true`.
3. **BlazeFace** — padrão no código (`resolveFaceDetectorId`); heuristic só fallback ou env explícito.
4. Commit da Fase 1 quando você autorizar.

### Riscos Fase 1

| Risco | Mitigação |
|-------|-----------|
| Heuristic enviesa tons de pele | Priorizar BlazeFace; medir `skinPixelRatio` por coorte |
| `needsReview` sobe demais | Ajustar limiar; não forçar READY falso |
| Latência sharp+scan | Scan em 160px; ROI 96px — ok síncrono por enquanto |

---

## 2. Fase 2 — dataset + o que ajuda / não ajuda

### Objetivo de produto

Cada análise vira amostra treinável; cada pessoa ensina o que **combinou** ou **não**.

### Escopo

#### 2.A Labels de estação (gold)

- Fonte A: consultora (`overrideSeasonId`) — já wired.
- Fonte B (nova): “concordo com a estação” / “discordo” na UI da dona (sem ser consultora).
- Regra: label consultora **vence** label self-report em conflito.

#### 2.B Feedback de recomendação (o diferencial “cada pessoa”)

UI na página da análise (após READY/APPROVED):

- Por swatch / item: 👍 Ajudou · 👎 Não ajudou  
- `target` canônico: `season`, `clothing:#HEX`, `lipstick:Coral`, `base:…`, `vto:#HEX`
- Opcional: nota curta

API já esboçada: `POST /api/feedback`.

#### 2.C Export para treino

Script planejado: `npm run ml:export`

```
out/ml/YYYYMMDD/
  samples.parquet|jsonl
  feedback.jsonl
  manifest.json   # schemaVersion, counts, date range
```

Filtros:

- só samples com `labelSeasonId` OR feedback ≥1
- excluir `featureSchemaVersion` != ativo
- PII stripped

#### 2.D Concordância e painel mínimo

Query / página admin (ADMIN):

- % análises com label consultora
- % predição == label
- top targets HELPED vs DID_NOT_HELP
- taxa fallback detector

### Critérios de pronto Fase 2

| # | Critério |
|---|----------|
| 2.1 | Usuária registra feedback em ≤2 cliques |
| 2.2 | ≥50 samples **rotulados** (estação) antes de treinar (piso inicial; ideal 200+) |
| 2.3 | Export reproduzível e versionado |
| 2.4 | Matriz de confusão rules vs label no painel |

### Pseudocódigo — feedback loop

```
onFeedback(user, analysisId, kind, target):
  assert ownership
  insert FeedbackEvent
  if target starts with "season" and kind == DID_NOT_HELP:
    mark analysis for optional re-review queue (flag futuro)
  // UserColorProfile NÃO atualiza ainda (Fase 3)
```

### Decisões humanas (Fase 2)

1. Quantos feedbacks mínimos por usuária antes de personalizar?
2. TTL de imagens/samples (ex.: 12 meses)?
3. Self-label de estação entra no treino com peso menor (ex.: 0.5)?

---

## 3. Fase 3 — modelo + personalização

### 3.A Modelo global `tabular-v1`

**Não** CNN no começo. Classificador tabular multiclasse (12 estações):

Features candidatas (v1):

- `labUndertone.{L,a,b}`, `lab.{L,a,b}`
- `temperatureScore`, `valueScore`, `chromaScore`, `contrastScore`
- `skinPixelRatio`, `sampleCount`, `faceBox.score`
- one-hot / counts de ROI disponíveis
- `context` (casual/trabalho/noite) — opcional

Algoritmo sugerido (trocável):

1. LightGBM / XGBoost / sklearn HistGradientBoosting  
2. Baseline = `rules` (sempre no eval)

Treino offline:

```
npm run ml:train -- --export out/ml/... --out artifacts/tabular-v1-TIMESTAMP/
→ cria ModelVersion(active=false)
→ eval holdout: accuracy, macro-F1, vs rules
→ humano ativa: ModelVersion.active=true + COLOR_PREDICTOR=tabular-v1
```

Inferência:

```
createColorPredictor():
  if COLOR_PREDICTOR=tabular-v1 and active ModelVersion exists:
    load artifact
  else:
    return rules
```

### 3.B Personalização `UserColorProfile`

Cada pessoa ≠ média da população.

Calibração (após N feedbacks / labels):

```
temperatureBias += mean(delta) onde delta = label_temp - predicted_temp
valueBias, chromaBias idem
preferredSeasonId = moda dos labels recentes (opcional)
```

Na predição:

```
adjusted = applyBiases(globalFeatures, UserColorProfile)
season = model.predict(adjusted)  // ou re-rank top-3 do modelo global
```

Re-rank de recomendações:

- subir swatches com HELPED recente da pessoa
- descer DID_NOT_HELP (mesmo hex/label)
- nunca esconder todos — só reordenar + badge “combinou com você”

### 3.C Critérios de ativação do modelo

Só ligar `tabular-v1` em produção se:

| Gate | Limiar sugerido |
|------|-----------------|
| Samples rotulados | ≥200 (ou ≥50 + shadow mode) |
| Macro-F1 holdout | ≥ F1 do `rules` + 0.03 |
| Concordância consultora (shadow 2 semanas) | ≥ rules |
| Latência p95 | ≤ rules + 100ms |

Shadow mode: gravar `predictedSeasonId` do modelo sem mostrar; comparar.

### 3.D Pseudocódigo retreino

```
export labeled samples
train/val/test split by userId (evitar leak entre treino e teste da mesma pessoa)
train model
metrics = eval(test)
if metrics beat rules:
  write artifact
  insert ModelVersion(active=false, metrics)
  notify human
else:
  discard / keep as experiment
```

---

## 4. Orquestração técnica (quando análise pesar)

Hoje: síncrono no `POST /api/analyses`.

Se BlazeFace/modelo > ~1.5s p95:

```
PENDING → worker (bullmq / fila simples) → READY|NEEDS_REVIEW
UI faz poll em /api/analyses/[id]
```

Planejar **só se** medição exigir — não antecipar infra.

---

## 5. Métricas (definição única)

| Métrica | Definição | Alvo Fase 1 | Alvo Fase 3 |
|---------|-----------|-------------|-------------|
| Face hit rate | % com `faceDetected` ou heuristic score alto sem fallback cego | ≥70% selfies | ≥85% |
| Fallback rate | % `usedFaceFallback` | monitorar | &lt;15% com BlazeFace |
| Review rate | % `NEEDS_REVIEW` | não subir &gt;10pp vs baseline | estabilizar |
| Consultant agreement | predicted == override | baseline rules | +5pp |
| Feedback density | eventos / análise READY | — | ≥0.3 |
| Personalization lift | HELPED rate pós-perfil vs antes | — | +10% relativo |

---

## 6. Matriz de troca (manutenção futura)

| Sintoma | Ação 1 | Ação 2 |
|---------|--------|--------|
| Muitos “pouca pele” | Ligar BlazeFace | Revisar ROI / isSkinPixel |
| Estações inconsistentes vs consultora | Coletar mais labels | Treinar tabular; shadow |
| Recomendações “iguais pra todo mundo” | UI feedback | UserColorProfile re-rank |
| Latência alta | Fila async | Detector mais leve |
| LGPD / cloud | Manter on-prem | Novo consentimento |

---

## 7. Impacto em QA (`docs/qa`)

Novos / updates quando implementar:

- Journey: `J-analyze-ready-results` — steps de face + warnings
- Journey: `J-feedback-helped` (Fase 2)
- Charter: foto sem rosto, selfie lateral, pele escura/clara, luz dura
- Scenario: `ANL-face-roi-undertone`, `FBK-helped-lipstick`

Não rodar `qa-execution` full até Fase 1 commitada e app estável.

---

## 8. Cronograma sugerido (esforço, não datas)

| Bloco | Esforço relativo | Dependência |
|-------|------------------|-------------|
| Fechar Fase 1 + QA face | S | — |
| UI feedback + painel concordância | S–M | Fase 1 |
| Export + 50–200 labels reais | M (operacional) | consultora ativa |
| tabular-v1 + shadow | M | labels |
| UserColorProfile + re-rank | M | feedback density |
| Fila async | S | só se latência |

S ≈ 1–2 dias focados · M ≈ 3–7 dias.

---

## 9. Decisões fechadas

| # | Decisão | Resposta | Data |
|---|---------|----------|------|
| 1 | Commit Fase 1 foundation | **Sim — `45a55c7`** | 2026-08-02 |
| 2 | Prioridade pós-commit | **(A) BlazeFace real** — implementação no working tree | 2026-08-02 |
| 3 | TTL de fotos/samples | **Sim** — `PHOTO_RETENTION_DAYS=365` + `npm run retention:purge` | 2026-08-02 |
| 4 | Personalização começa por | **Bias de estação** (`UserColorProfile`) | 2026-08-02 |

Próximo detalhe de execução: adapter BlazeFace + env `FACE_DETECTOR=blazeface` com fallback heuristic; depois UI feedback (Fase 2) e calibração de bias (Fase 3).

---

## 10. Próximos artefatos

- Implementar BlazeFace (em curso após este commit)
- Spec UI feedback (Fase 2)
- Spec `ml:export` / `ml:train` + aplicação de `UserColorProfile` bias
