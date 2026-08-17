# Planejamento — melhorias do sistema

Depois da Fase C (consultora local). Ordem sugerida: impacto × esforço. Não misturar com classificação de estação.

## O que já está no chão

- Medição Lab + preditor `rules` + calibração Inverno Brilhante
- Rubrica 1.0 + 36 cards + `evaluateWithRubric`
- Consultora `CONSULTANT_AI=ollama` (texto a partir dos cards; Gemini opcional)
- Transcrição **04–08** completa (21 aulas, 2026-08-14); 09 pendente

## Faixa 1 — qualidade da análise (produto)

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 1.1 | Ligar `needsReview` da **rubrica** no `POST /api/analyses` | Status honesto | **Feito** — `decideAnalysisStatus` |
| 1.2 | Mostrar eixos + “por que esta cartela” na UI | Entender o laudo | **Feito** — `presentEvaluation` |
| 1.3 | Checklist de foto **antes** do upload (já há tips) + recusar banda ruim com mensagem clara | Menos chute em selfie amarela | Reusar `PHOTO_QUALITY_TIPS` + `qualityBand` |
| 1.4 | BlazeFace estável como detector padrão | Heurística enviesa tom de pele | **Feito** — default `blazeface`; heuristic só fallback / env explícito |

## Faixa 2 — conhecimento e coaching

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 2.1 | Destilar Whisper **04–06** (visagismo) nos cards | Transcrição pronta; cards de formato/contorno ainda genéricos | **Feito** — realce por contraste; feições ≠ defeitos; sem rótulo de formato |
| 2.2 | Destilar transcrições 07–08 → ajustar cards (paráfrase) | Colorimetria já transcrita e não entrou nos cards | **Feito** — luz/percepção, monocromia, etnia, estações centrais |
| 2.3 | Packs de coaching para as 12 estações | Entrega desigual | **Feito** — `season-packs.ts` |
| 2.4 | Índice RAG persistente (não só cache em memória) | Restart do Next re-embeda os cards | `data/knowledge/embeddings.json` gerado por script |

## Faixa 3 — consultora local

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 3.1 | Timeout / fila se Qwen 7B no CPU passar de ~30s | Análise pode estourar a espera do browser | Job async + status “gerando plano”; ou modelo 3B |
| 3.2 | Nunca anexar foto no Ollama (já é o caso) | LGPD | Manter; visão só Gemini com consentimento extra |
| 3.3 | Teste vivo opcional `OLLAMA_TEST=1` contra o PC | Garantir JSON do Qwen no schema | 1 fixture Inverno Brilhante |
| 3.4 | Painel admin: `cardIds` + cobertura da rubrica | Saber se o plano usou irmã/contraste | Fase D original |

## Faixa 4 — dados e modelo

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 4.1 | Concordância consultora no `/admin/ml` (já há esboço) | Gate para `tabular-v1` | Completar matriz rules vs override |
| 4.2 | Self-label “concordo com a estação” | Mais labels sem só consultora | Roadmap Fase 2.A |
| 4.3 | Treino tabular só com ≥50–200 labels e holdout ≥ rules | Evitar trocar regras por modelo pior | `colorimetry-ml.md` Fase 3 |

## Faixa 5 — operação

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 5.1 | `CONSULTANT_AI=ollama` só em local; prod `none` ou gemini se houver crédito | Vercel não tem Ollama | Env por ambiente |
| 5.2 | Não commitar `aprendizado/material` nem transcrições | Copyright + peso | Já no `.gitignore` |
| 5.3 | Rotacionar tokens que já passaram por `.env` se o arquivo vazou | Segurança | HF / Gemini no painel do host |

## Faixa 6 — looks de roupa (substitui VTO pago)

| # | Melhoria | Por quê | Como |
|---|----------|---------|------|
| 6.1 | Peças-modelo na análise (blusa, camisa, vestido, casaco) pintadas com a paleta | Ver a cor na peça, sem crédito de img2img | **Feito v1** — `data/wardrobe/` + silhuetas SVG |
| 6.2 | Pack fotográfico livre (Unsplash/Pexels) no catálogo | Silhueta feia → foto de peça | **Feito** — `data/wardrobe/photos/` + faixa da cor da cartela |
| 6.3 | Esconder simulação HF/Gemini/fal na UI enquanto não houver cota | Evitar erro de crédito no resultado | **Feito** — painel só com `VTO_PROVIDER=mock` |

Scrap de e-commerce (Zara, Shein, etc.) **não entra**: ToS + direito de imagem. Fonte = pack próprio ou banco com licença. Recolor local (Sharp/SVG) usa o hex da cartela.

## Ordem recomendada nas próximas sessões

1. **Laudo em evidência** — eixos + confiança + motivos de revisão na UI (já calculados)
2. **Trava de foto** — banda ruim / sem rosto não vira READY
3. **12 packs** — destilar 07–08 em `season-knowledge.ts` (hoje 3 estações ricas)
4. **Anamnese curta** — make / cabelo tingido / luz artificial no upload
5. **Landing honesta** — sem simulação no rosto até haver VTO
6. Detector de formato de rosto **depois** do day 1 (BlazeFace já é o padrão)

Estudo completo (preço R$ 67 / revisão R$ 129, o que entra no lançamento): canvas `diagnostico-lancamento`.

Fora de escopo curto: VTO pago, scrap de loja, fine-tune de LLM, módulo 09, app nativo, quiz de temperamento na paleta.
