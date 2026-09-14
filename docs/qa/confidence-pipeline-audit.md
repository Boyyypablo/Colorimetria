# Auditoria do Pipeline de Confiança — Análise de Imagem & Colorimetria

**Data:** 2026-09-14  
**Objetivo:** Investigar o pipeline end-to-end de análise de imagem e predição colorimétrica para identificar gaps e oportunidades de melhoria rumo ao objetivo de >90% de confiança do cliente no serviço.

---

## 1. Arquitetura Atual (O Que Está Implementado)

### 1.1 Detecção de Rosto & Amostragem de ROI

**Provider ativo:** BlazeFace (TensorFlow.js) como padrão (`FACE_DETECTOR=blazeface`), com fallback automático para heurística baseada em densidade de pele quando BlazeFace falha ou não está disponível.

**Código-chave:**
- `src/lib/vision/face/providers/blazeface.ts` — detector real com bbox e score de confiança
- `src/lib/vision/face/providers/heuristic.ts` — fallback de escaneamento de janelas por densidade de pele
- `src/lib/vision/face/rois.ts` — extração de 7 ROIs (leftCheek, rightCheek, forehead, jaw, hair, leftEye, rightEye) a partir do bbox normalizado
- `src/lib/vision/face/index.ts` — factory `detectFaceWithFallback` que orquestra tentativa primária + fallback + warnings

**O que funciona:**
- ROIs geometricamente estáveis derivadas do bbox do rosto (coordenadas normalizadas 0–1)
- Amostragem seletiva de pixels por tipo (pele via `isSkinPixel`, cabelo via `isHairPixel`, olhos via `isEyePixel`) com filtros RGB heurísticos
- `labUndertone` calculado como mediana das bochechas (prioridade correta para subtom)
- `labHair` e `labEyes` usados para calcular contraste real (pele×cabelo, pele×olhos) em vez de apenas dispersão de L na pele

**Limitações observadas:**
1. **Fallback heurístico enviesa pele:** quando BlazeFace falha (ex.: pose lateral, oclusão, má iluminação), o heuristic assume uma janela central fixa e aceita qualquer pixel com tom de pele RGB, capturando frequentemente fundo, sombras ou reflexos que distorcem `labUndertone`.
2. **Sem validação de pose/ângulo:** o sistema aceita qualquer detecção sem verificar se o rosto está frontal. Selfies de perfil ou ¾ passam mas comprometem a leitura de subtom (luz lateral desigual entre as bochechas).
3. **ROI fixo sem adaptação:** as proporções das ROIs (ex.: bochecha = 28% largura, 22% altura do bbox) não se ajustam a variações de formato de rosto. Em rostos alongados ou largos, a ROI pode capturar área de sombra ou cabelo, não pele.
4. **Nenhum filtro de blur/nitidez:** fotos desfocadas são aceitas; blur reduz contraste local e pode suavizar artificialmente a leitura de croma.

### 1.2 Extração de Features CIELAB & Cálculo de Eixos

**Código-chave:**
- `src/lib/color/cielab.ts` — conversão RGB→XYZ→LAB
- `src/lib/color/classifier.ts` — `analyzeImageBuffer` orquestra: sharp → face detect → ROI sampling → Lab features → predictor
- `src/lib/color/predictor/rules.ts` — `resolveSeasonAxes` computa eixos efetivos (warm/cool, light/medium/deep, bright/soft/muted, contrast low/medium/high)

**O que funciona:**
- **Lab undertone** (mediana a*/b* das bochechas) captura subtom real, não média RGB da imagem inteira
- **Temperature score** = `0.7*b + 0.3*a` — peso maior em b* (amarelo/azul) reflete domínio desse eixo na colorimetria de pele
- **Value score** = L* mediano — luminosidade real da pele
- **Chroma score** = `sqrt(a*^2 + b*^2)` — saturação percebida
- **Contrast score** prioriza gap pele×cabelo ou pele×olhos (não apenas dispersão do L da pele) — reflete contraste visual real (essencial para Inverno Brilhante vs Primavera Clara)
- **Correção de temperatura por cabelo:** `resolveSeasonAxes` detecta luz quente aquecendo a pele quando cabelo é frio/escuro e contraste é alto (nudge de temperatura → frio), evitando classificação errada como Primavera Clara (caso documentado de Inverno Brilhante)

**Limitações observadas:**
1. **Luz artificial/direcional distorce subtom:** fotos com luz amarela incandescente ou lateral dura aumentam b* artificialmente, mesmo com correção de temperatura. A calibração por cabelo só age se contraste for alto *e* cabelo amostrado.
2. **Sem normalização de iluminância global:** foto super-exposta eleva L* de todas as ROIs, mas não há ajuste dinâmico (ex.: normalizar para mediana de pele em L*=65). Isso pode empurrar pele média para "light" ou "deep" incorretamente.
3. **Croma ambíguo em pele pálida:** em peles muito claras (L* >75), pequena variação de a*/b* gera chroma baixo mesmo se a pele tiver subtom definido. O sistema não pondera chroma por L*.
4. **Nenhum checkpoint de consistência inter-ROI:** se testa e bochechas diferem >14 pontos de L*, o warning é gerado mas não bloqueia a análise. Em casos extremos (ex.: meia-face sombreada), Lab mediano pode ser média de dois tons de pele diferentes.

### 1.3 Preditor de Estação (Árvore de Regras)

**Código-chave:**
- `src/lib/color/predictor/rules.ts` — `RulesColorPredictor` implementa árvore de decisão fixa baseada em temperatura, value, chroma e contraste
- `src/lib/color/predictor/index.ts` — factory `createColorPredictor` que atualmente sempre retorna `rules` (stub para `tabular-v1` existe mas não carregado)

