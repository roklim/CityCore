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
  brandContext?: string;
  statusLabel?: string;
  asideTitle?: string;
  asideText?: string;
  asideContent?: ReactNode;
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
  brandContext = "Area operatori",
  statusLabel = "Area operatori",
  asideTitle = "Contesto",
  asideText = "Questa area mantiene allineati ruoli, superfici e moduli della piattaforma.",
  asideContent,
  headerActions,
  children,
}: AdminShellProps) {
  const currentNavigationItem = navigationItems.find((item) => item.current);
  const renderNavigation = (label: string) => (
    <nav className="shell-nav" aria-label={label}>
      {navigationItems.map((item) => (
        <Link
          aria-current={item.current ? "page" : undefined}
          className={`${item.current ? "shell-nav-link active" : "shell-nav-link"}${item.dividerBefore ? " has-divider" : ""}`}
          href={item.href}
          key={`${item.href}-${item.label}`}
        >
          <strong className="shell-nav-label">{item.label}</strong>
          <span className="shell-nav-meta">{item.meta}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="operator-brand" href={brandHref} aria-label="CityCore, area operatori">
          <span className="operator-brand-wordmark">
            CityCore
            <span className="operator-brand-accent" aria-hidden="true">
              .
            </span>
          </span>
          <span className="operator-brand-context">{brandContext}</span>
        </Link>

        <div className="topbar-meta">
          <span className="meta-chip operator-role-chip">
            <span className="operator-role-label">Ruolo</span>
            <strong>{statusLabel}</strong>
          </span>
          {headerActions ? <div className="operator-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <details className="shell-mobile-navigation">
        <summary>
          <span>
            <span className="shell-mobile-navigation-label">Navigazione</span>
            <strong className="shell-mobile-navigation-current">
              {currentNavigationItem?.label ?? "Area operatori"}
            </strong>
          </span>
          <span className="shell-mobile-navigation-icon" aria-hidden="true">
            +
          </span>
        </summary>
        {renderNavigation("Sezioni area operatori su dispositivo mobile")}
      </details>

      <div className="shell-layout">
        <aside className="shell-rail" aria-label="Navigazione area operatori">
          <section className="rail-block shell-navigation-panel">
            <p className="rail-label">Navigazione</p>
            {renderNavigation("Sezioni area operatori")}
          </section>

          <section className="rail-block shell-context-panel">
            <p className="rail-label">{asideTitle}</p>
            {asideContent ?? <p className="rail-copy">{asideText}</p>}
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
                      <span aria-current="page">{item.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <header className="hero-panel admin-page-header" aria-labelledby="admin-page-title">
            <div className="hero-copy">
              <p className="eyebrow">{eyebrow}</p>
              <h1 id="admin-page-title">{title}</h1>
              <p>{description}</p>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
