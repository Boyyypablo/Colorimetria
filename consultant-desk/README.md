# Consultant Desk

Dashboard **externo** e independente do app Glowing (`src/`).  
Consultoras recebem avaliações e conversam com clientes **só dentro da plataforma**.

```
consultant-desk/
├── README.md
├── backend/
│   ├── package.json          # Fastify + Zod + tsx
│   ├── .env.example          # PORT=4010
│   └── src/
│       ├── index.ts          # entry
│       ├── middleware/auth.ts
│       ├── routes/           # health, reviews, chat (+ SSE)
│       ├── services/         # chat-queue, pii-filter
│       └── types/chat.ts
└── frontend/
    ├── package.json          # Vite + React + react-router
    ├── vite.config.ts        # porta 5174, proxy /api-desk → :4010
    ├── index.html
    └── src/
        ├── main.tsx / App.tsx
        ├── pages/Inbox.tsx, Thread.tsx
        └── lib/api.ts, chat-client.ts  # SSE + polling fallback
```

Não compartilha `package.json` nem build com o Next.js da raiz.

## Como foi pensado (esqueleto)

### Chat “quase 24h”, baixa latência

1. **App principal** (futuro) publica evento `message.created` / `review.assigned` numa fila leve (Postgres `LISTEN/NOTIFY` ou tabela `outbox` + worker).
2. **Backend** deste desk consome a fila e expõe:
   - `GET /chat/threads` — inbox
   - `GET /chat/threads/:id/messages?after=cursor` — long-poll curto (≤2s) ou SSE
   - `POST /chat/threads/:id/messages` — envio (passa pelo filtro PII **antes** de persistir)
3. **Frontend** usa **SSE** (preferido) com fallback para **polling a 1,5–2s** só na thread aberta; inbox usa polling mais lento (5–8s) ou push quando conectado.
4. Meta de UX: mensagem do cliente → consultora em **poucos segundos**, sem WebSocket obrigatório no v1 (SSE basta e escala fácil atrás de proxy).

### Filtro de dados pessoais (PII)

Camada única no backend: `services/pii-filter.ts`.

- Roda **no servidor** em todo `POST` de mensagem (cliente e consultora).
- Detecta padrões: telefone BR/internacional, e-mail, `@handles`, URLs de WhatsApp/Telegram/me, CPF-like, etc.
- Se bater: **rejeita** a mensagem (`422`) e devolve motivo genérico (“Mantenha o contato nesta plataforma”).
- Opcional depois: redaction + log de auditoria sem guardar o trecho sensível.
- Front pode espelhar o mesmo regex só como UX; **a verdade é o backend**.

### Segurança de produto

- Auth só para role `CONSULTANT` / `ADMIN` (JWT/session compartilhada ou token próprio — a definir na implementação).
- Sem links externos incentivados na UI do chat.
- Sem `NEXT_PUBLIC_SUPABASE_*` neste desk; API própria + cookies/httpOnly.

## Scripts (depois de `npm install` em cada pasta)

```bash
cd consultant-desk/backend && npm run dev
cd consultant-desk/frontend && npm run dev
```

## Auth e chat (persistidos no Supabase)

- Cadastro/login grava em `User` (role `CONSULTANT`) via Prisma + `DATABASE_URL` do monorepo.
- Threads/mensagens: tabelas `DeskThread`, `DeskMessage`, `DeskReview`, `DeskThreadTransfer`.
- **Não há delete de conversa** — use `POST /chat/threads/:id/archive` (e `unarchive`).
- Encaminhar: `POST /chat/threads/:id/transfer` + `GET /auth/consultants`.
- Filtros inbox: `?filter=active|unread|answered|archived|all`.

## Status

Auth + inbox + arquivo/transferência persistidos no Postgres (Supabase). Chat SSE ainda em memória de processo.
