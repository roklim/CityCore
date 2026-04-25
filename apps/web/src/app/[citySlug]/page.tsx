import { AppShell } from "../../components/app-shell";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;

  return (
    <AppShell
      activeSection="city_marketplace"
      eyebrow="City surface"
      title="Marketplace citta"
      description="Questa route diventera la directory city-first con ranking, filtri per modulo, categorie, contenuti editoriali e ricerca locale."
      routePath={`/${citySlug}`}
      statusLabel="City-first"
      asideText="La home citta deve essere la vera porta d'ingresso pubblica: non una landing vuota, ma il marketplace operativo della zona."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Discovery</strong>
          <p>
            Categorie, query locali, featured business e percorsi rapidi per ogni verticale attivo.
          </p>
        </article>
        <article className="route-card">
          <strong>Coverage</strong>
          <p>Zone servite, disponibilita moduli e futuri contenuti editoriali della citta.</p>
        </article>
        <article className="route-card">
          <strong>Operational SEO</strong>
          <p>Metadata dinamici, canonical, sitemap e blocchi indicizzabili per la citta.</p>
        </article>
      </section>
    </AppShell>
  );
}
