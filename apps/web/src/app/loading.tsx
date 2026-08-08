import { PublicFeedback } from "../components/public-feedback";

export default function Loading() {
  return (
    <main className="feedback-page" id="main-content">
      <PublicFeedback
        live
        title="Caricamento in corso"
        body="Stiamo preparando la superficie pubblica."
      />
    </main>
  );
}
