type Props = {
  url: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExternalLinkGate({ url, onCancel, onConfirm }: Props) {
  return (
    <div className="link-gate" role="dialog" aria-modal="true" aria-labelledby="link-gate-title">
      <div className="link-gate__card">
        <p className="link-gate__eyebrow">Saída do sistema</p>
        <h2 id="link-gate-title">Você está saindo da Glowing</h2>
        <p>
          Este link abre um destino externo. Conteúdo fora da plataforma pode
          comprometer sua privacidade ou segurança, dependendo do site.
        </p>
        <p className="link-gate__url">{url}</p>
        <div className="link-gate__actions">
          <button type="button" className="link-gate__secondary" onClick={onCancel}>
            Continuar no desk
          </button>
          <button type="button" className="link-gate__primary" onClick={onConfirm}>
            Abrir mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
