import { PublicFeedback } from "../../../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedback
      live
      title="Caricamento dell'attività"
      body="Stiamo recuperando le informazioni pubblicate."
    />
  );
}
