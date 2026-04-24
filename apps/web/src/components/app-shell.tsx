import Link from "next/link";
import type { ReactNode } from "react";
import {
  platformShellNavigation,
  type ShellSectionId,
} from "@platform/ui";

type AppShellProps = {
  activeSection: ShellSectionId;
  eyebrow: string;
  title: string;
  description: string;
  routePath: string;
  statusLabel?: string;
  asideTitle?: string;
  asideText?: string;
  children: ReactNode;
};

function getNavClassName(
  sectionId: ShellSectionId,
  activeSection: ShellSectionId,
) {
  return sectionId === activeSection ? "shell-nav-link active" : "shell-nav-link";
}

export function AppShell({
  activeSection,
  eyebrow,
  title,
  description,
  routePath,
  statusLabel = "Foundation",
  asideTitle = "Milestone corrente",
  asideText = "Stiamo trasformando il cantiere V2 in una base operativa stabile, leggibile e pronta a crescere.",
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-brand">
          <div className="brand-mark" aria-hidden="true">
            V2
          </div>
          <div>
            <p className="eyebrow">Platform V2</p>
            <strong>City-first platform foundation</strong>
          </div>
        </div>

        <div className="topbar-meta">
          <span className="meta-chip">{statusLabel}</span>
          <code className="route-pill">{routePath}</code>
        </div>
      </header>

      <div className="shell-layout">
        <aside className="shell-rail" aria-label="Platform surfaces">
          <section className="rail-block">
            <p className="rail-label">Surfaces</p>
            <nav className="shell-nav">
              {platformShellNavigation.map((item) => (
                <Link
                  className={getNavClassName(item.id, activeSection)}
                  href={item.href}
                  key={item.id}
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

        <main className="shell-main">
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
