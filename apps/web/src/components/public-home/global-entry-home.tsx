import Link from "next/link";
import type { HomepageCityCard } from "../../lib/public-runtime";
import { ActiveCityPills } from "./active-city-pills";
import { CityEntryForm } from "./city-entry-form";
import { CityLineArt } from "./city-line-art";
import styles from "./context-gateway.module.css";

export function GlobalEntryHome({ cities }: { cities: HomepageCityCard[] }) {
  const totalBusinesses = cities.reduce((total, city) => total + city.businessCount, 0);

  return (
    <main className={styles.contextStage}>
      <div className={styles.globalEntry}>
        <div className={styles.entryShell}>
          <section className={styles.entryPanel} aria-labelledby="global-entry-title">
            <header className={styles.topbar}>
              <Link className={styles.brand} href="/">
                <span>CityCore</span>
                <span className={styles.accent}>.</span>
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
              locationLabel="Usa la mia posizione"
              searchPlaceholder="Cerca la tua città..."
            />

            <ActiveCityPills cities={cities} />

            <CityLineArt />
          </section>

          <aside className={styles.entryVisualPanel} aria-label="CityCore overview">
            <div className={styles.visualCopy}>
              <Link className={styles.brand} href="/">
                <span>CityCore</span>
                <span className={styles.accent}>.</span>
              </Link>
              <h2>Entra nel contesto giusto.</h2>
              <p>
                Prima scegli la città. Poi CityCore diventa ricerca locale, categorie, attività
                vicine e azioni utili.
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
                  <strong>01</strong>
                  <span>Ingresso chiaro</span>
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