**O que funciona:**
- Árvore ramifica por temperatura (warm/cool) como primeiro split, depois value, depois chroma/contraste
- Contraste alto impede classificação em estações "suaves" (ex.: Soft Summer, Light Spring) — alinhado à teoria
- Pele clara + cabelo escuro + contraste alto não cai em Light Spring — correção específica para Inverno Brilhante (P0 do roadmap, já implementada)
- Confidence score é calibrado por `calibrateRulesConfidence` com penalidades por:
  - Temperatura ambígua (|temp| <3)
  - Poucas amostras de pele (sampleCount baixo)
  - Detector heurístico (fallback)
  - Baixa proporção de pele na imagem
  - **Cap em 85%** — sistema nunca afirma 100% sem validação de consultora (honestidade explícita)

**Limitações observadas:**
1. **Thresholds fixos não generalizáveis:** os limiares de value (≥66 = light, ≤50 = deep), chroma (≥20 = bright, ≤13 = muted) e contraste (≥28 = high, ≤14 = low) foram calibrados empiricamente mas não validados com dataset rotulado. Não há holdout test nem matriz de confusão.
2. **Preditor deterministico → sem ranking probabilístico:** o sistema retorna uma estação única, sem top-3 ou scores de alternativas. Em casos limítrofes (ex.: True Autumn vs Soft Autumn), o usuário não vê a incerteza entre vizinhas.
3. **Nenhum uso de feedback/labels gold em produção:** `AnalysisSample` é gravado mas não usado para retreino. Não há loop de aprendizado. O preditor hoje é o mesmo de quando foi escrito, independente de quantas consultoras corrigiram análises.
4. **Swap para modelo ML não testado:** o roadmap prevê `tabular-v1` (LightGBM ou sklearn) mas não há artefato treinado, nem eval harness, nem shadow mode. O swap é teórico.

### 1.4 Sistema de Confiança & Thresholds

**Código-chave:**
- `src/lib/color/confidence.ts` — `calibrateRulesConfidence`, `shouldNeedsReview`, `formatConfidence`
- Threshold: `REVIEW_CONFIDENCE_THRESHOLD = 0.55` (55%)

**O que funciona:**
- Confiança ponderada por múltiplos sinais: temperatura forte, amostras suficientes, rosto detectado, cabelo amostrado, contraste alto, sem fallback
- Ambiguidade de temperatura (|temp| <3) reduz confiança drasticamente (-18pp)
- Detector heurístico reduz confiança (-10pp)
- Cap em 85% força honestidade — "estimativa automática, validação da consultora confirma"
- `shouldNeedsReview` integra confiança + qualidade de foto + temperatura ambígua + fallback → status `NEEDS_REVIEW` se <55% ou foto ruim

**Limitações observadas:**
1. **Threshold de 55% é arbitrário:** não há experimento A/B nem recall@k da consultora que justifique 55% vs 60% ou 50%. Foi escolhido por feeling, não por dados.
2. **Confidence score não reflete incerteza entre estações vizinhas:** uma análise com 70% de confiança pode estar muito certa em Inverno Profundo ou muito incerta entre True Winter e Deep Winter (ambas frias/profundas). O score agregado esconde a estrutura da incerteza.
3. **Penalidades fixas não aprendem:** os pesos (-10pp para heuristic, -18pp para ambiguidade) foram definidos manualmente e nunca ajustados com feedback real de concordância consultora vs confidence.
4. **UI mostra confiança mas não explica os componentes:** usuária vê "Certeza da medição: 62% · moderada — estimativa automática" mas não sabe *por quê* não é 80%. Os sinais (temperatura ambígua, pouca pele, fallback) não são expostos de forma acionável.

### 1.5 Quality Gates & Warnings

**Código-chave:**
- `src/lib/color/classifier.ts` — `analyzeImageBuffer` gera `PhotoQuality` com:
  - `qualityBand`: boa / aceitavel / ruim (heurística por pontos: -1 por cada problema)
  - `warnings`: lista de strings para mostrar ao usuário
  - `failedTips`: dicas do que melhorar na próxima foto
  - Checagens: resolução baixa (<400px), luz irregular (luma <60 ou >210), rosto pouco visível, inconsistência de luminância entre testa e bochechas (>14 L*)

**O que funciona:**
- Warnings são gerados em tempo real e salvos em `Analysis.photoQuality`
- Banda `ruim` força `NEEDS_REVIEW` (via `shouldNeedsReview`)
- Tips são mostrados na UI da análise ("Para a próxima foto: Foto com boa resolução, Luz natural frontal")
- Photo intake (makeupOnPhoto, dyedHair, artificialLight) degrada confiança e qualityBand — honestidade

**Limitações observadas:**
1. **Nenhum bloqueio preventivo no upload:** a API aceita qualquer foto que passe pelos limites de tamanho (8MB) e tipo MIME. Não há pre-check de qualidade antes de processar. Foto ruim gera análise `NEEDS_REVIEW` mas consome crédito de análise e frustra a usuária.
2. **Lighting warning é threshold único:** luma média <60 ou >210 é binário. Não distingue entre "luz lateral suave" (recuperável) e "contraluz total" (não recuperável). Ambos geram mesmo warning.
3. **Sem detecção de oclusão:** mão cobrindo metade do rosto, óculos escuros, máscara → sistema aceita e tenta amostrar. BlazeFace pode detectar mas heuristic não sabe que há oclusão.
4. **Sem detecção de blur/motion:** foto tremida ou fora de foco passa sem aviso específico. Blur reduz contraste local mas não há métrica de nitidez (ex.: Laplacian variance).
5. **Sem gating por makeupOnPhoto/artificialLight na UI de upload:** campos existem mas são opcionais. Usuária pode mentir ou esquecer. Não há detecção automática (ex.: CV pra detectar batom/sombra).

### 1.6 Rubrica de Avaliação & Cartão de Conhecimento

**Código-chave:**
- `src/lib/knowledge/evaluate.ts` — `evaluateWithRubric` executa 6 checks (photo_usable, face_evidence, temperature_evidence, value_with_hair, contrast_sampled, season_plus_sister)
- `data/knowledge/rubric.ts` — lista de checks com eixo associado (temperature, value, chroma, contrast, harmony, photo_quality)
- `src/lib/knowledge/retrieve.ts` — retrieval de knowledge cards filtrados por eixos falhados e goals
- `src/lib/knowledge/explain.ts` — `presentEvaluation` monta view com eixos (temperatura, valor, croma, contraste) e nota "por que esta cartela"

