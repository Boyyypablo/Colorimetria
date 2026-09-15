# Landing + Analyzing Handoff Specification

**Status:** ✅ Locked by Produto/Figma  
**Priority:** Implementar quando houver capacidade; face-crop + entitlement permanecem prioridade se ainda abertos

---

## Resumo

Handoff completo para Landing (seção Serviços) e Analyzing screen com copy/flow aprovados.

---

## Seção Serviços - Redesign Aprovado

### Layout Atual (para remover)
- ❌ Grid 2-card quebrado (Colorimetria + Plano personalizado)
- ❌ Cards de serviços múltiplos em grid

### Layout Novo (aprovado)

#### 1. Colorimetria Hero (full-width)
- **Layout:** Full-width hero section (destaque principal)
- **Conteúdo:**
  - Título: "Colorimetria" ou "Análise de cor pessoal"
  - Descrição: método specialist (não consultora live)
  - CTA primário: "Começar análise" ou similar
  - Visual: foto/ilustração de destaque

- **Opcional:** Light human signature per product tone guide
  - Assinatura visual sutil (não foto de consultora)
  - Indica specialist method (metodologia especializada)
  - Tom: profissional, não casual/pessoal

#### 2. Como Funciona (aside)
- **Layout:** Aside ou section lateral/complementar
- **Conteúdo:**
  - Steps do processo (ex: 3–4 passos)
  - Flow: Foto → Análise → Resultado → Unlock (se aplicável)
  - Visual: ícones ou mini-cards para cada step

#### 3. Visagismo - Em Breve Teaser
- **Layout:** Teaser card ou banner (não full hero)
- **Conteúdo:**
  - Badge/label: "Em breve"
  - Título: "Visagismo"
  - Descrição curta: o que virá
  - **SEM CTA** (apenas teaser informativo)
  
**Nota:** Copy locked: "Visagismo" (não "Maquiagem")

### Removido Completamente
- ❌ Grid 2-card quebrado
- ❌ Card "Plano personalizado" (Day-1 lock já removeu)
- ❌ Card "Moda" / "Looks" (Day-1 lock já removeu)
- ❌ Multiple service cards em grid

---

## Tone Guide - Human Signature

### Conceito
- **Specialist method, not live consultant**
- Metodologia desenvolvida por especialistas
- Não é consultoria live/ao vivo
- Não é chat com consultora
- É: sistema baseado em conhecimento especializado

### Implementação Opcional
- Light human signature visual:
  - Assinatura de design (não foto de pessoa)
  - Pode ser: ilustração abstrata, ícone profissional
  - Indica que há expertise humana por trás do método
  - Tom: confiança profissional, não intimidade pessoal

- Copy sugestões:
  - "Metodologia desenvolvida por especialistas em colorimetria"
  - "Sistema baseado em análise profissional"
  - "Método specialist para análise de cor pessoal"

---

## Estrutura da Landing (após redesign)

```
Hero Principal
├─ Value Prop
└─ CTA inicial

Serviços (REDESIGN - LOCKED)
├─ Colorimetria Hero (full-width)
│  ├─ Título + descrição
│  ├─ CTA primário: "Começar análise" ou similar
│  └─ [Opcional] Light human signature
├─ Como Funciona (aside)
│  └─ 3–4 steps do processo
└─ Visagismo - Em Breve (teaser)
   ├─ Badge "Em breve"
   ├─ Título: "Visagismo"
   └─ SEM CTA (apenas teaser informativo)

[Outras seções da landing permanecem]
```

---

## Notas de Implementação

### Priority
1. **HIGHER:** Face-crop work (se ainda aberto)
2. **HIGHER:** Paywall entitlement integration (Stripe/Pagar.me)
3. **THEN:** Landing redesign (serviços section)

### Arquivos a Modificar

**Landing:**
- `/workspace/src/components/landing/LandingHome.tsx`
- `/workspace/src/app/globals.css` (seção landing)

**Analyzing Screen:**
- `/workspace/src/components/AnalyzeFormV2.tsx` (step "analyzing")
- `/workspace/src/app/globals.css` (analyzing styles)

**Paywall CTAs:**
- `/workspace/src/components/analysis/PaywallCard.tsx` (já usa "Liberar resultado completo" ✅)
- Verificar outros CTAs de unlock usam verb "Liberar"

### Day-1 Lock Context
Landing já tem Day-1 product lock aplicado:
- ✅ Services "Plano personalizado" e "Moda" comentados
- ✅ Copy simplificado para "Análise de cor pessoal"
- ✅ Múltiplos CTAs de consultora removidos

Redesign deve:
- Remover completamente código comentado (não apenas comentar)
- Criar nova estrutura full-width hero para Colorimetria
- Adicionar teaser Maquiagem sem CTA

### Design Assets Necessários

**Landing:**
- [ ] Ilustração/foto hero para Colorimetria (full-width)
- [ ] Ícones para "Como funciona" steps (3–4 steps)
- [ ] Badge "Em breve" component/styling para Visagismo teaser
- [ ] [Opcional] Light human signature visual asset

**Analyzing:**
- [ ] Spinner ou progress indicator
- [ ] [Opcional] Step icons para Enquadramento/Pele/Estação

---

## Referências

- Day-1 Product Lock: `/workspace/src/components/landing/LandingHome.tsx` (já aplicado)
- Current SERVICES array (comentado): linhas com "DAY-1: Removed consultant plan service" etc.
- Tone guide: specialist method, not live consultant

---

---

## Analyzing Screen Specification

**Status:** ✅ Locked by Produto/Figma

### Copy Aprovado

#### Header Copy
- **Main:** `Lendo sua imagem…`
- **Subtitle:** `Protocolo profissional · [Nome do usuário]`

Exemplo: `Protocolo profissional · Maria`

#### Loading Steps (sequential)
1. `Enquadramento` - validando face crop/framing
2. `Pele` - analisando skin tone/features
3. `Estação` - determinando season

**Apresentação:** Steps aparecem sequencialmente conforme análise progride

### CTA Verb - Paywall
- **Locked copy:** `Liberar` (não "Desbloquear" ou "Ver")
- Exemplos:
  - `Liberar resultado completo`
  - `Liberar avaliação`
  - `Liberar paleta`

### Layout
- Progress indicator (spinner ou similar)
- Copy centralizado
- Steps lista vertical ou inline (design discretion)

### Estado Atual
- Arquivo: `/workspace/src/components/AnalyzeFormV2.tsx`
- Step atual: `step === "analyzing"` renderiza loading básico
- TODO: Atualizar copy para locked version

---

## Changelog

**2026-09-15 (02:12 UTC):** Locked handoff completo (Produto/Figma)  
- Landing: Colorimetria hero + Como funciona aside
- Landing: Visagismo Em breve (sem CTA, não "Maquiagem")
- Analyzing: copy `Lendo sua imagem…` / `Protocolo profissional · [Nome]`
- Analyzing: steps Enquadramento → Pele → Estação
- Paywall CTA verb: `Liberar` (locked)

**2026-09-15 (02:10 UTC):** Spec criada baseada em aprovação de redesign  
- Single Colorimetria hero (full-width) + aside "Como funciona"
- Em breve teaser (sem CTA)
- No 2-card broken grid
- Optional light human signature per product tone guide
- Face-crop e paywall stay higher priority
