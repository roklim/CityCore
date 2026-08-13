import { PublicFeedback, PublicFeedbackPage } from "../../../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedbackPage>
      <PublicFeedback
        live
        title="Stiamo aprendo l'attività"
        body="Carichiamo servizi, orari e contatti."
      />
    </PublicFeedbackPage>
  );
}