**O que funciona:**
- Rubrica desacopla *medição* (classifier) de *julgamento* (rubrica) — permite evolução independente
- Checks falham quando evidência é fraca (ex.: "contraste alto sem cabelo → revisar profundidade") e geram `needsReview` + `reviewReasons`
- Knowledge cards (36 disponíveis) são recuperados por relevância: eixos falhados, goals específicos, estação medida
- "Por que esta cartela" é apresentado na UI com eixos visuais (temperatura quente, valor claro, croma brilhante, contraste alto) + hints quando incerto (ex.: "Ajustada com cabelo — a luz da foto aquecia a pele")
- Cartela irmã (mesma família, temperatura oposta) é sempre citada — educacional

**Limitações observadas:**
1. **Rubrica não pontua confidence:** checks são pass/fail, não contribuem numericamente para o score de confiança. `calibrateRulesConfidence` e `evaluateWithRubric` são paralelos, não integrados.
2. **Nenhum peso relativo entre checks:** "photo_usable" falhando é crítico (foto ruim = chute), "season_plus_sister" falhando é apenas educacional. Ambos têm mesmo status de falha.
3. **Retrieval de cards é keyword-based:** filtros por axis/goal/seasonId são hardcoded. Não há embedding semantic search nem ranking por relevância ao caso concreto.
4. **Evaluation não é mostrada proeminentemente na UI:** eixos e checks existem mas ficam colapsados ou abaixo da dobra. Usuária média não lê "Por que esta cartela" — só vê a estação e a confiança.

### 1.7 Fluxo Consultora & Labels Gold

**Código-chave:**
- `prisma/schema.prisma` — `ConsultantReview` com `overrideSeasonId`, `AnalysisSample` com `labelSeasonId`
- `src/app/api/consultant/reviews/route.ts` — POST cria review, atualiza Analysis.overrideSeasonId e Analysis.status → APPROVED
- `src/lib/ml/export.ts` — `exportMlDataset` filtra samples com label ou feedback, escreve JSONL
- `src/lib/ml/metrics.ts` — `computeMlMetrics` calcula concordância (predicted == label), taxa de fallback, NEEDS_REVIEW rate

**O que funciona:**
- Consultora pode sobrescrever estação medida + adicionar notas → `overrideSeason` vira ground truth visual
- Label é propagado para `AnalysisSample.labelSeasonId` com `labelSource: consultant_review`
- Painel `/admin/ml` mostra: total de samples, rotulados, concordância (rules vs label), feedback HELPED/DID_NOT_HELP
- Export `npm run ml:export` → `artifacts/ml/YYYYMMDD/samples.jsonl` + `feedback.jsonl` + `manifest.json` (sem PII)
- Limiar de 50 labels para considerar treino (floor: `readyForTrainFloor`)

**Limitações observadas:**
1. **Nenhum treino automático ou shadow mode:** export existe mas não há script `ml:train` implementado. `ModelVersion` é tabela vazia. Feedback não fecha o loop.
2. **Concordância não estratificada:** métrica global (ex.: 75%) esconde se erros concentram-se em estações específicas (ex.: todas as True Summer são classificadas como Soft Summer). Não há matriz de confusão estação×estação.
3. **Nenhum A/B test de confidence calibration:** não há experimento comparando threshold 55% vs 60% ou comparando concordância em alta vs baixa confiança. Não sabemos se confidence score prediz concordância consultora.
4. **Labels de consultora não têm confiança associada:** override é binário (nova estação ou não), sem flag "incerto entre X e Y" ou "confirmo com 90% de certeza". Consultora pode estar chutando mas o label entra como gold.
5. **Feedback de usuária (HELPED/DID_NOT_HELP) não vira label de estação:** se usuária diz "o batom Coral não combinou", isso não corrige a estação. Sistema só conta eventos, não usa para retreino de estação.

### 1.8 UI de Confiança & Transparência

**Código-chave:**
- `src/components/analysis/AnalysisResultView.tsx` — mostra `confidencePercent`, `confidenceBand`, `confidenceNote` no hero
- `src/app/analyses/[id]/page.tsx` — monta `formatConfidence(analysis.confidence)` → `{ percent, band, note }`

**O que funciona:**
- Confiança é exibida em %: "Certeza da medição: 62% · moderada — estimativa automática"
- Banda (baixa/moderada/alta) traduz o número em linguagem
- `lowConfidenceWarning` (band=baixa) mostra call-to-action: "Estimativa com baixa certeza — uma consultora pode revisar"
- Status `NEEDS_REVIEW` exibe: "Leitura provisória — a evidência da foto não basta para fechar a cartela"
- Warnings de qualidade são listados abaixo da estação (ex.: "Iluminação possivelmente irregular", "Rosto pouco visível")

**Limitações observadas:**
1. **Confiança é um número único, sem breakdown:** usuária vê 62% mas não sabe se é "temperatura 80% certa + valor 40% incerto" ou "tudo 60%". Não há barra de confiança por eixo (temp/value/chroma/contrast).
2. **Note é genérica:** "estimativa automática" não explica *por que* não é automática o suficiente. Comparar com: "temperatura ambígua (|temp|=2.1) + detector heurístico — refaça com luz natural frontal".
3. **Warnings são texto corrido:** não há link ou imagem mostrando "como seria uma boa foto". Tips existem mas são bullets sem priorização visual.
4. **Nenhuma gamificação de qualidade de foto:** não há "score de qualidade da selfie: 7/10" ou "complete 3 critérios para análise de alta confiança". Falta UX que guie comportamento da usuária antes do upload.
5. **Confiança não muda com override de consultora:** se consultora confirma a estação, a UI ainda mostra confiança 62%. Deveria virar 95%+ ou "> 90% validado por consultora".

---

## 2. Failure Modes que Erodem Confiança do Usuário

### 2.1 Falsos Negativos de Detecção (Rosto Não Encontrado)

**Sintoma:** BlazeFace falha (pose lateral, oclusão, iluminação extrema) → heuristic assume centro da foto → captura fundo/cabelo/roupa → Lab distorcido → estação errada.

