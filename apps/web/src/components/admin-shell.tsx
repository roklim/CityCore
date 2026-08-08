import Link from "next/link";
import type { ReactNode } from "react";

export type OperatorNavigationItem = {
  href: string;
  label: string;
  meta: string;
  current?: boolean;
};

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  routePath: string;
  navigationItems: readonly OperatorNavigationItem[];
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
  routePath,
  navigationItems,
  statusLabel = "Area operatori",
  asideTitle = "Contesto",
  asideText = "Questa area mantiene allineati ruoli, superfici e moduli della piattaforma.",
  headerActions,
  children,
}: AdminShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="operator-brand" href="/" aria-label="CityCore, torna alla home">
          <span className="operator-brand-wordmark">
            CityCore<span aria-hidden="true">.</span>
          </span>
          <span className="operator-brand-context">Area operatori</span>
        </Link>

        <div className="topbar-meta">
          <span className="meta-chip">{statusLabel}</span>
          <code className="route-pill">{routePath}</code>
          {headerActions ? <div className="operator-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <div className="shell-layout">
        <aside className="shell-rail" aria-label="Navigazione area operatori">
          <section className="rail-block">
            <p className="rail-label">Navigazione</p>
            <nav className="shell-nav">
              {navigationItems.map((item) => (
                <Link
                  aria-current={item.current ? "page" : undefined}
                  className={item.current ? "shell-nav-link active" : "shell-nav-link"}
                  href={item.href}
                  key={`${item.href}-${item.label}`}
                >
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </Link>
              ))}
            </nav>
          </section>

          <section className="rail-block">
            <p className="rail-label">{asideTitle}</p>
            <p className="rail-copy">{asideText}</p>
          </section>
        </aside>

        <main className="shell-main" id="main-content">
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
