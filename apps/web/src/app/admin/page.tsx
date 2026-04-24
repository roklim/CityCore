export const metadata = {
  title: "Global Admin",
};

export default function AdminPage() {
  return (
    <main className="shell">
      <section className="route-card">
        <p className="eyebrow">Platform Surface</p>
        <h1>Global Admin shell</h1>
        <p>
          Questa route ospitera la console piattaforma V2: dashboard globale,
          citta, business, utenti, audit, impostazioni, AI onboarding e
          governance dei moduli.
        </p>
        <div className="route-meta">
          <code>/admin</code>
        </div>
      </section>
    </main>
  );
}