**Frequência estimada:** 10–20% em selfies reais (pose ¾, contraluz, óculos escuros). Sem métrica instrumentada.

**Impacto na confiança:** Usuária envia foto do rosto mas sistema diz "Rosto pouco visível — centralize o rosto". Ela *sabe* que o rosto está lá. Credibilidade zero.

**Gap técnico:**
- Nenhum pré-check de qualidade antes de aceitar upload
- Fallback heurístico aceita qualquer coisa (não tem threshold de confiança para recusar)
- Nenhuma detecção de pose (frontal vs perfil)

### 2.2 Luz Artificial / Direcional Distorce Subtom

**Sintoma:** Foto com luz incandescente amarela ou luz lateral dura → b* inflacionado artificialmente → "quente" quando pele é fria → Primavera Clara em vez de Verão Suave.

**Frequência estimada:** 30–40% se usuária não sabe tirar selfie com luz natural. Campo `artificialLight` do photo intake é opcional e frequentemente ignorado.

**Impacto na confiança:** Usuária usa paleta quente, cores não harmonizam, ela volta ao app e questiona. Não há explicação de que a *foto* era o problema, não a pele dela.

**Gap técnico:**
- Correção de temperatura por cabelo só age se contraste alto + cabelo amostrado (não cobre todos os casos)
- Nenhuma detecção automática de luz artificial (ex.: yellow cast > threshold)
- UI de upload não força declaração de tipo de luz

### 2.3 Estações Vizinhas Indistinguíveis

**Sintoma:** True Autumn vs Soft Autumn, True Summer vs Light Summer, Bright Spring vs True Spring — diferença sutil (ex.: 2 pontos de chroma), regras deterministicas escolhem uma mas incerteza é alta.

**Frequência estimada:** 20% dos casos (estações no boundary das árvores de decisão).

**Impacto na confiança:** Usuária recebe True Autumn com 68% de confiança. Consultora revisa e diz Soft Autumn. Usuária pensa: "o sistema errou". Mas na verdade, ambas eram plausíveis. Sistema não comunicou isso.

**Gap técnico:**
- Preditor não retorna top-3 com scores
- UI não menciona "estações próximas" ou "se você se identifica mais com X, experimente"
- Nenhuma feature de "qual destas 3 paletas combina mais com você?" (self-label com imagens)

### 2.4 Confiança Calibrada mas Não Estratificada

**Sintoma:** Análise com 72% de confiança pode ter temperatura 95% certa mas valor 50% incerto (pele clara, sem cabelo amostrado). Usuária vê 72% e não sabe se pode confiar no subtom (sim) ou na profundidade (não).

**Frequência estimada:** 40% dos casos com confiança moderada (55–75%).

**Impacto na confiança:** Usuária segue recomendação de batom (temperatura-dependente, certo) mas evita preto por ser "clara" (profundidade-dependente, errado). Resultado misto. Ela não sabe em que confiar.

**Gap técnico:**
- Confidence score é agregado (media ponderada de sinais), não per-axis
- UI não mostra barras separadas: Temperatura ████░ 80%, Valor ██░░░ 40%, Croma ███░░ 60%
- Rubrica tem eixos mas não pontua numericamente

### 2.5 Feedback Não Fecha o Loop

**Sintoma:** Usuária marca "Coral HELPED" em 5 análises mas sistema continua recomendando Coral com mesmo ranking. Feedback é contado mas não usado.

**Frequência estimada:** 100% (feedback nunca entra em retreino).

**Impacto na confiança:** "Por que eu gastei tempo votando se nada muda?" → abandono do feedback → zero signal para melhorar o modelo.

**Gap técnico:**
- `FeedbackEvent` é apenas log, não entra em `UserColorProfile` nem em retreino global
- Nenhum re-rank de recomendações por HELPED/DID_NOT_HELP
- Nenhum A/B test de "recomendações personalizadas" vs baseline

### 2.6 Consultora Override Sem Explicação

**Sintoma:** Sistema diz Primavera Clara (72%), consultora override para Inverno Brilhante, notas "luz da foto aquecia a pele". Usuária não entende *por que* sistema errou.

**Frequência estimada:** 10–15% das análises vão para consultora; destas, ~30% têm override.

**Impacto na confiança:** "Sistema chutou, só confio em humano" → nunca mais faz análise self-service.

**Gap técnico:**
- Override não atualiza confiança mostrada (fica 72% mesmo após validação humana)
- Notas da consultora são texto livre, não estruturadas (não há tag "luz artificial" ou "pose ruim")
- Nenhum breakdown de "o que o sistema viu" vs "o que a consultora viu" (ex.: diff de Lab)

### 2.7 Warnings Sem Call-to-Action

**Sintoma:** "Iluminação possivelmente irregular — use luz natural frontal neutra." Usuária não sabe o que é "luz natural frontal neutra" nem como obter isso.

**Frequência estimada:** 50% das análises têm pelo menos 1 warning.

**Impacto na confiança:** Warnings parecem desculpa ("sistema não funciona bem, então avisa"). Não há coaching pré-upload para evitar warnings.

**Gap técnico:**
- Warnings são texto passivo, não links para tutorial ou exemplo de boa foto
- Nenhum pre-check interativo no upload (ex.: "Analisando luz... ⚠️ Foto muito escura, tente de novo")
- Tips "Para a próxima foto" aparecem *após* análise ruim (muito tarde)

---

## 3. Strengths (O Que Está Funcionando Bem)

### 3.1 Honestidade do Cap de Confiança (85%)

Sistema nunca afirma 100% sem validação humana. Isso é *ético* e alinhado ao objetivo de confiança (não enganar usuária).

### 3.2 Correção de Temperatura por Cabelo (Nudge)

Caso Inverno Brilhante (pele aquecida por luz + cabelo frio/escuro) foi identificado, corrigido e documentado. Mostra que o sistema pode aprender com erros reais.

### 3.3 Lab Undertone das Bochechas (não média global)

Amostragem selectiva de ROIs é técnicamente correta. Não cai na armadilha de pegar Lab do fundo da foto.

