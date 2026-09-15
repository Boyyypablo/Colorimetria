# Design Handoff Directory

Este diretório contém exports de design (Figma → HTML/ENG) para implementação.

---

## Estrutura Esperada

```
design-handoff/
├── servicos-transformacao-2026-09-15/
│   ├── index.html              # Figma export principal
│   ├── assets/
│   │   ├── images/             # Ilustrações, fotos
│   │   ├── icons/              # Ícones SVG
│   │   └── fonts/              # Fontes (se custom)
│   └── README.md               # Notas do handoff
└── README.md                   # Este arquivo
```

---

## Handoffs Pendentes

### Serviços + Presença (2026-09-15)
- **Status:** ⏳ Aguardando export
- **Spec:** `/workspace/docs/design/landing-redesign-spec.md`
- **Target PR:** #2
- **Implementação:** Quando capacity (após face-crop + entitlement)

**Conteúdo esperado:**
- Colorimetria hero (full-width layout)
- Como funciona aside (3–4 steps, ícones)
- Visagismo Em breve teaser (badge + copy, sem CTA)
- Analyzing screen copy: "Lendo sua imagem…" + steps
- Copy keys locked: Liberar, Visagismo, critério especialista

---

## Como Usar

1. **Receber export do Figma:**
   - Designer exporta HTML/ENG-HANDOFF
   - Adicionar ao diretório apropriado (ex: `servicos-transformacao-2026-09-15/`)

2. **Revisar handoff:**
   - Abrir `index.html` em browser
   - Verificar layout, spacing, copy
   - Extrair assets (images, icons)

3. **Implementar:**
   - Seguir spec em `/workspace/docs/design/`
   - Referenciar handoff HTML para detalhes visuais
   - Extrair/otimizar assets conforme necessário

4. **Assets:**
   - Imagens: otimizar (WebP se possível)
   - Ícones: preferir SVG inline ou sprite
   - Fonts: verificar se já em uso ou adicionar

---

## Notas

- Handoff files **não devem** ser commitados se muito grandes (>5MB)
- Assets finais vão para `/public/` apropriado
- Este diretório é para reference durante desenvolvimento
- Adicionar `.gitignore` se necessário para evitar commit de exports temporários
