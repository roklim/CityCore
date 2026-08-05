import { PublicFeedback } from "../../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedback
      live
      title="Caricamento della città"
      body="Stiamo aggiornando la directory pubblica."
    />
  );
}
