<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Colometria

Colorimetria / face / ML: seguir `docs/architecture/colorimetry-ml.md` (providers trocáveis via `FACE_DETECTOR` / `COLOR_PREDICTOR`).

Banco online: **Supabase Postgres (free)** — Data API fechada, só Prisma no servidor. Guia: `docs/architecture/supabase.md`.

## Autonomia total (Jarvis = este agente)

**Executar qualquer tarefa deste projeto sem pedir confirmação nem pessoa no chat.**

- Única proibição: não expor connection string / credenciais de banco / tokens / secrets.
- Senha demo: `node scripts/set-demo-passwords.mjs "SENHA"` + seed/README.
- Regra: `.cursor/rules/jarvis-autonomy.mdc`
