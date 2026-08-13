import type { HomepageCityCard } from "../../lib/public-runtime";
import { PublicSiteHeader } from "../public-shell";
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
    <div className={styles.contextStage}>
      <div className={styles.globalEntry}>
        <div className={styles.entryShell}>
          <PublicSiteHeader
            className={styles.entryHeader}
            showChangeCity={false}
            showExplore={false}
          />

          <main
            className={styles.entryPanel}
            id="main-content"
            tabIndex={-1}
            aria-labelledby="global-entry-title"
          >
            <div className={styles.entryPrimary}>
              <div className={styles.entryHero}>
                <p className={styles.sectionKicker}>Attività e servizi locali</p>
                <h1 className={styles.entryTitle} id="global-entry-title">
                  Trova attività e servizi nella tua città
                  <span className={styles.accent}>.</span>
                </h1>
                <p className={styles.entryBody}>
                  Scegli la città e consulta orari, contatti e informazioni aggiornate.
                </p>
              </div>

              {degraded ? (
                <p className={styles.degradedState} role="status">
                  I dati aggiornati non sono disponibili. Stai visualizzando contenuti dimostrativi.
                </p>
              ) : null}

              {cities.length ? (
                <CityEntryForm
                  cities={cities.map((city) => ({
                    slug: city.slug,
                    name: city.name,
                    qualifier: city.searchQualifier,
                  }))}
                />
              ) : (
                <p
                  className={styles.emptyState}
                  id="citycore-city-search"
                  role="status"
                  tabIndex={-1}
                >
                  Nessuna città è disponibile in questo momento. Torna presto per esplorare le prime
                  directory locali.
                </p>
              )}
            </div>

            <CityLineArt />
          </main>
        </div>
      </div>
    </div>
  );
}
