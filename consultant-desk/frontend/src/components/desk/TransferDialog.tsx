import { useState, type FormEvent } from "react";
import type { DeskPeer } from "../../lib/chat-client";

type TransferDialogProps = {
  peers: DeskPeer[];
  onClose: () => void;
  onConfirm: (toConsultantId: string, note?: string) => Promise<void> | void;
};

export function TransferDialog({
  peers,
  onClose,
  onConfirm,
}: TransferDialogProps) {
  const [to, setTo] = useState(peers[0]?.id || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!to) return;
    setBusy(true);
    try {
      await onConfirm(to, note || undefined);
      onClose();
    } catch {
      /* parent surfaces error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="link-gate" role="dialog" aria-modal="true">
      <form className="link-gate__card" onSubmit={(e) => void onSubmit(e)}>
        <p className="link-gate__eyebrow">Encaminhar conversa</p>
        <h2>Transferir para outra consultora</h2>
        {peers.length === 0 ? (
          <p className="empty">
            Não há outras consultoras cadastradas. Cadastre outra conta no desk
            para transferir.
          </p>
        ) : (
          <>
            <label className="auth-form">
              Consultora destino
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-form">
              Nota (opcional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Contexto para a colega"
              />
            </label>
          </>
        )}
        <div className="link-gate__actions">
          <button
            type="button"
            className="link-gate__secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="link-gate__primary"
            disabled={!to || peers.length === 0 || busy}
          >
            {busy ? "Encaminhando…" : "Encaminhar"}
          </button>
        </div>
      </form>
    </div>
  );
}
