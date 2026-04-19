export default function MenuSkeleton() {
  return (
    <div className="menu-skeleton" aria-label="Caricamento menu">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="menu-skeleton-card" key={index}>
          <i />
          <span />
          <strong />
          <p />
          <b />
        </article>
      ))}
    </div>
  );
}
