import { PublicFeedback } from "../components/public-feedback";
import { PublicShell } from "../components/public-shell";

export default function NotFound() {
  return (
    <PublicShell
      toneLabel="Pagina non trovata"
      title="Qui non c'è una pagina CityCore."
      description="La città o l'attività richiesta non è disponibile pubblicamente, oppure l'indirizzo non è corretto."
    >
      <PublicFeedback
        headingLevel={2}
        title="Controlla l'indirizzo o scegli una città"
        body="Le schede pubbliche sono disponibili solo per città e attività attive."
        action={{ href: "/", label: "Torna alla home" }}
      />
    </PublicShell>
  );
}
