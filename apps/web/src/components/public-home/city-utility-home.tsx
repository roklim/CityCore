import type { PublicCitySurfaceData } from "../../lib/public-runtime";
import { PublicShell } from "../public-shell";
import { CityBusinessDirectory } from "./city-business-directory";

export function CityUtilityHome({ surface }: { surface: PublicCitySurfaceData }) {
  const { city, degraded, live } = surface;
  const activityLabel = city.businessCount === 1 ? "attività pubblicata" : "attività pubblicate";
  const heroDescription =
    city.publicHeroDescription ?? "Consulta le attività pubblicate e scegli come contattarle.";

  return (
    <PublicShell
      toneLabel="Directory cittadina"
      title={city.name}
      description={heroDescription}
      contextLabel={city.name}
      contextHref={`/${city.slug}`}
      accentNote={live ? `${city.businessCount} ${activityLabel}` : undefined}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: city.name }]}
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