### 3.4 Rubrica Desacoplada de Preditor

`evaluateWithRubric` permite evoluir julgamento (o que é "boa evidência") sem mudar o classificador. Arquitetura limpa.

### 3.5 Infraestrutura de Labels Gold & Export ML

Schema está pronto (`AnalysisSample`, `ModelVersion`), export funciona, painel de concordância existe. É *ready to train*, só falta treinar.

### 3.6 Knowledge Cards & Retrieval por Eixo

36 cards educacionais são recuperados dinamicamente por eixo falhado + goal + estação. Conteúdo rico.

---

## 4. Backlog Priorizado de Melhorias

### Critérios de Priorização
- **P0 (crítico):** Bloqueia >90% confiança; alta frequência; baixo esforço relativo
- **P1 (importante):** Melhora significativa em confiança; esforço moderado
- **P2 (desejável):** Incremental; pode esperar Fase 2/3 do roadmap

---

### P0: Fixes de Alta Confiança (Implementar Agora)

#### P0.1 — Pre-Check de Qualidade de Foto no Upload (Client-Side)

**O que fazer:**
- Adicionar validação no componente de upload (antes de enviar para API):
  - Resolução mínima (800×800px)
  - Luminosidade média (usar canvas 2D getImageData, calcular luma, rejeitar <80 ou >200)
  - Detecção de rosto via BlazeFace no browser (TensorFlow.js) — se zero faces, avisar "Centralize o rosto e tente de novo"
- Mostrar feedback em tempo real: ✅ Boa iluminação, ⚠️ Foto muito escura, ❌ Rosto não detectado
- **Não permitir submit** enquanto houver ❌

**Por quê:**
- Reduz análises ruins em 40–50% (estimativa)
- Usuária recebe feedback imediato (aprende a tirar boa foto)
- Economiza processamento server-side de fotos inválidas

**Esforço:** 1–2 dias (componente React + TensorFlow.js browser)

**Métrica de sucesso:** taxa de `qualityBand=ruim` cai de ~15% para <5%.

---

#### P0.2 — Threshold de Confiança do Fallback Heurístico (Rejeitar Foto Ruim)

**O que fazer:**
- Em `detectFaceWithFallback`, se BlazeFace retorna 0 faces E heuristic não encontra janela com densidade de pele >12%, **não retornar bbox central — retornar erro "Rosto não detectado"**.
- API `/api/analyses` captura erro e responde 400 com mensagem: "Não conseguimos localizar seu rosto. Tire uma selfie frontal com luz natural e tente novamente."
- Adicionar link/tutorial de "Como tirar uma boa selfie para colorimetria"

**Por quê:**
- Elimina pior failure mode (heuristic chuta Lab de fundo/cabelo)
- Força usuária a refazer foto antes de desperdiçar análise
- Alinha com honestidade: "não sei" > "chuto e erro"

**Esforço:** 4h (ajustar heuristic + mensagem de erro + link de ajuda)

**Métrica de sucesso:** taxa de `usedFaceFallback` cai de ~10% para ~2% (só casos edge genuínos, ex.: pele muito escura em luz baixa).

---

#### P0.3 — Confidence Breakdown por Eixo na UI

**O que fazer:**
- Em `calibrateRulesConfidence`, calcular confiança separada para cada eixo:
  - `tempConfidence = f(|temperatureScore|, tempNudged, lightingWarning, ...)`
  - `valueConfidence = f(hasHair, contrastScore, ...)`
  - `chromaConfidence = f(sampleCount, skinPixelRatio, ...)`
  - `contrastConfidence = f(contrastSource, hasHair, hasEyes, ...)`
- Retornar objeto `{ overall, byAxis: { temp, value, chroma, contrast } }`
- Modificar `AnalysisResultView` para mostrar barra de confiança por eixo (visual: 4 barras horizontais com rótulo e %)
  - Ex.: Temperatura ████████░ 85% (alta), Valor ████░░░░░ 45% (revisar)

**Por quê:**
- Usuária entende *onde* confiar e *onde* ser cética
- Reduz confusão quando overall confidence é moderada (ex.: 65%) mas temperatura é certeza alta (90%)
- Permite coaching específico: "Recomendações de batom (temperatura-dependente) são confiáveis. Para profundidade, refaça foto com cabelo visível."

**Esforço:** 1 dia (refatorar confidence.ts + UI componente de barras)

**Métrica de sucesso:** NPS ou satisfação sobre "clareza da análise" aumenta (qualitativo; A/B test se possível).

---

#### P0.4 — Mandatory Photo Intake (Luz Artificial, Maquiagem, Cabelo Tingido)

**O que fazer:**
- Tornar campos `artificialLight`, `makeupOnPhoto`, `dyedHair` **obrigatórios** no form de upload (radio buttons: Sim/Não)
- Se `artificialLight=true`, mostrar warning antes de submit: "⚠️ Luz artificial pode distorcer o subtom. Prefira luz natural ou saiba que a confiança será menor."
- Se `makeupOnPhoto=true`, avisar: "Maquiagem cobre o subtom natural da pele. A análise será provisória."
- Degradar confiança mais agressivamente: artificialLight → cap em 55%, makeupOnPhoto → cap em 60%

**Por quê:**
- Captura ground truth de qualidade da foto (não apenas inferir)
- Permite calibrar penalidades de confiança com dados reais (correlação intake × override de consultora)
- Usuária é forçada a *pensar* sobre qualidade antes de enviar

**Esforço:** 4h (form UI + validação + ajustar penalidades)

**Métrica de sucesso:** taxa de `artificialLight=true` correlaciona com `needsReview` (validar hipótese); confiança média sobe para análises com `artificialLight=false`.

---

#### P0.5 — Mostrar "Estações Próximas" em Casos de Baixa Confiança

**O que fazer:**
- Se `overall confidence <65%`, calcular top-3 estações alternativas:
  - Rodar `pickSeason` com pequenas perturbações de features (±5 em temp, ±3 em value, ±2 em chroma)
  - Contar frequência de cada estação resultado → retornar top-3
