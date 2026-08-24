import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "../../components/public-shell";

export const metadata: Metadata = {
  title: "Privacy demo",
  description: "Nota informativa provvisoria sul trattamento dei dati nell'ambiente demo CityCore.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <PublicShell
      accentNote="Documento provvisorio per una dimostrazione accademica: non sostituisce un'informativa privacy validata."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy demo" }]}
      description="Cosa può accadere ai dati inseriti durante una prova controllata di CityCore."
      title="Privacy nell'ambiente demo"
      toneLabel="Nota informativa provvisoria"
    >
      <div className="public-stack public-legal-content">
        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Ambito</p>
            <h2>Solo dati di prova</h2>
          </div>
          <p>
            CityCore è un prototipo per tesi e non è presentato come servizio nazionale in
            produzione. Non inserire dati personali reali, sensibili o riferiti a terzi nei moduli
            di richiesta e ordine.
          </p>
        </section>

        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Dati coinvolti</p>
            <h2>Informazioni inviate volontariamente</h2>
          </div>
          <p>Durante una prova i moduli possono trasmettere:</p>
          <ul>
            <li>nome, email e telefono facoltativo;</li>
            <li>messaggio, note e scelte relative a una richiesta o a un ritiro;</li>
            <li>un indicatore che registra l'accettazione della nota demo.</li>
          </ul>
          <p>
            Queste informazioni servono esclusivamente a verificare il flusso tecnico della demo e
            non devono essere riutilizzate per marketing o profilazione.
          </p>
        </section>

        <section className="public-business-section">
          <div className="section-header">
            <p className="section-label">Prima di un uso reale</p>
            <h2>Informazioni ancora da completare</h2>
          </div>
          <p>
            Prima di qualsiasi apertura al pubblico dovranno essere definiti e validati almeno il
            titolare del trattamento, i contatti privacy, le finalità e basi giuridiche, i tempi di
            conservazione, i destinatari, le misure di sicurezza e le modalità per esercitare i
            diritti. Questa pagina non dichiara conformità normativa.
          </p>
          <p>
            Consulta anche i <Link href="/termini">termini e la nota demo</Link>.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
