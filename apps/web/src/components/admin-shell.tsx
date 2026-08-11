import Link from "next/link";
import type { ReactNode } from "react";

export type OperatorNavigationItem = {
  href: string;
  label: string;
  meta: string;
  current?: boolean;
  dividerBefore?: boolean;
};

export type AdminBreadcrumb = { href?: string; label: string };

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  navigationItems: readonly OperatorNavigationItem[];
  breadcrumbs?: readonly AdminBreadcrumb[];
  brandHref?: string;
  statusLabel?: string;
  asideTitle?: string;
  asideText?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({
  eyebrow,
  title,
  description,
  navigationItems,
  breadcrumbs = [],
  brandHref = "/",
  statusLabel = "Area operatori",
  asideTitle = "Contesto",
  asideText = "Questa area mantiene allineati ruoli, superfici e moduli della piattaforma.",
  headerActions,
  children,
}: AdminShellProps) {
  const renderNavigation = () => (
    <nav className="shell-nav" aria-label="Sezioni area operatori">
      {navigationItems.map((item) => (
        <Link
          aria-current={item.current ? "page" : undefined}
          className={`${item.current ? "shell-nav-link active" : "shell-nav-link"}${item.dividerBefore ? " has-divider" : ""}`}
          href={item.href}
          key={`${item.href}-${item.label}`}
        >
          <strong>{item.label}</strong>
          <span>{item.meta}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="operator-brand" href={brandHref} aria-label="CityCore, area operatori">
          <span className="operator-brand-wordmark">
            CityCore<span aria-hidden="true">.</span>
          </span>
          <span className="operator-brand-context">Area operatori</span>
        </Link>

        <div className="topbar-meta">
          <span className="meta-chip">{statusLabel}</span>
          {headerActions ? <div className="operator-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <details className="shell-mobile-navigation">
        <summary>Menu area operatori</summary>
        {renderNavigation()}
      </details>

      <div className="shell-layout">
        <aside className="shell-rail" aria-label="Navigazione area operatori">
          <section className="rail-block">
            <p className="rail-label">Navigazione</p>
            {renderNavigation()}
          </section>

          <section className="rail-block">
            <p className="rail-label">{asideTitle}</p>
            <p className="rail-copy">{asideText}</p>
          </section>
        </aside>

        <main className="shell-main" id="main-content">
          {breadcrumbs.length ? (
            <nav className="admin-breadcrumbs" aria-label="Percorso pagina">
              <ol>
                {breadcrumbs.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.href ? (
                      <Link href={item.href}>{item.label}</Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </section>

          {children}
        </main>
      </div>
    </div>
  );
}