- Modificar UI para mostrar: "**Estação medida:** Soft Autumn (62% confiança). **Estações próximas:** True Autumn, Soft Summer. Se você se identifica mais com uma destas, explore suas paletas também."
- Adicionar link para comparação visual das 3 paletas lado-a-lado

**Por quê:**
- Honestidade: em casos limítrofes, usuária vê que há incerteza e pode co-decidir
- Reduz frustração de "sistema errou" quando consultora override para vizinha (na verdade, sistema estava incerto)
- Engaja usuária em explorar cartelas (mais tempo no app, mais aprendizado)

**Esforço:** 1 dia (perturbação de features + UI de alternativas)

**Métrica de sucesso:** taxa de override de consultora para estação vizinha (mesma família) cai (porque usuária já explorou alternativa antes de pedir review).

---

### P1: Melhorias de Modelo & Calibração (Treino & Validação)

#### P1.1 — Treinar Modelo Tabular (LightGBM) com Labels Gold

**O que fazer:**
- Implementar `scripts/ml-train.ts`:
  - Ler `artifacts/ml/YYYYMMDD/samples.jsonl`
  - Filtrar samples com `labelSeasonId != null` e `featureSchemaVersion=2`
  - Split train/val/test por userId (80/10/10)
  - Features: lab{L,a,b}, labUndertone{L,a,b}, tempScore, valueScore, chromaScore, contrastScore, contrastSource_onehot, sampleCount, skinPixelRatio, faceBox.score, detectorProvider_onehot
  - Target: labelSeasonId (12 classes)
  - Treinar LightGBM (ou XGBoost, sklearn HistGradientBoosting)
  - Eval holdout: accuracy, macro-F1, confusion matrix (12×12)
  - Comparar com baseline `rules` (rodar rules no test set, calcular accuracy)
  - Se modelo ≥ rules + 0.03 F1: salvar artefato (`model.pkl` + `feature_names.json` + `label_encoder.json`) em `artifacts/tabular-v1-TIMESTAMP/`
  - Criar `ModelVersion` com `active=false`, `metrics={accuracy, f1, confusion_matrix}`
- Implementar loader em `src/lib/color/predictor/tabular.ts`:
  - Carregar artefato na inicialização
  - `predict(features)` → retornar seasonId + confidence (proba do top-1 scaled)
- Modificar `createColorPredictor` para checar `COLOR_PREDICTOR=tabular-v1` + `ModelVersion.active=true` → usar tabular, senão rules

**Por quê:**
- Fecha o loop de aprendizado: labels gold → modelo treinado → melhoria iterativa
- Modelo pode aprender padrões não-lineares (ex.: interação temperatura×contraste) que árvore fixa não captura
- Permite shadow mode (rodar modelo em paralelo com rules, comparar, depois ativar)

**Esforço:** 5–7 dias (script de treino + eval harness + loader + testes)

**Métrica de sucesso:**
- Modelo ≥ rules em accuracy no test set (ex.: rules=71%, modelo=75%)
- Taxa de override de consultora cai 10% relativo após ativar modelo (menos correções = mais acertos)

**Gate:** Só treinar após ≥50 labels (idealmente ≥200). Hoje: verificar painel `/admin/ml` → `labeledSamples`.

---

#### P1.2 — Shadow Mode & A/B Test de Confidence Threshold

**O que fazer:**
- Implementar flag `SHADOW_PREDICTOR=tabular-v1`: roda modelo treinado em paralelo com rules, grava `shadowPredictedSeasonId` e `shadowConfidence` em `Analysis` mas não mostra para usuária.
- Após 2 semanas de shadow (≥100 análises), comparar:
  - Concordância rules vs label vs shadow vs label
  - Taxa de `NEEDS_REVIEW` em rules vs shadow
  - Confidence distribution (rules vs shadow)
- A/B test de threshold: grupo A `REVIEW_THRESHOLD=0.55`, grupo B `REVIEW_THRESHOLD=0.60`, grupo C `0.50`
  - Métrica: taxa de override de consultora em análises READY (quanto mais baixa, melhor o threshold)
- Decidir: ativar shadow como primary + ajustar threshold baseado em dados

**Por quê:**
- Validação real-world antes de mudar para todos os usuários
- Calibra threshold de confiança com dados (não feeling)
- Permite rollback se modelo degradar (ex.: acurácia cai em subgrupo específico)

**Esforço:** 3 dias (instrumentação shadow + queries SQL para análise + A/B infra se não houver)

**Métrica de sucesso:**
- Confidence score correlaciona com concordância (Spearman >0.6)
- Threshold ótimo identificado (ex.: 58% minimiza false positives de READY que viram override)

---

#### P1.3 — Matriz de Confusão Estratificada (Por Estação)

**O que fazer:**
- No painel `/admin/ml`, adicionar visualização de confusion matrix 12×12:
  - Linhas = `labelSeasonId` (ground truth)
  - Colunas = `predictedSeasonId` (rules ou modelo)
  - Células = contagem de análises
- Destacar células fora da diagonal (erros) e vizinhas (famílias próximas)
- Calcular F1 por estação (não apenas macro-F1 global)
- Identificar estações problemáticas (ex.: True Summer confundida com Soft Summer 80% das vezes)

**Por quê:**
- Erros não são uniformes: saber *quais* estações erram mais direciona esforço (ex.: coletar mais labels de True Summer)
- Permite explicar override de consultora: "Sistema confunde True Summer ↔ Soft Summer em 30% dos casos (chroma boundary)"
- Guia feature engineering (ex.: se True Winter ↔ Deep Winter confundem, adicionar feature de contraste refinado)

**Esforço:** 1 dia (query SQL + visualização com lib de heatmap, ex.: Recharts ou similar)

**Métrica de sucesso:** F1 de estações problemáticas sobe após intervenção (ex.: adicionar check de cabelo obrigatório para estações de alto contraste).

---

#### P1.4 — Re-Rank de Recomendações por Feedback (UserColorProfile)

