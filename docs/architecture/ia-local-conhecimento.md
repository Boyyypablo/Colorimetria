# IA local + metodologia de avaliação (sem tokens pagos)

Alinhamento de produto. Complementa [`colorimetry-ml.md`](./colorimetry-ml.md).  
**Não usa APIs pagas** (Gemini, OpenAI, Hugging Face Inference pago). A máquina de conhecimento roda no PC do time.

## O problema

Hoje a classificação de estação é por **regras + medições da foto**. O texto de coaching é um resumo fino do material antigo. A consultora IA aponta para **Gemini** — sem créditos, essa camada some.

O curso **MakeUp Academy** (visagismo, colorimetria, face, make) está em `aprendizado/material/`, mas o produto **não lê** esses vídeos. Absorver o curso “jogando o MP4 numa IA da nuvem” exigiria tokens e republicaria conteúdo de terceiros — os dois caminhos estão fora.

## Princípio (não misturar as camadas)

| Camada | O que decide | O que NÃO faz |
|--------|----------------|----------------|
| **Medição** | Foto → rosto → cores (Lab) → eixos (temperatura, valor, croma, contraste) | Não “chuta” estação por opinião de LLM |
| **Rubrica** | Metodologia de avaliação destilada do material (como a consultora pensa) | Não copia aula literal |
| **Estação** | Regras (hoje) → modelo tabular (quando houver labels) | LLM não substitui o classificador |
| **Linguagem** | IA **local** explica e recomenda *com base* na rubrica + cartela | Não inventa a estação |

Resultado melhor = **medir bem + avaliar com a mesma lógica do curso + texto alinhado ao material**. Não é treinar um ChatGPT no disco de aulas.

## Metodologia de avaliação (o que a IA “aprende” a julgar)

Inspirada nos módulos 04–09 da MakeUp Academy (visagismo + colorimetria), virada em **eixos nossos**, em linguagem Colometria:

1. **Temperatura** — subtom frio / quente / neutro (pele nas bochechas; cabelo/olhos para checar luz falsa).
2. **Valor** — claro ↔ profundo (pele *e* contraste com cabelo; pele clara + cabelo escuro ≠ “estação clara”).
3. **Croma** — brilhante ↔ suave (intensidade vs. cinza/bege).
4. **Contraste facial** — pele × cabelo × olhos (alto / médio / baixo) — guia make, óculos, cabelo.
5. **Visagismo (apoio)** — formato de rosto / feições para *onde* aplicar contorno e blush — **não** troca a cartela.
6. **Qualidade da foto** — luz quente, sombra, maquiagem pesada → `NEEDS_REVIEW`, não chute confiante.

Cada análise futura deveria gravar esses eixos (já existem scores no preditor) + um **parecer** em checklist:

- Foto utilizável? Sim / revisão.
- Eixos preenchidos com evidência (ROI).
- Estação + cartela irmã.
- Coaching só do que a evidência sustenta (ex.: objetivo `cabelo` → notas capilares).

Isso é a “IA própria”: um **avaliador com rubrica**, não um modelo genérico.

## Como absorver `aprendizado/material/` (local, de graça)

```
PDF / MP4
  → extração local (texto do PDF; Whisper no PC para vídeo)
  → aprendizado/material/_extracted/   (gitignored, não publicar)
  → destilação humana + assistida por LLM local
       → knowledge cards (JSON nosso: eixos, dicas, contra-exemplos)
       → rubrica de avaliação (checklist versionado)
  → índice local de embeddings (Ollama nomic-embed / equivalente)
  → consultora local consulta o índice + a cartela já classificada
```

Regras:

- Extrato é **insumo interno**. O produto só carrega **cards nossos** (paráfrase, estruturado).
- Não treinar peso de LLM em cima do curso (caro, frágil, risco de copyright). RAG + destilação.
- Prioridade de ingestão: **07–08 Colorimetria**, **04–06 Visagismo**, **09 Visagismo na make**. Resto (noiva, artístico, inglês) fica fora do núcleo.

Ferramentas locais sugeridas (zero fatura de token):

