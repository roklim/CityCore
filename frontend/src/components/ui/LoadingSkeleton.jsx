export default function LoadingSkeleton({ variant = "card", count = 3 }) {
  return (
    <div className={`ui-loading-skeleton ${variant}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article key={index}>
          <i />
          <span />
          <strong />
          <p />
        </article>
      ))}
    </div>
  );
}
