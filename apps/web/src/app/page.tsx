import Link from "next/link";
import { MODULE_DEFINITIONS, BUSINESS_TEMPLATE_DEFINITIONS } from "@platform/templates";
import { platformShellNavigation } from "@platform/ui";
import { AppShell } from "../components/app-shell";

const foundationTracks = [
  {
    title: "Core platform",
    description:
      "Monorepo, Next.js web, Fastify API, worker dedicato e package condivisi gia allineati.",
  },
  {
    title: "Data layer",
    description:
      "Prisma foundation con utenti, access grants, citta, business, template, moduli e audit.",
  },
  {
    title: "Local bootstrap",
    description:
      "Compose locale, env strategy, package scripts e una base pronta a collegare Postgres e Redis.",
  },
];

const readinessChecks = [
  {
    title: "Health e boot signals",
    description:
      "Web, API e worker parlano la stessa lingua operativa per essere monitorati meglio fin da subito.",
  },
  {
    title: "Shell V2",
    description:
      "La UI adesso espone superfici chiare e leggibili, non solo pagine placeholder scollegate.",
  },
  {
    title: "Legacy protetta",
    description:
      "La V2 cresce accanto alla codebase attuale senza toccare il percorso di produzione esistente.",
  },
];

const highlightedModules = MODULE_DEFINITIONS.slice(0, 4);
const highlightedTemplates = BUSINESS_TEMPLATE_DEFINITIONS.slice(0, 6);

export default function HomePage() {
  return (
    <AppShell
      activeSection="foundation"
      eyebrow="Foundation"
      title="Nuovo platform layer con basi gia professionali."
      description="Questo cantiere apre la V2 con Next.js App Router, shell distinte per piattaforma, citta, business e account, e una struttura che puo reggere ordering, appointments, stays e mobility request."
      routePath="/"
      statusLabel="Milestone 1"
      asideTitle="Focus attuale"
      asideText="Stiamo chiudendo la foundation: health, shell UI, local infra e bootstrap dati prima di entrare nel platform core vero."
    >
      <section className="section-header">
        <p className="section-label">Foundation tracks</p>
        <h2>Dove stiamo rendendo il cantiere davvero usabile</h2>
        <p>
          Ogni blocco qui sotto deve essere credibile gia da adesso, cosi il passaggio alla platform
          core milestone non parte su fondamenta fragili.
        </p>
      </section>

      <section className="section-grid">
        {foundationTracks.map((track) => (
          <article className="insight-card" key={track.title}>
            <strong>{track.title}</strong>
            <p>{track.description}</p>
          </article>
        ))}
      </section>

      <section className="section-header">
        <p className="section-label">Surface map</p>
        <h2>Le superfici principali sono gia leggibili</h2>
        <p>
          La shell V2 deve chiarire subito la separazione tra governance piattaforma, discovery
          city-first, pagina business e banco locale.
        </p>
      </section>

      <section className="surface-grid">
        {platformShellNavigation.map((surface) => (
          <Link className="surface-card" href={surface.href} key={surface.id}>
            <strong>{surface.label}</strong>
            <p>{surface.meta}</p>
            <code>{surface.href}</code>
          </Link>
        ))}
      </section>

      <section className="section-header">
        <p className="section-label">Readiness</p>
        <h2>Segnali che stiamo passando da scaffold a piattaforma</h2>
      </section>

      <section className="section-grid">
        {readinessChecks.map((check) => (
          <article className="insight-card" key={check.title}>
            <strong>{check.title}</strong>
            <p>{check.description}</p>
          </article>
        ))}
      </section>

      <section className="section-header">
        <p className="section-label">Shared packages</p>
        <h2>Moduli e template ora vengono dai package condivisi</h2>
        <p>
          La foundation inizia a parlare con tipi e registri comuni, cosi web, API e onboarding non
          duplicano lo stesso vocabolario di dominio.
        </p>
      </section>

      <section className="surface-grid">
        {highlightedModules.map((module) => (
          <article className="surface-card" key={module.code}>
            <strong>{module.label}</strong>
            <p>{module.summary}</p>
            <code>{module.code}</code>
          </article>
        ))}
      </section>

      <section className="section-grid">
        {highlightedTemplates.map((template) => (
          <article className="insight-card" key={template.code}>
            <strong>{template.label}</strong>
            <p>{template.summary}</p>
            <div className="pill-row">
              <span className="pill">{template.category}</span>
              <span className="pill">{template.primaryModule}</span>
              <span className="pill">{template.defaultCtaLabel}</span>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
