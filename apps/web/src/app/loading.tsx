import { PublicFeedback } from "../components/public-feedback";

export default function Loading() {
  return (
    <PublicFeedback
      live
      title="Caricamento in corso"
      body="Stiamo preparando la superficie pubblica."
    />
  );
}
