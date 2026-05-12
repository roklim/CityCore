import Link from "next/link";
import type { ReactNode } from "react";

type PublicShellProps = {
  toneLabel: string;
  title: string;
  description: string;
  citySlug?: string;
  businessName?: string;
  accentNote?: string;
  children: ReactNode;
};

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/cagli", label: "Cagli" },
  { href: "/rimini", label: "Rimini" },
  { href: "/bologna", label: "Bologna" },
  { href: "/admin/login", label: "Area partner" },
] as const;

export function PublicShell({
  toneLabel,
  title,
  description,
  citySlug,
  businessName,
  accentNote = "Scopri attivita locali, confronta opzioni e passa all'azione senza perdere tempo in percorsi generici.",
  children,
}: PublicShellProps) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="public-brand" href="/">
          <div className="public-brand-mark" aria-hidden="true">
            LC
          </div>
          <div className="public-brand-copy">
            <span>Piattaforma locale beta</span>
            <strong>Attivita di citta, strumenti semplici, percorsi chiari.</strong>
          </div>
        </Link>

        <nav className="public-nav" aria-label="Public routes">
          {quickLinks.map((item) => (
            <Link className="public-nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="public-hero-meta">
              <span className="public-kicker">{toneLabel}</span>
              {citySlug ? <span className="public-meta-chip">{citySlug}</span> : null}
              {businessName ? <span className="public-meta-chip">{businessName}</span> : null}
            </div>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <aside className="public-hero-aside">
            <p className="public-aside-label">Perche qui</p>
            <p>{accentNote}</p>
          </aside>
        </section>

        {children}
      </main>
    </div>
  );
}
