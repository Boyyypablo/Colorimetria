"""Transcreve módulos MakeUp Academy 04–09 no PC (Whisper local, sem API).

Saída: aprendizado/material/_extracted/makeup-academy/
Insumo interno — não republicar. Já existente é pulado (retomável).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ACADEMY = ROOT / "aprendizado" / "material" / "MakeUp Academy - Renata Meins"
OUT_DIR = ROOT / "aprendizado" / "material" / "_extracted" / "makeup-academy"

# Colorimetria primeiro; visagismo em seguida; aulas enormes (09) por último.
MODULE_PRIORITY = ("07", "08", "04", "05", "06", "09")
VIDEO_EXT = {".mp4", ".MP4", ".mov", ".mkv"}


def fmt(ts: float) -> str:
    h = int(ts // 3600)
    m = int((ts % 3600) // 60)
    s = int(ts % 60)
    if h:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def slug(name: str) -> str:
    stem = Path(name).stem
    ascii_stem = "".join(
        c for c in unicodedata.normalize("NFKD", stem) if not unicodedata.combining(c)
    )
    ascii_stem = re.sub(r"[^\w\-]+", "-", ascii_stem, flags=re.ASCII)
    return ascii_stem.strip("-")[:90] or "aula"


def module_dirs(only: list[str] | None) -> list[Path]:
    if not ACADEMY.is_dir():
        raise SystemExit(f"Pasta do curso não encontrada: {ACADEMY}")
    wanted = only or list(MODULE_PRIORITY)
    found: list[Path] = []
    by_prefix = {
        p.name[:2]: p
        for p in ACADEMY.iterdir()
        if p.is_dir() and re.match(r"^\d{2}\b", p.name)
    }
    for code in wanted:
        d = by_prefix.get(code)
        if d:
            found.append(d)
        else:
            print(f"aviso: módulo {code} não encontrado", file=sys.stderr)
    return found


def videos_in(folder: Path) -> list[Path]:
    files = [
        p
        for p in folder.rglob("*")
        if p.is_file() and p.suffix in VIDEO_EXT
    ]
    return sorted(files, key=lambda p: p.name.lower())


def out_paths(module_code: str, video: Path) -> tuple[Path, Path]:
    dest = OUT_DIR / module_code
    dest.mkdir(parents=True, exist_ok=True)
    base = dest / slug(video.name)
    return base.with_suffix(".txt"), base.with_suffix(".md")


def transcribe_one(model, video: Path, txt: Path, md: Path, model_name: str) -> None:
    print(f"Transcrevendo {video.name} …", flush=True)
    segments, info = model.transcribe(
        str(video),
        language="pt",
        vad_filter=True,
        beam_size=5,
        word_timestamps=False,
    )
    lines: list[str] = []
    plain: list[str] = []
    for i, seg in enumerate(segments, start=1):
        line = f"[{fmt(seg.start)} → {fmt(seg.end)}] {seg.text.strip()}"
        lines.append(line)
        plain.append(seg.text.strip())
        if i % 25 == 0:
            print(f"  … {i} segmentos (até {fmt(seg.end)})", flush=True)

    txt.write_text("\n".join(lines) + "\n", encoding="utf-8")
    md.write_text(
        f"# Transcrição — {video.name}\n\n"
        f"- Módulo pasta: `{video.parent.name}`\n"
        f"- Modelo: Whisper `{model_name}` (faster-whisper, local)\n"
        f"- Idioma: pt\n"
        f"- Duração aproximada: {info.duration:.0f}s\n"
        f"- Uso: insumo interno Colometria — não republicar.\n\n"
        "## Com timestamps\n\n"
        + "\n\n".join(lines)
        + "\n\n## Texto contínuo\n\n"
        + " ".join(plain)
        + "\n",
        encoding="utf-8",
    )
    print(f"  OK {txt.relative_to(ROOT)} ({len(lines)} segmentos)", flush=True)


def write_manifest(done: list[dict]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / "manifest.json"
    path.write_text(
        json.dumps({"videos": done}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--modules",
        default="07,08,04,05,06,09",
        help="Códigos de módulo, vírgula (padrão: colorimetria primeiro)",
    )
    parser.add_argument("--model", default="small", help="Whisper: tiny|base|small|medium")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Máximo de vídeos novos nesta execução")
    args = parser.parse_args()

    only = [c.strip() for c in args.modules.split(",") if c.strip()]
    dirs = module_dirs(only)
    jobs: list[tuple[str, Path, Path, Path]] = []
    for d in dirs:
        code = d.name[:2]
        for video in videos_in(d):
            txt, md = out_paths(code, video)
            jobs.append((code, video, txt, md))

    pending = [j for j in jobs if not j[2].exists()]
    print(f"Vídeos: {len(jobs)} | já transcritos: {len(jobs) - len(pending)} | pendentes: {len(pending)}")
    if args.dry_run:
        for code, video, txt, _md in pending:
            print(f"  [pendente] {code} {video.name} -> {txt.name}")
        return 0

    if not pending:
        print("Nada a fazer.")
        return 0

    if args.limit > 0:
        pending = pending[: args.limit]
        print(f"Limitado a {len(pending)} vídeo(s).")

    from faster_whisper import WhisperModel

    print(f"Carregando Whisper `{args.model}` (CPU int8)…", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    done_meta: list[dict] = []
    manifest_path = OUT_DIR / "manifest.json"
    if manifest_path.exists():
        try:
            done_meta = json.loads(manifest_path.read_text(encoding="utf-8")).get("videos", [])
        except json.JSONDecodeError:
            done_meta = []

    for code, video, txt, md in pending:
        transcribe_one(model, video, txt, md, args.model)
        done_meta.append(
            {
                "module": code,
                "file": video.name,
                "txt": str(txt.relative_to(ROOT)).replace("\\", "/"),
            }
        )
        write_manifest(done_meta)

    print("Batch desta execução concluído.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
