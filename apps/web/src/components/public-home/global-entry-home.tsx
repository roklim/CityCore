import Link from "next/link";
import type { HomepageCityCard } from "../../lib/public-runtime";
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
  const totalBusinesses = cities.reduce((total, city) => total + city.businessCount, 0);

  return (
    <main className={styles.contextStage} id="main-content">
      <div className={styles.globalEntry}>
        <div className={styles.entryShell}>
          <section className={styles.entryPanel} aria-labelledby="global-entry-title">
            <header className={styles.topbar}>
              <Link className={styles.brand} href="/" aria-label="CityCore, home">
                <span>CityCore</span>
                <span className={styles.accent}>.</span>
              </Link>
              <Link className={styles.operatorLink} href="/admin/login">
                Area operatori
              </Link>
            </header>

            <div className={styles.entryHero}>
              <h1 className={styles.entryTitle} id="global-entry-title">
                <span>Trova la</span>
                <span>
                  tua città<span className={styles.accent}>.</span>
                </span>
              </h1>
              <p className={styles.entryBody}>
                <span>Esplora attività, servizi e luoghi</span>
                <span>nella tua città.</span>
              </p>
            </div>

            <CityEntryForm
              cities={cities.map((city) => ({ slug: city.slug, name: city.name }))}
              searchPlaceholder="Cerca la tua città…"
            />

            {degraded ? (
              <p className={styles.entryStatus} role="status">
                I dati live non sono disponibili: stai visualizzando contenuti dimostrativi.
              </p>
            ) : null}

            <ActiveCityPills cities={cities} />

            <CityLineArt />
          </section>

          <aside className={styles.entryVisualPanel} aria-label="Panoramica CityCore">
            <div className={styles.visualCopy}>
              <Link className={styles.brand} href="/" aria-label="CityCore, home">
                <span>CityCore</span>
                <span className={styles.accent}>.</span>
              </Link>
              <h2>Entra nel contesto giusto.</h2>
              <p>
                Prima scegli la città. Poi CityCore diventa ricerca locale, categorie, attività
                pubblicate e azioni utili.
              </p>
            </div>

            <div className={styles.visualFrame}>
              <div className={styles.visualStats}>
                <div className={styles.visualStat}>
                  <strong>{cities.length.toString().padStart(2, "0")}</strong>
                  <span>Città attive</span>
                </div>
                <div className={styles.visualStat}>
                  <strong>{totalBusinesses.toString().padStart(2, "0")}</strong>
                  <span>Attività pubbliche</span>
                </div>
                <div className={styles.visualStat}>
                  <strong aria-hidden="true">↗</strong>
                  <span>Scegli e continua</span>
                </div>
              </div>
              <CityLineArt />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
