import Link from "next/link";
import type { ReactNode } from "react";

type PublicShellProps = {
  toneLabel: string;
  title: string;
  description: string;
  contextLabel?: string;
  contextHref?: string;
  accentNote?: string;
  children: ReactNode;
};

export function PublicShell({
  toneLabel,
  title,
  description,
  contextLabel,
  contextHref,
  accentNote = "Scopri attività locali, confronta opzioni e passa all'azione senza perdere tempo in percorsi generici.",
  children,
}: PublicShellProps) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="public-brand" href="/" aria-label="CityCore, torna alla home">
          <span className="public-brand-wordmark">
            CityCore<span aria-hidden="true">.</span>
          </span>
          <span className="public-brand-tagline">La tua città. Tutto connesso.</span>
        </Link>

        <nav className="public-nav" aria-label="Navigazione pubblica">
          <Link className="public-nav-link" href="/">
            Scegli una città
          </Link>
          <Link className="public-signin-link" href="/admin/login">
            Area operatori
          </Link>
        </nav>
      </header>

      <main className="public-main" id="main-content">
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="public-hero-meta">
              <span className="public-kicker">{toneLabel}</span>
              {contextLabel ? (
                contextHref ? (
                  <Link className="public-meta-chip public-meta-link" href={contextHref}>
                    {contextLabel}
                  </Link>
                ) : (
                  <span className="public-meta-chip">{contextLabel}</span>
                )
              ) : null}
            </div>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <aside className="public-hero-aside">
            <p className="public-aside-label">Perché qui</p>
            <p>{accentNote}</p>
          </aside>
        </section>

        {children}
      </main>
    </div>
  );
}
