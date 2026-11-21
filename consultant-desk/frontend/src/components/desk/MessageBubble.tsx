import type { ChatMessage } from "../../lib/chat-client";
import { roleLabel } from "../../lib/desk-format";

type MessageBubbleProps = {
  message: ChatMessage;
  onOpenLink: (url: string) => void;
};

export function MessageBubble({ message: m, onOpenLink }: MessageBubbleProps) {
  return (
    <article className={`bubble bubble--${m.role} bubble-enter`}>
      <p className="bubble__role">{roleLabel(m.role)}</p>
      <p className="bubble__body">{m.body}</p>
      {m.attachments?.map((a) =>
        a.kind === "image" ? (
          <img key={a.id} src={a.url} className="bubble__img" alt={a.name} />
        ) : (
          <a
            key={a.id}
            className="bubble__doc"
            href={a.url}
            download={a.name}
          >
            📎 {a.name}
          </a>
        ),
      )}
      {m.externalLinks?.map((url) => (
        <button
          key={url}
          type="button"
          className="bubble__link"
          onClick={() => onOpenLink(url)}
        >
          {url}
        </button>
      ))}
      <time className="bubble__time" dateTime={m.createdAt}>
        {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </time>
    </article>
  );
}
