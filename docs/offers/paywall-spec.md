# Paywall Specification (Offer Lock)

**Status:** Estrutura criada, aguardando implementação de pagamento

---

## Resumo

**FREE:** Apenas nome da estação (`Sua estação`)  
**PAID:** `Resultado completo` (R$ 97 provisório) desbloqueia:
- Confiança overall + badge (alta/moderada/baixa)
- 4 eixos (Temperatura, Valor, Croma, Contraste) com % e barra
- Paleta básica (cores para usar + cores para evitar)

**CTA:** `Liberar resultado completo`

---

## Regras de Negócio

### O que é SEMPRE gratuito (sem paywall):
1. **Nome da estação** (`Sua estação`: "Primavera Quente", etc.)
2. **Reject flow** completo (foto rejeitada = sem paywall)
3. **Estações possíveis** quando confiança <65% (sister seasons card)
4. **Descrição da estação** e **dica de subtom** (se disponível)

### O que é bloqueado até pagamento:
1. **Confiança overall** (badge + percentual)
2. **4 eixos de confiança** (Temperatura, Valor, Croma, Contraste)
3. **Paleta básica** (cores para usar + cores para evitar)

### Proibições:
- ❌ NÃO usar label "Paleta básica" no UI (usar "Paleta de cores")
- ❌ NÃO esconder nome da estação atrás do paywall
- ❌ NÃO aplicar paywall em reject ou confidence <65%

---

## Implementação Atual (Estrutura)

### Componentes

#### `PaywallCard.tsx`
Componente de paywall para conteúdo bloqueado.

**Props:**
```typescript
{
  analysisId: string;
  offerLabel?: string;      // default: "Resultado completo"
  priceLabel?: string;       // default: "R$ 97,00"
  ctaLabel?: string;         // default: "Liberar resultado completo"
  onUnlock?: (analysisId: string) => void;
}
```

**Renderizado quando:** `AnalysisResultViewProps.isLocked === true`

**CSS:** `.paywall-card` e variantes em `globals.css`

#### `AnalysisResultView.tsx`
Atualizado com lógica de offer lock:

```typescript
export type AnalysisResultViewProps = {
  // ...
  isLocked?: boolean; // true = show paywall for confidence + axes + palette
  // ...
}
```

**Lógica condicional:**
- `!props.isLocked` → renderiza confiança, eixos e paleta normalmente
- `props.isLocked` → renderiza `PaywallCard` no lugar de confiança/eixos, oculta paleta

**Sister seasons card:** sempre renderizado quando `confidencePercent < 65`, independente de `isLocked`

---

## Próximos Passos (TODO para implementação completa)

### 1. Backend: Entitlements e Payment
- [ ] Criar modelo `Entitlement` ou flag `hasPaidResult` em `Analysis`
- [ ] Endpoint de pagamento: `POST /api/analyses/:id/unlock` (Stripe/Pagar.me)
- [ ] Webhook de confirmação de pagamento (atualiza entitlement)
- [ ] Endpoint para verificar status: `GET /api/analyses/:id/entitlement`

### 2. Frontend: Payment Flow
- [ ] `PaywallCard.onUnlock` → abrir modal de pagamento ou redirecionar para checkout
- [ ] Integração com Stripe/Pagar.me (client SDK)
- [ ] Loading states durante processamento de pagamento
- [ ] Success/error feedback após pagamento
- [ ] Revalidação automática após sucesso (recarregar página ou refetch props)

### 3. Server-side: Render Props com Entitlement
Atualizar a página `/analyses/[id]` para buscar entitlement e passar `isLocked`:

```typescript
// src/app/analyses/[id]/page.tsx
const analysis = await prisma.analysis.findUnique({
  where: { id },
  include: { /* ... */ }
});

const hasPaidResult = await checkEntitlement(analysis.id, session.user.id);

return (
  <AnalysisResultView
    // ...
    isLocked={!hasPaidResult}
    // ...
  />
);
```

### 4. Variáveis de Ambiente
```env
# Stripe (ou Pagar.me)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Preço do SKU (em centavos)
PAID_RESULT_PRICE_CENTS=9700  # R$ 97,00
```

