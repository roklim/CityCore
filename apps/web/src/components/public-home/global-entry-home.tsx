import Link from "next/link";
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
  const quickCities = cities.slice(0, 3);

  return (
    <div className={`${styles.contextStage} public-home-stage`}>
      <div className={`${styles.globalEntry} public-home-entry`}>
        <div className={`${styles.entryShell} public-home-shell`}>
          <PublicSiteHeader
            className={`${styles.entryHeader} public-home-header`}
            showChangeCity={false}
            showExplore={false}
          />

          <main
            className={`${styles.entryPanel} public-home-hero`}
            id="main-content"
            tabIndex={-1}
            aria-labelledby="global-entry-title"
          >
            <div className={`${styles.entryPrimary} public-home-primary`}>
              <div className={`${styles.entryHero} public-home-copy`}>
                <p className={`${styles.sectionKicker} public-home-kicker`}>
                  La città, in un unico posto
                </p>
                <h1 className={`${styles.entryTitle} public-home-title`} id="global-entry-title">
                  Trova attività e servizi nella tua città
                  <span className={styles.accent}>.</span>
                </h1>
                <p className={`${styles.entryBody} public-home-body`}>
                  Scegli una città, scopri le attività pubblicate e trova subito orari, servizi e
                  contatti utili.
                </p>
                <ul className="public-home-capabilities" aria-label="Informazioni disponibili">
                  <li>Attività locali</li>
                  <li>Servizi e orari</li>
                  <li>Contatto diretto</li>
                </ul>
              </div>

              {degraded ? (
                <p className={`${styles.degradedState} public-home-degraded`} role="status">
                  I dati aggiornati non sono disponibili. Stai visualizzando contenuti dimostrativi.
                </p>
              ) : null}

              {cities.length ? (
                <>
                  <CityEntryForm
                    cities={cities.map((city) => ({
                      slug: city.slug,
                      name: city.name,
                      qualifier: city.searchQualifier,
                    }))}
                  />
                  <nav className="public-home-quick-cities" aria-label="Città disponibili">
                    <span>Esplora subito</span>
                    <div>
                      {quickCities.map((city) => (
                        <Link href={city.href} key={city.slug}>
                          {city.name}
                          {city.searchQualifier ? <small>{city.searchQualifier}</small> : null}
                        </Link>
                      ))}
                    </div>
                  </nav>
                </>
              ) : (
                <p
                  className={`${styles.emptyState} public-home-empty`}
                  id="citycore-city-search"
                  role="status"
                  tabIndex={-1}
                >
                  Nessuna città è disponibile in questo momento. Torna presto per esplorare le prime
                  directory locali.
                </p>
              )}
            </div>

            <div className="public-home-art" aria-hidden="true">
              <div className="public-home-art-caption">
                <span>CityCore network</span>
                <strong>{cities.length || "—"}</strong>
                <small>
                  {degraded
                    ? "contenuti in anteprima"
                    : cities.length === 1
                      ? "città disponibile"
                      : "città disponibili"}
                </small>
              </div>
              <CityLineArt />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
