import type { HomepageCityCard } from "../../lib/public-runtime";
import { PublicSiteHeader } from "../public-shell";
import { ActiveCityPills } from "./active-city-pills";
import { CityEntryForm } from "./city-entry-form";
import { CityLineArt } from "./city-line-art";
import styles from "./context-gateway.module.css";

export function GlobalEntryHome({
  cities,
  degraded,
}: {
  cities: HomepageCityCard[];
  degraded: boolean;
}) {
  return (
    <main className={styles.contextStage} id="main-content">
      <div className={styles.globalEntry}>
        <div className={styles.entryShell}>
          <section className={styles.entryPanel} aria-labelledby="global-entry-title">
            <PublicSiteHeader changeCityHref="#citycore-city-search" exploreHref="#active-cities" />

            <div className={styles.entryHero}>
              <p className={styles.sectionKicker}>Scopri cosa c'è vicino a te</p>
              <h1 className={styles.entryTitle} id="global-entry-title">
                La tua città, tutto connesso<span className={styles.accent}>.</span>
              </h1>
              <p className={styles.entryBody}>
                Scegli una città per trovare attività, servizi, orari e contatti in un solo posto.
              </p>
            </div>

            <CityEntryForm
              cities={cities.map((city) => ({ slug: city.slug, name: city.name }))}
              searchPlaceholder="Cerca la tua città…"
            />

            {degraded ? (
              <p className={styles.entryStatus} role="status">
                Le informazioni aggiornate non sono raggiungibili in questo momento. I contenuti
                mostrati sono dimostrativi.
              </p>
            ) : null}

            <ActiveCityPills cities={cities} />

            <CityLineArt />
          </section>
        </div>
      </div>
    </main>
  );
}
