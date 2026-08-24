import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "../../components/public-shell";

export const metadata: Metadata = {
  title: "Termini e nota demo",
  description: "Limiti d'uso e natura dimostrativa del prototipo CityCore.",
  alternates: { canonical: "/termini" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <PublicShell
      accentNote="CityCore è un prototipo per tesi, non un servizio commerciale o nazionale in produzione."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Termini e nota demo" }]}
      description="Regole essenziali per usare in modo consapevole le funzioni disponibili nella dimostrazione."
      title="Termini e nota demo"
      toneLabel="Ambiente dimostrativo"
    >
      <div className="public-stack public-legal-content">
        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Natura del progetto</p>
            <h2>Prototipo senza copertura nazionale</h2>
          </div>
          <p>
            Città, attività, immagini, disponibilità e altri contenuti possono essere incompleti,
            dimostrativi o disponibili soltanto per test controllati. Non rappresentano una promessa
            di copertura, continuità o accuratezza del servizio.
          </p>
        </section>

        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Richieste e ordini</p>
            <h2>Nessun acquisto o pagamento online</h2>
          </div>
          <p>
            I moduli servono a simulare l'invio di una richiesta o di un ordine con ritiro. Non
            elaborano pagamenti e, salvo un accordo esplicito nell'ambito di una prova controllata,
            l'invio non costituisce un contratto, una prenotazione garantita o un ordine commerciale
            vincolante.
          </p>
        </section>

        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Uso responsabile</p>
            <h2>Limiti della dimostrazione</h2>
          </div>
          <ul>
            <li>
              non usare il prototipo per emergenze o decisioni che richiedono dati aggiornati;
            </li>
            <li>non inserire dati reali, sensibili o appartenenti a terzi;</li>
            <li>considera immagini, orari, prezzi e disponibilità come elementi di prova;</li>
            <li>collegamenti esterni e servizi di terzi restano fuori dal controllo della demo.</li>
          </ul>
          <p>
            Per capire come sono trattati i dati di prova, leggi la{" "}
            <Link href="/privacy">privacy demo</Link>.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
