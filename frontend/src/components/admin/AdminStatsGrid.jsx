export default function AdminStatsGrid({ items }) {
  return (
    <section className="admin-stats-grid">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}
