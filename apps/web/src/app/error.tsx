"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="feedback-page" id="main-content">
      <section className="public-feedback" role="alert">
        <p className="section-label">CityCore</p>
        <h1>Non è stato possibile aprire questa pagina.</h1>
        <p>Riprova oppure torna alla home per scegliere un altro percorso.</p>
        <div className="cta-row">
          <button className="cta-button" onClick={reset} type="button">
            Riprova
          </button>
          <Link className="text-link" href="/">
            Torna alla home
          </Link>
        </div>
      </section>
    </main>
  );
}
