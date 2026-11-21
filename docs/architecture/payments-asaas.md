# Pagamentos Asaas (lançamento)

Cobrança one-shot no Glowing. Sem assinatura no v1.

## SKUs

| SKU | Preço default | Gate | Libera |
|-----|---------------|------|--------|
| `ANALYSIS` | R$ 67 (`ASAAS_ANALYSIS_PRICE_CENTS=6700`) | Paywall no resultado (`/analyses/[id]`) após foto aprovada | Laudo completo (estação, eixos, paleta, orientações, pele) + **7 dias de chat** com a consultora |
| `REVIEW` | R$ 129 (`ASAAS_REVIEW_PRICE_CENTS=12900`) | Antes de `PATCH request_review` ou no chat após os 7 dias | Fila de revisão humana + continuidade do chat |

Feature flag: `PAYMENTS_ENABLED=true`. Com `false` (default no beta aberto), os gates liberam com aviso discreto de acesso beta gratuito — preços seguem visíveis na landing.

## Regras de produto (paywall no resultado)

1. **Upload gratuito (`/analyze`)**: a cliente envia foto + intenção + áreas + contexto sem pagar antes.
2. **Troca gratuita de foto ruim**: se o servidor detectar `qualityBand === "ruim"` ou `faceDetected === false`, `/analyses/[id]` **não exibe cobrança** e oferece envio gratuito de nova foto. `POST /api/payments` também recusa cobrar `ANALYSIS` sobre foto que precisa de troca.
3. **100% travado no servidor até pagar**: com foto aprovada e `PAYMENTS_ENABLED=true`, `/analyses/[id]` e `GET /api/analyses/[id]` retêm 100% da leitura (estação, eixos, paleta, orientações) no servidor e exibem apenas a foto validada + checkout Asaas. O `/dashboard` também oculta o nome da estação até a liberação.
4. **Chat com a consultora**: 7 dias inclusos contados a partir da confirmação do pagamento de `ANALYSIS` (`paidAt`). Sem `ANALYSIS` paga, o chat fica bloqueado; após 7 dias, solicita `REVIEW` (R$ 129) para continuar.
5. **Histórico e CDC**: `/conta` exibe a seção *Meus pagamentos* (status, recibo e retomada de cobranças `AWAITING_PAYMENT` via `invoiceUrl`), e o checkout informa a garantia legal de 7 dias (CDC Art. 49).

## Fluxo

1. `POST /api/analyses` — valida a foto e processa a leitura (retorna resposta sanitizada quando `PAYMENTS_ENABLED=true`).
2. `POST /api/payments` — cria `PaymentOrder` vinculada à `analysisId` + cobrança Asaas (Pix ou cartão via `invoiceUrl`), reutilizando pedidos pagos/em aberto quando aplicável.
3. Webhook `POST /api/webhooks/asaas` — `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `PAID`.
4. Destravamento imediato: polling 4s (`GET /api/payments/:id?sync=1`) + `router.refresh()` liberam `/analyses/[id]`.
5. Revisão: checkout `REVIEW` → `PATCH /api/analyses/[id]` (`request_review`) com `paymentOrderId`.

## Env

```bash
PAYMENTS_ENABLED="true"
ASAAS_API_KEY="..."           # sandbox ou produção — nunca no client
ASAAS_BASE_URL="https://sandbox.asaas.com/api/v3"  # prod: https://api.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN="..."     # mesmo token configurado no painel Asaas
ASAAS_ANALYSIS_PRICE_CENTS="6700"
ASAAS_REVIEW_PRICE_CENTS="12900"
```

Webhook: configure no Asaas apontando para `https://<host>/api/webhooks/asaas` com o token em `asaas-access-token` (header) ou `?token=`.

## Riscos mitigados

| Risco | Mitigação |
|-------|-----------|
| Foto ruim cobrada antes da hora | Troca gratuita antes do checkout + validação em `POST /api/payments` |
| Vazamento de cartela no HTML/API | Retenção server-side em `analyses/[id]/page.tsx`, `GET /api/analyses/[id]`, `POST /api/analyses` e `dashboard/page.tsx` |
| Webhook atrasado | Polling 4s + botão “Já paguei — verificar” (`?sync=1` consulta Asaas) |
| Abandono de checkout | `/conta` lista pagamentos pendentes com botão “Retomar pagamento” (`invoiceUrl`); créditos órfãos pagos são reaproveitados automaticamente |
| CPF em log/voz/API | Não gravamos CPF no DB; `redactSecrets` mascara documento; erros Asaas não ecoam CPF |
| Vazamento de chave | `ASAAS_API_KEY` só em env; nunca no client; `redactSecrets` mascara `asaas_api_key` |

## Arquivos principais

- `src/lib/payments/config.ts` — flag e preços
- `src/lib/payments/access.ts` — estado de acesso (`unlocked` | `needs_retake` | `payment_required`)
- `src/lib/payments/asaas.ts` — HTTP Asaas
- `src/lib/payments/orders.ts` — create/reuse/consume/sync
- `src/lib/desk/chat-access.ts` — 7 dias pós-pagamento `ANALYSIS` + liberação por `REVIEW`
- `src/app/api/payments/**` e `src/app/api/webhooks/asaas/route.ts`
- `src/components/payments/PaymentCheckout.tsx` e `PaymentHistorySection.tsx`
- `src/components/analysis/AnalysisLockedGate.tsx`

## Fora do v1

Assinatura, carteira de créditos, VTO/Looks pagos, reembolso self-service na UI.