| Função | Ferramenta |
|--------|------------|
| LLM no PC | [Ollama](https://ollama.com) — Qwen2.5 / Llama 3.x (7B–14B conforme RAM) |
| Transcrição de aula | faster-whisper / whisper.cpp (modelo `small` ou `medium`) |
| Busca no material | embeddings locais (`nomic-embed-text` no Ollama) + índice em disco |
| Consultora no app | novo provider `CONSULTANT_AI=ollama` no mesmo contrato da Gemini |

Máquina: Windows com **≥16 GB RAM** para 7B; GPU NVIDIA ajuda, não é obrigatória.

## O que muda no produto (quando aprovado)

1. **Provider local** da consultora (`CONSULTANT_AI=ollama|none`), fallback: coaching estático de `season-knowledge.ts` (já existe, não depende de crédito).
2. **Base de conhecimento versionada** em `data/knowledge/` (cards JSON) — isso *entra* no Git; vídeos não.
3. **Rubrica** aplicada na análise: parecer estruturado além da estação.
4. **Eval** (ver abaixo) no painel `/admin/ml`.

A classificação `COLOR_PREDICTOR=rules` permanece o padrão até haver samples rotulados o bastante para `tabular-v1`.

## Como sabemos se melhorou (avaliação)

Não “a IA parece mais inteligente”. Gates objetivos:

| Métrica | Como | Meta inicial |
|---------|------|----------------|
| Concordância de estação | predito vs. override da consultora | ≥ baseline `rules` atual |
| Revisão desnecessária | % `NEEDS_REVIEW` em fotos boas | não explodir vs. hoje |
| Erros conhecidos | fixture Inverno Brilhante / luz quente | regressão = falha |
| Coaching útil | 👍/👎 da usuária em dicas | subir HELPED em `season` / `cabelo` / make |
| Fidelidade à rubrica | checklist: citou contraste / irmã / “fora da paleta” quando cabe | score de cobertura |

Conjunto ouro: análises com selo de consultora + 10–20 casos âncora (incluindo o bug Inverno Brilhante). LLM local **não** é juiz da estação nesses testes — a consultora humana é.

## O que isto não é

- Não é fine-tune pago nem GPU na nuvem.
- Não é mandar foto de cliente para API externa (LGPD).
- Não é o LLM “assistir” o curso e classificar sozinho.
- VTO cloud (HF/Gemini/fal) **estacionado** — sem crédito. Looks de peça na análise: `data/wardrobe/` (Faixa 6 de `melhorias-sistema.md`).

## Fases sugeridas

| Fase | Entrega | Status |
|------|---------|--------|
| A | Transcrever/extrair módulos 04–09 | **04–08 feitos**; 09 pendente (aulas grandes) |
| B | Rubrica + knowledge cards | **Feita** (36 cards + `evaluateWithRubric`) |
| C | `CONSULTANT_AI=ollama` + RAG nos cards (não no MP4 cru) | **Feita** (código; ligar env local) |
| D | Painel: concordância + cobertura da rubrica | depois de C |
| E | Modelo tabular (`colorimetry-ml.md` Fase 3) | quando houver ≥50–200 labels |

## Lote de transcrição (concluído 04–08 em 2026-08-14)

Whisper local (`npm run knowledge:transcribe`). Retoma sozinho: arquivos já salvos são pulados.

**Feito (21 aulas):**

| Módulo | Aulas |
|--------|--------|
| 07 Colorimetria 1 | 5/5 — o que é cor, percepção, como vemos, roda, harmonia |
| 08 Colorimetria 2 | 4/4 — significado, conceito, etnia, monocromia |
| 04 Visagismo 1 | 7/7 — medida, máscara, foto, cérebro, temperamentos, formatos |
| 05 Visagismo 2 | 3/3 — formato, feições, grupo dos temperamentos |
| 06 Realce da face | 2/2 — contorno por formato; aplicando na prática |

**Pendente:** 09 (aulas grandes). Insumo em `aprendizado/material/_extracted/makeup-academy/` (gitignored). **Não republicar.**

Próximo passo de produto: módulo 09 (quando transcrito) + índice RAG persistente. Destilação 04–08 já entrou nos cards (paráfrase).

## Decisão (confirmada 2026-08-13)

1. Metodologia fechada: medir ≠ rubrica ≠ linguagem.
2. Ollama no PC de desenvolvimento (`qwen2.5:7b` + `nomic-embed-text`).
3. Fases A+B primeiro — **consultora LLM na API só na fase C**.

### Entregas A+B

| Item | Onde |
|------|------|
| Rubrica 1.0 | `data/knowledge/rubric.ts` + `evaluateWithRubric()` |
| 36 knowledge cards | `data/knowledge/cards.ts` |
| Transcrição (parcial) | `_extracted/makeup-academy/` — 07, 08, 04.01–02 |
| Consultora no app | `CONSULTANT_AI=ollama` — `src/lib/ai/consultant.ts` |

## Plano imediato — Fase C (sem tokens)

A classificação **não muda**: `COLOR_PREDICTOR=rules`. O LLM só narra.

```
foto → medição + rules → seasonId + eixos
                 ↓
         evaluateWithRubric() → checks + cardIds
                 ↓
         CONSULTANT_AI=ollama (qwen2.5:7b)
           contexto = eixos + cards (não o MP4)
                 ↓
         texto de coaching; fallback = season-knowledge.ts
```

1. Env: `CONSULTANT_AI=ollama|gemini|none` (default `none` até ligar).
2. Provider Ollama no mesmo contrato de `src/lib/ai/consultant.ts`.
3. Prompt: proibido escolher/trocar estação; só explicar rubrica + cards.
4. RAG: embeddings `nomic-embed-text` nos cards (não nas transcrições cruas).
5. Fallback se Ollama estiver off: coaching estático já existente.
6. Testes: Inverno Brilhante continua `bright_winter`; texto cita contraste/irmã.

**Fora desta fase:** retomar Whisper; mandar foto para a nuvem; fine-tune.

Retomar transcrição mais tarde:

```bash
npm run knowledge:transcribe
```

