# Landing Redesign Specification

**Status:** Aprovado para implementação futura  
**Priority:** Após face-crop e paywall work estarem completos

---

## Resumo

Redesign da seção "Serviços" da landing page com foco em Colorimetria como hero único + teaser para Maquiagem.

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

#### 3. Maquiagem - Em Breve Teaser
- **Layout:** Teaser card ou banner (não full hero)
- **Conteúdo:**
  - Badge/label: "Em breve"
  - Título: "Maquiagem"
  - Descrição curta: o que virá
  - **SEM CTA** (apenas teaser informativo)

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

Serviços (REDESIGN)
├─ Colorimetria Hero (full-width)
│  ├─ Título + descrição
│  ├─ CTA primário
│  └─ [Opcional] Light human signature
├─ Como Funciona (aside)
│  └─ 3–4 steps do processo
└─ Maquiagem - Em Breve (teaser)
   ├─ Badge "Em breve"
   ├─ Título + descrição
   └─ SEM CTA

[Outras seções da landing permanecem]
```

---

## Notas de Implementação

### Priority
1. **HIGHER:** Face-crop work (se ainda aberto)
2. **HIGHER:** Paywall entitlement integration (Stripe/Pagar.me)
3. **THEN:** Landing redesign (serviços section)

### Arquivos a Modificar
- `/workspace/src/components/landing/LandingHome.tsx`
- `/workspace/src/app/globals.css` (seção landing)

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
- [ ] Ilustração/foto hero para Colorimetria (full-width)
- [ ] Ícones para "Como funciona" steps
- [ ] Badge "Em breve" component/styling
- [ ] [Opcional] Light human signature visual asset

---

## Referências

- Day-1 Product Lock: `/workspace/src/components/landing/LandingHome.tsx` (já aplicado)
- Current SERVICES array (comentado): linhas com "DAY-1: Removed consultant plan service" etc.
- Tone guide: specialist method, not live consultant

---

## Changelog

**2026-09-15 (02:10 UTC):** Spec criada baseada em aprovação de redesign  
- Single Colorimetria hero (full-width) + aside "Como funciona"
- Maquiagem = Em breve teaser (sem CTA)
- No 2-card broken grid
- Optional light human signature per product tone guide
- Face-crop e paywall stay higher priority
