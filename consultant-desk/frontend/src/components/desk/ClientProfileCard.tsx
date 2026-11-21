import type { ClientProfile } from "../../lib/chat-client";
import { clientInitials } from "../../lib/desk-format";

type ClientProfileCardProps = {
  profile: ClientProfile | null;
  fallbackLabel: string;
};

export function ClientProfileCard({
  profile,
  fallbackLabel,
}: ClientProfileCardProps) {
  const name = profile?.name || fallbackLabel;
  const place = [profile?.city, profile?.state].filter(Boolean).join(" · ");
  const ageLabel =
    profile?.age != null ? `${profile.age} anos` : "Idade não informada";

  return (
    <aside className="client-profile" aria-label="Perfil da cliente">
      <div className="client-profile__row">
        <span className="conv-avatar conv-avatar--lg" aria-hidden>
          {profile?.avatarUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={profile.avatarUrl} className="conv-avatar__img" />
          ) : (
            clientInitials(name)
          )}
        </span>
        <div className="client-profile__text">
          <p className="client-profile__name">{name}</p>
          <p className="client-profile__meta">
            {ageLabel}
            {place ? ` · ${place}` : ""}
          </p>
          {profile?.email ? (
            <p className="client-profile__email">{profile.email}</p>
          ) : (
            <p className="client-profile__email">
              Conta ainda não vinculada à análise
            </p>
          )}
        </div>
      </div>
      {profile?.about ? (
        <p className="client-profile__about">
          <span className="client-profile__about-label">Sobre / busca</span>
          {profile.about}
        </p>
      ) : (
        <p className="client-profile__about client-profile__about--empty">
          Sem bio ainda — a cliente pode completar em Meu perfil no app.
        </p>
      )}
    </aside>
  );
}
