type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;

  return (
    <main className="shell">
      <section className="route-card">
        <p className="eyebrow">City Surface</p>
        <h1>Marketplace citta</h1>
        <p>
          Questa pagina diventera la directory professionale della citta con
          discovery per categoria, ranking, featured business, contenuti e
          filtri per modulo.
        </p>
        <div className="route-meta">
          <code>/{citySlug}</code>
        </div>
      </section>
    </main>
  );
}
