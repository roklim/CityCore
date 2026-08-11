import Link from "next/link";

export function AdminCollectionError({
  message,
  retryHref,
}: {
  message: string;
  retryHref: string;
}) {
  return (
    <div className="admin-state-card is-error" role="alert">
      <strong>{message}</strong>
      <p>Riprova tra qualche istante. Se il problema continua, verifica lo scope attivo.</p>
      <Link className="ghost-button" href={retryHref}>
        Riprova
      </Link>
    </div>
  );
}

export function AdminEmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="admin-state-card">
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
    </div>
  );
}
