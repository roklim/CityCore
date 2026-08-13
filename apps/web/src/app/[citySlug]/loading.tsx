import { PublicFeedback, PublicFeedbackPage } from "../../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedbackPage>
      <PublicFeedback
        live
        title="Stiamo aprendo la città"
        body="Carichiamo le attività e le informazioni disponibili."
      />
    </PublicFeedbackPage>
  );
}
