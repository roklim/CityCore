type BusinessPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { citySlug, businessSlug } = await params;

  return (
    <main className="shell">
      <section className="route-card">
        <p className="eyebrow">Business Surface</p>
        <h1>Public business page</h1>
        <p>
          Questa route ospitera la pagina pubblica template-driven del business:
          hero, CTA, moduli attivi, sezioni AI-assisted, asset e contenuti SEO.
        </p>
        <div className="route-meta">
          <code>/{citySlug}/{businessSlug}</code>
        </div>
      </section>
    </main>
  );
}
