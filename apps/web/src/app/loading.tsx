import { PublicFeedback, PublicFeedbackPage } from "../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedbackPage>
      <PublicFeedback
        live
        title="Stiamo preparando la pagina"
        body="Attendi un momento mentre carichiamo le informazioni."
      />
    </PublicFeedbackPage>
  );
}
