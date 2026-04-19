export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}) {
  const primaryAction = actionLabel
    ? actionHref
      ? (
          <a className="ui-empty-primary" href={actionHref}>
            {actionLabel}
          </a>
        )
      : (
          <button className="ui-empty-primary" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )
    : null;

  return (
    <div className="ui-empty-state">
      <svg viewBox="0 0 120 80" aria-hidden="true">
        <rect x="18" y="34" width="84" height="36" rx="8" />
        <path d="M24 34 L38 14 H82 L96 34" />
        <circle cx="48" cy="54" r="5" />
        <circle cx="72" cy="54" r="5" />
      </svg>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {(primaryAction || secondaryLabel) && (
        <div className="ui-empty-actions">
          {primaryAction}
          {secondaryLabel && secondaryHref && (
            <a className="ui-empty-secondary" href={secondaryHref}>
              {secondaryLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
