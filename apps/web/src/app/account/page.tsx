import { PublicShell } from "../../components/public-shell";

export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <PublicShell
      toneLabel="Area cliente"
      title="Un account personale pulito, separato da piattaforma e banco operativo."
      description="Richieste, ordini, preferiti e storico cliente devono restare comprensibili anche da telefono, senza ereditare il tono della console admin."
      accentNote="L'utente finale non deve mai sentirsi dentro un pannello di controllo travestito."
    >
      <section className="route-grid">
        <article className="route-card">
          <strong>Profilo</strong>
          <p>Dati account, preferenze, recapiti e prossimi consensi marketing.</p>
        </article>
        <article className="route-card">
          <strong>Storico</strong>
          <p>Ordini, richieste, prenotazioni e soggiorni organizzati per citta e attivita.</p>
        </article>
        <article className="route-card">
          <strong>Futuro loyalty</strong>
          <p>Preferiti, wallet locale, promemoria e identita cross-city per il cliente.</p>
        </article>
      </section>
    </PublicShell>
  );
}