### 5. Testes
- [ ] Teste unitário: `PaywallCard` renderiza corretamente
- [ ] Teste integração: `/api/analyses/:id/unlock` com mock de pagamento
- [ ] Teste E2E: fluxo completo de análise → paywall → pagamento → unlock
- [ ] QA manual: verificar que sister seasons (confidence <65%) não tem paywall

---

## Design / UX

### Paywall Card
- **Background:** Gradiente cream (`#fdf6f0` → `#fef9f5`)
- **Border:** 2px solid terracotta (`--lp-terracotta`)
- **Shadow:** Suave (`rgba(212, 165, 116, 0.15)`)
- **Layout:** Centralizado, max-width 32rem, padding 2rem
- **CTA:** Botão primário terracotta, full-width, hover effect

### Free vs Paid View

#### FREE (isLocked=true):
```
┌─────────────────────────────────┐
│ Foto enviada                    │
│ Sua estação: Primavera Quente   │  ← sempre visível
│                                 │
│ ┌─────────────────────────────┐ │
│ │  Resultado completo          │ │  ← paywall card
│ │  R$ 97,00                    │ │
│ │  [Liberar resultado]         │ │
│ └─────────────────────────────┘ │
│                                 │
│ (Descrição da estação)          │
└─────────────────────────────────┘
```

#### PAID (isLocked=false):
```
┌─────────────────────────────────┐
│ Foto enviada                    │
│ Sua estação: Primavera Quente   │
│                                 │
│ Subtom: Quente                  │
│ [Badge: Alta 85%]               │
│                                 │
│ Confiança por eixo:             │
│ Temperatura ████████░░ 85%      │
│ Valor       ███████░░░ 78%      │
│ Croma       ████████░░ 82%      │
│ Contraste   ██████░░░░ 68%      │
│                                 │
│ Paleta de cores                 │
│ Cores para usar:                │
│ [swatches...]                   │
└─────────────────────────────────┘
```

---

## Edge Cases

### 1. Confidence <65% + Locked
**Comportamento:**
- Sister seasons card **sempre visível** (sem paywall)
- Paywall card **não renderizado** (confidence <65% = free)
- Estações possíveis permanecem disponíveis

**Código:**
```typescript
// Sister seasons sempre visível quando <65%
{props.confidencePercent != null && props.confidencePercent < 65 && (
  <SisterSeasonsCardFigma /* ... */ />
)}

// Paywall só renderizado se locked E confidence >= 65%
{props.isLocked && (props.confidencePercent == null || props.confidencePercent >= 65) && (
  <PaywallCard /* ... */ />
)}
```

**Nota:** Código atual renderiza paywall independente de confidence, mas na prática `isLocked` será `false` quando confidence <65% (regra de negócio no backend).

### 2. Reject Flow
**Comportamento:**
- Foto rejeitada → análise não criada (ou status REJECTED)
- Usuário nunca chega na tela de resultado
- Sem paywall (usuário fica no flow de retake)

### 3. Análise PENDING
**Comportamento:**
- Status "Em processamento" → sem paywall (ainda não há resultado)
- Quando análise completa → recarregar página → aplicar lógica de entitlement

---

## Pricing (Provisional)

| SKU                | Preço (R$) | Inclui                                      |
|--------------------|------------|---------------------------------------------|
| Análise gratuita   | R$ 0       | Nome da estação                             |
| Resultado completo | R$ 97      | Confiança + 4 eixos + Paleta básica         |

**Futuros SKUs (não implementar agora):**
- Paleta expandida
- Consultora 1:1
- Plano personalizado

---

## Referências

- Especificação original: "Offer lock for entitlement UI"
- Componente: `/workspace/src/components/analysis/PaywallCard.tsx`
- View: `/workspace/src/components/analysis/AnalysisResultView.tsx`
- CSS: `/workspace/src/app/globals.css` (`.paywall-card`)
- Commit: "feat(paywall): offer lock structure for entitlement UI"

---

## Changelog

**2026-09-15:** Estrutura inicial criada (PaywallCard + isLocked logic)  
- Componente `PaywallCard` com props e CSS
- `AnalysisResultView` com lógica condicional `isLocked`
- Documentação completa de especificação e TODOs
