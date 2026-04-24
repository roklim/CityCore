import { AppShell } from "../../components/app-shell";

export const metadata = {
  title: "Global Admin",
};

export default function AdminPage() {
  return (
    <AppShell
      activeSection="global_admin"
      eyebrow="Platform surface"
      title="Global Admin shell"
      description="Qui cresce la console piattaforma V2: dashboard globale, citta, business, utenti, audit, impostazioni e orchestrazione onboarding."
      routePath="/admin"
      statusLabel="Governance"
      asideText="Questa area non deve sembrare una directory pubblica mascherata: deve parlare il linguaggio di governance, operations e controllo."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Dashboard</strong>
          <p>Metriche piattaforma, attivazioni citta, business live e segnali di errore.</p>
        </article>
        <article className="route-card">
          <strong>Citta e registry</strong>
          <p>Attivazione mercati, stati citta e coverage del registro nazionale.</p>
        </article>
        <article className="route-card">
          <strong>Business e utenti</strong>
          <p>Provisioning tenant, ruoli scoped, owner, staff, asset e audit log.</p>
        </article>
      </section>
    </AppShell>
  );
}
