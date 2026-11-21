import { useState, type FormEvent } from "react";

export type PendingAttach = {
  kind: "image" | "document";
  name: string;
  mime: string;
  dataUrl: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

type ComposerProps = {
  sending: boolean;
  hint: string;
  onSend: (body: string, attachments: PendingAttach[]) => Promise<void>;
  onHint: (msg: string) => void;
};

export function Composer({ sending, hint, onSend, onHint }: ComposerProps) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttach[]>([]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: PendingAttach[] = [];
    for (const file of [...files].slice(0, 3)) {
      if (file.size > 2 * 1024 * 1024) {
        onHint("Cada anexo deve ter no máximo 2 MB.");
        continue;
      }
      const dataUrl = await fileToDataUrl(file);
      next.push({
        kind: file.type.startsWith("image/") ? "image" : "document",
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 3));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!body.trim() && attachments.length === 0) return;
    const payloadBody = body.trim();
    const payloadAttach = attachments;
    await onSend(payloadBody, payloadAttach);
    setBody("");
    setAttachments([]);
  }

  return (
    <form className="composer" onSubmit={(e) => void onSubmit(e)}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Responda a cliente… Links ok (Instagram etc.). Sem telefone ou e-mail."
        rows={3}
      />
      {attachments.length > 0 ? (
        <ul className="composer__attach">
          {attachments.map((a) => (
            <li key={a.name + a.mime}>{a.name}</li>
          ))}
        </ul>
      ) : null}
      <div className="composer__row">
        <label className="btn-soft file-btn">
          Foto / documento
          <input
            type="file"
            accept="image/*,.pdf,.txt,.doc,.docx"
            multiple
            hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </form>
  );
}
