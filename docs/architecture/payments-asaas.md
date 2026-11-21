# Pagamentos Asaas (lançamento)

Cobrança one-shot no Glowing. Sem assinatura no v1.

## SKUs

| SKU | Preço default | Gate | Libera |
|-----|---------------|------|--------|
| `ANALYSIS` | R$ 67 (`ASAAS_ANALYSIS_PRICE_CENTS=6700`) | Antes de `POST /api/analyses` | Upload + laudo + plano |
| `REVIEW` | R$ 129 (`ASAAS_REVIEW_PRICE_CENTS=12900`) | Antes de `PATCH request_review` | Fila consultora |

Feature flag: `PAYMENTS_ENABLED=true`. Com `false` (default), os gates liberam — útil em dev/demo.

## Quando pode pagar

- **ANALYSIS**: logada; reusa order `PAID` sem `analysisId` (órfã) ou `AWAITING_PAYMENT` válida (~24h).
- **REVIEW**: análise existente, não `APPROVED`; no máximo uma REVIEW paga/pending por análise no v1.
- Após Pix liquidar: webhook marca `PAID`; o front também faz polling em `GET /api/payments/:id?sync=1`.

## Fluxo

1. `POST /api/payments` — cria `PaymentOrder` + cobrança Asaas (Pix ou cartão via `invoiceUrl`).
2. Webhook `POST /api/webhooks/asaas` — `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `PAID`.
3. Análise: form envia `paymentOrderId`; API consome a order (`analysisId` vinculado).
4. Revisão: checkout REVIEW → `request_review` com `paymentOrderId`.

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
| Webhook atrasado | Polling 4s + botão “Já paguei — verificar” (`?sync=1` consulta Asaas) |
| Pagou e abandonou upload | Dashboard lista orders `ANALYSIS` `PAID` sem `analysisId` → “Continuar análise” (`/analyze?orderId=`) |
| CPF em log/voz/API | Não gravamos CPF no DB; `redactSecrets` mascara documento; erros Asaas não ecoam CPF |
| Vazamento de chave | `ASAAS_API_KEY` só em env; nunca no client; `redactSecrets` mascara `asaas_api_key` |

## CPF

Coletado só no checkout e enviado ao customer Asaas. Não persistimos CPF no Postgres — só `User.asaasCustomerId` para reuso.

## Arquivos

- `src/lib/payments/config.ts` — flag e preços
- `src/lib/payments/asaas.ts` — HTTP Asaas
- `src/lib/payments/orders.ts` — create/reuse/consume/sync
- `src/app/api/payments/**` — create/list/get/config
- `src/app/api/webhooks/asaas/route.ts`
- `src/components/payments/PaymentCheckout.tsx`

## Fora do v1

Assinatura, carteira de créditos, VTO pago, reembolso self-service na UI.
