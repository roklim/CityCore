type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export default async function BusinessAdminPage({
  params,
}: BusinessAdminPageProps) {
  const { citySlug, businessSlug } = await params;

  return (
    <main className="shell">
      <section className="route-card">
        <p className="eyebrow">Local Admin Surface</p>
        <h1>Business operations shell</h1>
        <p>
          Questa route diventera il banco locale V2 per local admin e staff,
          con menu, ordini, prenotazioni, disponibilita e operativita modulo
          per modulo.
        </p>
        <div className="route-meta">
          <code>/{citySlug}/{businessSlug}/admin</code>
        </div>
      </section>
    </main>
  );
}
