import { AppShell } from "../../../../components/app-shell";

type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
};

export default async function BusinessAdminPage({ params }: BusinessAdminPageProps) {
  const { citySlug, businessSlug } = await params;

  return (
    <AppShell
      activeSection="local_admin"
      eyebrow="Local admin surface"
      title="Business operations shell"
      description="Questa route diventera il banco locale V2 per local admin e staff, con ordini, disponibilita, prenotazioni e operativita modulo per modulo."
      routePath={`/${citySlug}/${businessSlug}/admin`}
      statusLabel="Operations"
      asideText="Il banco locale deve restare operativo e compatto: niente funzioni piattaforma, solo strumenti per far lavorare davvero il business."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Operational dashboard</strong>
          <p>Oggi, code, disponibilita e stato rapido del modulo attivo del locale.</p>
        </article>
        <article className="route-card">
          <strong>Module operations</strong>
          <p>Menu e ordini, servizi e appuntamenti, camere o richieste di trasporto.</p>
        </article>
        <article className="route-card">
          <strong>Staff scope</strong>
          <p>
            Permessi ridotti, workflow pratici e zero contaminazione con la console piattaforma.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
