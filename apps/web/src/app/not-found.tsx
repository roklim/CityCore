import Link from "next/link";
import { PublicShell } from "../components/public-shell";

export default function NotFound() {
  return (
    <PublicShell
      toneLabel="Pagina non trovata"
      title="Questa pagina non è disponibile"
      description="L'indirizzo potrebbe essere errato, oppure la città o l'attività non è ancora pubblicata."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Pagina non disponibile" }]}
    >
      <nav className="cta-row" aria-label="Come continuare">
        <Link className="cta-button" href="/">
          Torna alla home
        </Link>
      </nav>
    </PublicShell>
  );
}
