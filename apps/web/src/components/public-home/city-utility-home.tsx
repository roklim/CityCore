import Link from "next/link";
import type { PublicCitySurfaceData } from "../../lib/public-runtime";
import { PublicShell } from "../public-shell";
import { CityBusinessDirectory } from "./city-business-directory";

export function CityUtilityHome({ surface }: { surface: PublicCitySurfaceData }) {
  const { city, degraded, live } = surface;
  const activityLabel = city.businessCount === 1 ? "attività pubblicata" : "attività pubblicate";
  const heroDescription =
    city.publicHeroDescription ?? "Consulta le attività pubblicate e scegli come contattarle.";
  const locationLabel = [city.region, city.country].filter(Boolean).join(" · ");
  const initial = city.name.trim().charAt(0).toUpperCase();

  return (
    <PublicShell
      toneLabel={live ? "Guida cittadina CityCore" : "Anteprima directory"}
      title={city.name}
      description={heroDescription}
      contextLabel={city.name}
      contextHref={`/${city.slug}`}
      accentNote={live ? `${city.businessCount} ${activityLabel}` : undefined}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: city.name }]}
      heroClassName="public-city-hero"
      heroActions={
        <nav className="cta-row" aria-label={`Esplora ${city.name}`}>
          <Link className="cta-button" href={`/${city.slug}#directory`}>
            Esplora le attività
          </Link>
          <Link className="text-link" href="/#citycore-city-search">
            Scegli un'altra città
          </Link>
        </nav>
      }
      heroAside={
        <div className="public-city-identity" aria-label={`Directory di ${city.name}`}>
          <div className="public-city-identity-orbit" aria-hidden="true" />
          <span className="public-city-monogram" aria-hidden="true">
            {initial}
          </span>
          <div className="public-city-identity-copy">
            <span>Directory locale</span>
            <strong>{city.name}</strong>
            {locationLabel ? <small>{locationLabel}</small> : null}
          </div>
          <div className="public-city-identity-count">
            <strong>{city.businessCount}</strong>
            <span>{activityLabel}</span>
          </div>
        </div>
      }
    >
      <section className="public-city-continuation" aria-label={`Attività a ${city.name}`}>
        <CityBusinessDirectory
          businesses={city.businesses}
          cityName={city.name}
          degraded={degraded}
        />
      </section>
    </PublicShell>
  );
}
