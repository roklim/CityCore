"use client";

import Link from "next/link";
import { PublicFeedbackPage } from "../components/public-feedback";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <PublicFeedbackPage>
      <section className="public-feedback" role="alert">
        <p className="section-label">CityCore</p>
        <h1>Qualcosa non ha funzionato.</h1>
        <p>Riprova ora oppure torna alla home per scegliere una città.</p>
        <div className="cta-row">
          <button className="cta-button" onClick={reset} type="button">
            Riprova
          </button>
          <Link className="text-link" href="/">
            Scegli una città
          </Link>
        </div>
      </section>
    </PublicFeedbackPage>
  );
}
