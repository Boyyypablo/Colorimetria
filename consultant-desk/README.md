# Consultant Desk

Fila e chat das consultoras, **fora** do Next.js (`src/`). Mesmo Postgres (Supabase) e mesma tabela `User`. Build e `package.json` próprios.

```
consultant-desk/
├── backend/     # Fastify, porta 4010
└── frontend/    # Vite + React, porta 5174, proxy /api-desk → 4010
```

O backend importa `@prisma/client` do `node_modules` da raiz (`file:../../node_modules/@prisma/client`). Rode `npm install` na raiz antes do desk. `prisma generate` sai do `postinstall` da raiz.

## Subir

```bash
# raiz do monorepo, com DATABASE_URL no .env
npm install

cd consultant-desk/backend
cp .env.example .env
npm install
npm run dev          # http://127.0.0.1:4010/health → { ok, service: "consultant-desk-backend" }

cd ../frontend
npm install
npm run dev          # http://localhost:5174
```

`backend/src/lib/prisma.ts` carrega primeiro `../../../../.env` (raiz) e depois `consultant-desk/backend/.env` com override. Sem `DATABASE_URL` o processo aborta na subida. `DESK_JWT_SECRET` ausente ou igual ao default só gera warning fora de produção; com `DESK_ENV=production` o processo recusa segredo ausente, default ou com menos de 32 caracteres.

## O que persiste e o que não

| Dado | Onde |
|------|------|
| Consultora (`User.role = CONSULTANT`) | Postgres |
| `DeskReview`, `DeskThread`, `DeskMessage`, `DeskThreadTransfer` | Postgres. Arquivar preenche `archivedAt`. Não há rota de delete. |
| Assinantes SSE | Memória do processo (`sseByThread`). Restart perde o stream, não as mensagens. |
| Lockout de login (5 falhas, janela 15 min) | Memória do processo. Reiniciar zera. |
| Chat da usuária no Next (`POST /api/analyses/:id/chat`) | **Outro** `Map` em memória. Não cria `DeskMessage` nem aparece na inbox. |

A inbox lista threads do banco. O botão de simular avaliação chama `POST /reviews/intake`, que cria review + thread e duas mensagens (sistema e um texto fixo de “cliente”). Isso não é a usuária do app Glowing.

Filtro da inbox no servidor: `active` (não arquivadas, atribuídas à consultora **ou** sem dono), `unread`, `answered` (`OPEN` e unread 0), `archived`, `all` (sem filtro de arquivo nem de dono). A UI faz polling a cada **6 s** com a aba visível. A thread aberta usa SSE; se o `EventSource` falhar, polling a cada **2 s**.

## HTTP

Prefixos registrados em `backend/src/index.ts`. Mutações exigem `Origin` ou `Referer` em `CORS_ORIGIN` (padrão `http://localhost:5174`). Sem os dois, curl local passa só quando `DESK_ENV` não é `production` (`403` em produção).

Auth: cookie httpOnly `desk_session` (JWT 7 dias, `SameSite=Lax`). `Secure` só com `DESK_COOKIE_SECURE=true`. Bearer no header só se `DESK_ALLOW_BEARER=true`. Papéis aceitos no login e nas rotas: `CONSULTANT` e `ADMIN`. `POST /auth/register` **cria** `User` com role `CONSULTANT` e `lgpdConsentAt` agora — não há convite. Senha de cadastro: mínimo 10, com letra, número e caractere especial. Login e register: no máximo 5 req/min, além do limite global de 100 req/min (ban após 2 estouros).

| Método | Caminho | Auth |
|--------|---------|------|
| `GET` | `/health` | não |
| `POST` | `/auth/register`, `/auth/login`, `/auth/logout` | não (logout só limpa o cookie) |
| `GET` | `/auth/me`, `/auth/consultants` | sim |
| `GET` | `/reviews`, `/reviews/:reviewId` | sim |
| `POST` | `/reviews/intake`, `/reviews/:reviewId/send-report` | sim |
| `GET` | `/chat/threads?filter=` | sim |
| `GET` | `/chat/threads/:id/messages?after=` | sim (também zera unread) |
| `GET` | `/chat/threads/:id/stream` | sim (SSE: evento `ready`, depois `message` / `thread`) |
| `POST` | `/chat/threads/:id/messages` | sim |
| `POST` | `/chat/threads/:id/archive`, `…/unarchive`, `…/transfer` | sim |

`POST` de mensagem: texto até 4000 caracteres e/ou até 3 anexos em data URL (imagem ou pdf/texto/word), cada um até 2 MB. Body do Fastify limitado a 8 MB. Texto com e-mail, telefone, WhatsApp, Telegram ou convite direto volta `422` (`pii-filter.ts`). URL comum (incluindo Instagram) passa e vai para `externalLinks`. Thread arquivada: `409` ao enviar ou transferir. Transferir para si mesmo: `400`. Destino precisa existir com role `CONSULTANT` ou `ADMIN`.

O proxy do Vite (`/api-desk`) tira `Domain` e `Secure` do `Set-Cookie` para a sessão funcionar em `http://localhost:5174`.

## UI

| Rota | Página |
|------|--------|
| `/login` | Entrar ou cadastrar consultora |
| `/` | Inbox (filtro, intake simulado, relatório automático) |
| `/threads/:threadId` | Conversa, arquivo, transferência |

## Fora deste processo

- Não há fila `LISTEN/NOTIFY` nem outbox. O README antigo descrevia isso como desenho futuro; não está implementado.
- `docker-compose.yml` e `docker-compose.prod.yml` não sobem o desk.
- Logs do Fastify redactam `authorization`, `cookie`, `set-cookie`, `password`, `passwordHash` e `token`. Erro 5xx e mensagem que pareça connection string ou JWT viram `"Erro interno."`.