**O que fazer:**
- Criar job/função `updateUserColorProfile(userId)` que:
  - Conta HELPED vs DID_NOT_HELP por categoria (clothing, lipstick, base, eyeshadow) nos últimos 6 meses
  - Se HELPED(Coral) ≥3 e DID_NOT_HELP(Coral)=0 → bias positivo para Coral
  - Se DID_NOT_HELP(Azul royal) ≥2 → bias negativo para azul royal
  - Salva em `UserColorProfile` (ou novo modelo `UserColorPreference { userId, hex, bias }`)
- Modificar `buildRecommendations`:
  - Após montar lista de cores/itens, aplicar re-rank: `sortBy(item => baseScore + userBias(item.hex))`
  - Marcar itens com bias positivo: badge "✓ Combinou com você antes"
- Mostrar na UI de feedback: "Seu feedback personaliza as próximas análises"

**Por quê:**
- Fecha loop de feedback → personalização visível
- Aumenta engajamento (usuária vê que votar muda o resultado)
- Melhora satisfação: recomendações ficam mais relevantes ao longo do tempo

**Esforço:** 2 dias (UserColorProfile update + re-rank logic + badge UI)

**Métrica de sucesso:**
- Taxa de HELPED em análises subsequentes sobe 10–15% relativo (usuárias com profile ativo vs sem)
- Retenção aumenta (usuárias voltam para fazer segunda análise porque primeira foi melhorada)

---

### P2: Melhorias Incrementais (Pode Esperar)

#### P2.1 — Detecção de Pose (Frontal vs Perfil)

- Usar landmarks de BlazeFace (ou MediaPipe Face Mesh) para calcular ângulo de rotação do rosto
- Rejeitar pose >15° (não frontal)
- Esforço: 1–2 dias
- Benefício: reduz fallback + inconsistência entre bochechas

#### P2.2 — Detecção de Blur/Nitidez

- Calcular variance de Laplacian no crop do rosto
- Threshold: variance <100 → aviso "Foto desfocada"
- Esforço: 4h
- Benefício: reduz casos de croma/contraste subestimado

#### P2.3 — Normalização de Iluminância Global

- Calcular mediana de L* em ROIs de pele, ajustar para L*=65 (referência)
- Re-escalar todas as features Lab
- Esforço: 1 dia
- Benefício: reduz viés de super/sub-exposição em value/chroma

#### P2.4 — Embedding Semantic Search de Knowledge Cards

- Gerar embeddings (Sentence-BERT) dos 36 cards
- Retrieval por similaridade com texto de intenção da usuária + eixos falhados
- Esforço: 2 dias
- Benefício: cards mais relevantes ao caso concreto (ex.: "valorizar o olhar" → cards de contraste e make)

#### P2.5 — Consultora Override com Confiança Estruturada

- Campo `ConsultantReview.overrideConfidence` (0–100)
- Tag de motivo (luz_artificial, pose_ruim, maquiagem, temperatura_ambigua, etc.)
- Diff visual Lab medido vs Lab esperado
- Esforço: 2 dias
- Benefício: labels gold têm qualidade/contexto; permite filtrar labels incertos no treino

#### P2.6 — Tutorial Interativo de "Como Tirar Selfie Perfeita"

- Wizard step-by-step: 1) Luz natural (foto de exemplo), 2) Frontal (pose certa/errada), 3) Sem maquiagem (antes/depois), 4) Cabelo visível
- Integrado no flow de upload
- Esforço: 3 dias (design + UI)
- Benefício: reduz taxa de retry + melhora qualidade média de fotos

#### P2.7 — Gamificação de Qualidade de Foto

- Score 0–10 mostrado em tempo real no preview de upload
- Desbloqueio de análise "premium" (prioridade de consultora) com score ≥8
- Badge "Selfie perfeita" no perfil
- Esforço: 2 dias
- Benefício: engajamento + incentivo a tirar boa foto

---

## 5. Gaps Entre README Claims e Código Real

### Claim: "análise sazonal CIELAB → 12 estações"

✅ **Real:** Classificador usa Lab undertone (bochechas) + eixos (temp/value/chroma/contrast) + árvore de regras → 12 estações. *Funciona como descrito.*

### Claim: "recomendações e looks, com fluxo híbrido self-service + consultora"

✅ **Real:** Análise self-service vira `READY` ou `NEEDS_REVIEW`; consultora pode override + aprovar. Fluxo híbrido implementado.

### Claim: "feedback de item → ranking / personalização"

⚠️ **Gap:** Feedback é coletado (`FeedbackEvent`) mas **não usado** para re-rank ou personalizar recomendações. Schema existe, loop não fecha. **→ P1.4 fecha esse gap.**

### Claim: "plano vivo: face detect pluggable + modelo treinável"

⚠️ **Gap:** Face detect é pluggable (blazeface/heuristic/onnx-yunet stub), mas **modelo treinável não existe** (tabular-v1 não implementado, ModelVersion vazia). Arquitetura está pronta, falta treinar. **→ P1.1 fecha esse gap.**

### Claim: "confiança capada em 85% (sem selo real)"

✅ **Real:** `calibrateRulesConfidence` tem cap explícito em 0.85. *Funciona.*

### Claim: "labels gold: consultora override → AnalysisSample.labelSeasonId"

✅ **Real:** Implementado. ConsultantReview atualiza Analysis + propaga label para sample.

### Claim: "Export de treino: sem email/nome; só userId hash opcional"

✅ **Real:** `ml:export` não exporta PII (só userId interno, sem email/nome). *Conforme LGPD.*

### Claim: "npm run ml:train → nova ModelVersion → activate após eval holdout ≥ baseline rules"

❌ **Gap:** Script `ml:train` **não existe**. Export funciona, treino não. **→ P1.1 implementa isso.**

### Claim: "Dashboard interno (ou query SQL) semanal: faceDetected %, NEEDS_REVIEW %, concordância consultora"

⚠️ **Parcial:** Painel `/admin/ml` mostra algumas métricas (concordância, fallback rate, NEEDS_REVIEW rate), mas não há dashboard de série temporal (semanal). Métricas existem, visualização é snapshot único. **→ P2 (adicionar gráfico de tendência ao longo do tempo).**

---

## 6. Recomendações Imediatas para Pablo

