# Aprendizado

Única pasta de **conteúdo de referência / estudo** do Colometria — fora do código da aplicação.

```
aprendizado/
├── material/          # PDFs, vídeo e cursos (conhecimento de colorimetria / visagismo)
│   ├── _extracted/    # textos/transcrições derivados (não republicar)
│   └── MakeUp Academy - Renata Meins/   # curso completo (aulas em vídeo)
└── designs/           # exports Figma Make (referência de UI)
    ├── landing/       # home
    └── analise/       # formulário + resultado da análise
```

## Material

| Conteúdo | Onde |
|----------|------|
| PDFs e vídeo avulsos (tonalização, anamnese, extratos) | `material/` na raiz |
| Extratos derivados | `material/_extracted/` |
| **MakeUp Academy** (Renata Meins) | `material/MakeUp Academy - Renata Meins/` |

O curso MakeUp Academy cobre workshop, fundamentos de pele, **proporção áurea / visagismo**, **colorimetria**, visagismo na maquiagem, base, camuflagem, blush, lábios, sobrancelhas, olhos, facechart, consultoria e bônus. Módulos mais próximos do produto Colometria: **04–09** (visagismo e colorimetria).

Arquivos grandes (MP4, PDF) ficam **fora do Git** (`.gitignore` em `/aprendizado/material`). Não republicar conteúdo de terceiros.

## Uso

- **Produto (código):** `src/`, `prisma/`, `data/`, `docs/architecture/`
- **QA:** `docs/qa/`
- **Este diretório:** estudo, briefings e designs — **não** é importado pelo Next.js
