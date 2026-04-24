import { AppShell } from "../../components/app-shell";

export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <AppShell
      activeSection="customer_area"
      eyebrow="Customer surface"
      title="Customer account shell"
      description="Questa superficie terra ordini, prenotazioni, soggiorni, preferiti e storico cliente senza mischiarli con gli accessi admin."
      routePath="/account"
      statusLabel="Customer"
      asideText="L'account cliente deve restare pulito: riconoscibile, personale e separato da piattaforma e banco locale."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Profilo</strong>
          <p>Dati account, preferenze, recapiti e prossimi consensi marketing.</p>
        </article>
        <article className="route-card">
          <strong>Storico</strong>
          <p>Ordini, prenotazioni e soggiorni organizzati per citta e attivita.</p>
        </article>
        <article className="route-card">
          <strong>Futuro loyalty</strong>
          <p>Preferiti, wallet locale, promemoria e identita cross-city per il cliente.</p>
        </article>
      </section>
    </AppShell>
  );
}