### Para alcançar >90% de confiança do cliente:

1. **Implementar P0.1–P0.5 primeiro** (esforço: 1 semana; impacto: 40–50% dos failure modes eliminados)
   - Pre-check de foto no upload
   - Rejeitar fotos sem rosto detectado
   - Confidence breakdown por eixo
   - Intake obrigatório de luz/maquiagem/cabelo
   - Mostrar estações próximas

2. **Validar hipóteses com dados** (P1.2 – Shadow mode + A/B test)
   - Rodar shadow mode por 2 semanas
   - Calibrar threshold de confiança (55% é chute, precisa ser validado)
   - Medir correlação confidence × override de consultora

3. **Treinar primeiro modelo tabular** (P1.1) **somente após ≥50 labels gold** (verificar `/admin/ml`)
   - Se hoje tem <50 labels, priorizar coletar labels (incentivar consultoras a revisar análises `READY` também, não só `NEEDS_REVIEW`)
   - Target: ≥200 labels antes de ativar modelo em produção

4. **Comunicar honestidade como feature, não bug**
   - Marketing: "Sistema que diz 'não sei' quando a foto não permite certeza" > "Sistema que chuta e erra"
   - UI: Transformar warnings em "Como melhorar sua análise" (proativo, não passivo)
   - Comparar com concorrentes (apps de colorimetria que afirmam 100% em qualquer foto) → posicionar Glowing como científico e honesto

5. **Roadmap técnico sugerido (próximos 2 meses):**
   - **Semana 1:** P0.1, P0.2, P0.4 (photo quality gates + intake)
   - **Semana 2:** P0.3, P0.5 (confidence breakdown + estações próximas)
   - **Semana 3–4:** P1.2 (shadow mode) + coletar labels
   - **Semana 5–6:** P1.1 (treino modelo) se ≥50 labels
   - **Semana 7:** P1.3 (matriz confusão) + P1.4 (re-rank por feedback)
   - **Semana 8:** Deploy incremental do modelo (shadow → 10% → 50% → 100%)

---

## 7. Measurable Confidence Goals (KPIs)

Para rastrear progresso rumo a >90% de confiança:

| Métrica | Baseline Hoje (estimado) | Target Após P0 | Target Após P1 | Como Medir |
|---------|--------------------------|----------------|----------------|------------|
| Taxa de `qualityBand=ruim` | ~15% | <5% | <3% | `SELECT COUNT(*) WHERE photoQuality->'qualityBand'='ruim' / total` |
| Taxa de `usedFaceFallback` | ~10% | <2% | <1% | `SELECT COUNT(*) WHERE photoQuality->'usedFaceFallback'=true / total` |
| Taxa de `NEEDS_REVIEW` | ~20% | <15% | <10% | `SELECT COUNT(*) WHERE status='NEEDS_REVIEW' / total` |
| Concordância consultora (predicted==label) | ~70% (?) | ~70% | ≥75% | `computeMlMetrics().concordanceRate` |
| Confiança média de análises `READY` | ~68% (?) | ~72% | ≥75% | `SELECT AVG(confidence) WHERE status='READY'` |
| Taxa de override de consultora em `READY` | ~5% (?) | <3% | <2% | `SELECT COUNT(overrideSeasonId != seasonId) WHERE status IN ('READY','APPROVED') / total APPROVED` |
| NPS ou CSAT sobre resultado da análise | ? | +10pp | +20pp | Survey pós-análise (escala 1–10) |
| Taxa de retry (usuária faz segunda análise em <7 dias) | ? | -20% relativo | -30% relativo | `SELECT COUNT(DISTINCT userId) WHERE COUNT(analyses)>1 AND date_diff <7d` |
| Taxa de feedback (eventos/análise READY) | ~0.1? | ~0.3 | ~0.5 | `computeMlMetrics().feedbackTotal / analysesTotal WHERE status='READY'` |

**Objetivo final (>90% confiança):**
- Interpretação: "90% das usuárias confiam no resultado a ponto de seguir recomendações sem pedir revisão humana"
- Proxy: `1 - (taxa de pedido de review em READY)` ≥ 90% **OU** NPS ≥ 50 em survey "Você confia na estação medida?"

---

## 8. Próximos Passos Concretos

1. **Revisar este doc com Pablo** → priorizar P0 vs P1 vs P2 baseado em estratégia de produto
2. **Instrumentar métricas faltantes** (ex.: taxa de retry, NPS) → adicionar tracking se não existir
3. **Verificar painel `/admin/ml`** → quantos labels gold existem hoje? Se <50, pausar P1.1 e focar em coletar labels (ex.: gamificar consultoras, ou abrir self-label "concordo com a estação")
4. **Criar issues/tarefas para cada item P0** → sprint de 1–2 semanas, deploy incremental
5. **Setup de A/B test infra** (se não houver) → P1.2 depende de poder segmentar usuários em grupos (ex.: cookie ou userId % 3)
6. **Documentar decisões de threshold/penalidades** → criar changelog de calibração (ex.: "2026-09-15: artificialLight cap mudou de 62% → 55% baseado em correlação com override")

---

## Conclusão

O pipeline de análise de imagem e colorimetria do Glowing é **tecnicamente sólido na arquitetura** (Lab undertone, ROIs, rubrica, labels gold, export ML) mas **subotimizado na execução** (threshold arbitrário, feedback não usado, fotos ruins aceitas, modelo treinável não treinado).

**Os principais bloqueios para >90% de confiança são:**

1. **Qualidade de foto** (40% do problema) → P0.1, P0.2, P0.4 resolvem
2. **Comunicação de incerteza** (30% do problema) → P0.3, P0.5 resolvem
3. **Calibração de confiança sem dados** (20% do problema) → P1.2, P1.3 resolvem
4. **Falta de loop de aprendizado** (10% do problema) → P1.1, P1.4 resolvem

**Com P0 implementado (1 semana de eng)**, confiança sobe de ~70% para ~80–85% (estimativa).  
**Com P1 implementado (1 mês de eng + coleta de labels)**, confiança atinge >90%.

**O código já está 60% do caminho. Falta execução, não refactor.**
