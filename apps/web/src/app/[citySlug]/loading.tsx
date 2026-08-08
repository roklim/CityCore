import { PublicFeedback } from "../../components/public-feedback";

export default function Loading() {
  return (
    <main className="feedback-page" id="main-content">
      <PublicFeedback
        live
        title="Caricamento della città"
        body="Stiamo aggiornando la directory pubblica."
      />
    </main>
  );
}
