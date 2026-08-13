import Link from "next/link";

export function AdminCollectionError({
  message,
  retryHref,
}: {
  message: string;
  retryHref: string;
}) {
  return (
    <div className="admin-state-card admin-collection-state is-error" role="alert">
      <div className="admin-collection-state-copy">
        <strong>{message}</strong>
        <p>
          Riprova tra qualche istante. Se il problema continua, controlla di avere aperto
          l&apos;area corretta.
        </p>
      </div>
      <Link className="admin-button ghost-button" href={retryHref}>
        Riprova
      </Link>
    </div>
  );
}

export function AdminEmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="admin-state-card admin-collection-state is-empty">
      <div className="admin-collection-state-copy">
        <strong>{title}</strong>
        {text ? <p>{text}</p> : null}
      </div>
    </div>
  );
}
