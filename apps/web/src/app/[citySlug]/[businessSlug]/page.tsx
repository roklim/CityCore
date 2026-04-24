import { AppShell } from "../../../components/app-shell";

type BusinessPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { citySlug, businessSlug } = await params;

  return (
    <AppShell
      activeSection="business_page"
      eyebrow="Business surface"
      title="Public business page"
      description="Qui vivra la pagina pubblica template-driven del business: hero, CTA, moduli attivi, sezioni AI-assisted, asset, trust block e contenuti SEO."
      routePath={`/${citySlug}/${businessSlug}`}
      statusLabel="Template-driven"
      asideText="Ogni attivita deve nascere da un template credibile, non da una pagina generica che poi viene rattoppata a mano."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Identity layer</strong>
          <p>Hero, titolo pubblico, contatti, asset e tono del business coerente col template.</p>
        </article>
        <article className="route-card">
          <strong>Active module</strong>
          <p>Ordering, appointments, stays o mobility request come CTA centrale della pagina.</p>
        </article>
        <article className="route-card">
          <strong>Search and trust</strong>
          <p>SEO, FAQ, policy, badge operativi e contenuti generati dall'onboarding AI.</p>
        </article>
      </section>
    </AppShell>
  );
}
