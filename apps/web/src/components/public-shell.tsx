import Link from "next/link";
import type { ReactNode } from "react";

type PublicBreadcrumb = {
  label: string;
  href?: string;
};

type PublicShellProps = {
  toneLabel: string;
  title: string;
  description: string;
  contextLabel?: string;
  contextHref?: string;
  accentNote?: string;
  breadcrumbs?: PublicBreadcrumb[];
  children: ReactNode;
};

type PublicSiteHeaderProps = {
  exploreHref?: string;
  exploreLabel?: string;
  changeCityHref?: string;
  className?: string;
  showExplore?: boolean;
  showChangeCity?: boolean;
};

export function PublicSiteHeader({
  exploreHref = "/#citycore-city-search",
  exploreLabel = "Cerca una città",
  changeCityHref = "/#citycore-city-search",
  className,
  showExplore = true,
  showChangeCity = false,
}: PublicSiteHeaderProps) {
  return (
    <header className={`public-header public-site-header${className ? ` ${className}` : ""}`}>
      <Link className="public-brand" href="/" aria-label="CityCore, torna alla home">
        <span className="public-brand-wordmark">
          CityCore<span aria-hidden="true">.</span>
        </span>
        <span className="public-brand-tagline">La tua città. Tutto connesso.</span>
      </Link>

      <nav className="public-nav" aria-label="Navigazione pubblica">
        {showExplore ? (
          <Link className="public-nav-link" href={exploreHref}>
            {exploreLabel}
          </Link>
        ) : null}
        {showChangeCity ? (
          <Link className="public-nav-link" href={changeCityHref}>
            Cambia città
          </Link>
        ) : null}
        <Link className="public-signin-link" href="/admin/login">
          Area operatori
        </Link>
      </nav>
    </header>
  );
}

export function PublicShell({
  toneLabel,
  title,
  description,
  contextLabel,
  contextHref,
  accentNote,
  breadcrumbs,
  children,
}: PublicShellProps) {
  const showContextLink = Boolean(contextLabel && contextLabel !== title);
  const trail = breadcrumbs?.length
    ? breadcrumbs
    : [
        { label: "Home", href: "/" },
        ...(contextLabel ? [{ label: contextLabel, href: contextHref }] : []),
        { label: title },
      ];
  const exploreHref = contextHref ? `${contextHref}#directory` : "/#citycore-city-search";

  return (
    <div className="public-shell">
      <PublicSiteHeader
        exploreHref={exploreHref}
        exploreLabel={contextHref ? "Esplora attività" : "Cerca una città"}
        showChangeCity={Boolean(contextHref)}
      />

      <main className="public-main" id="main-content" tabIndex={-1}>
        <nav className="public-breadcrumbs" aria-label="Percorso">
          <ol>
            {trail.map((item, index) => {
              const isCurrent = index === trail.length - 1;
              return (
                <li key={`${item.label}-${index}`}>
                  {!isCurrent && item.href ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    <span aria-current={isCurrent ? "page" : undefined}>{item.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="public-hero public-page-intro">
          <div className="public-hero-copy">
            <div className="public-hero-meta">
              <span className="public-kicker">{toneLabel}</span>
              {showContextLink && contextLabel ? (
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
            {accentNote ? <p className="public-context-note">{accentNote}</p> : null}
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}
