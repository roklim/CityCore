import Link from "next/link";
import type { PublicCitySurfaceData } from "../../lib/public-runtime";
import { CityBusinessDirectory } from "./city-business-directory";
import styles from "./context-gateway.module.css";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function CityUtilityHome({ surface }: { surface: PublicCitySurfaceData }) {
  const { city, degraded, live } = surface;
  const activityLabel = city.businessCount === 1 ? "attività pubblicata" : "attività pubblicate";
  const heroTitle = city.publicHeroTitle ?? city.name;
  const heroDescription =
    city.publicHeroDescription ?? "Consulta le attività pubblicate e scegli come contattarle.";

  return (
    <main className={`${styles.contextStage} ${styles.cityHome}`}>
      <div className={styles.cityShell}>
        <aside className={styles.citySidebar}>
          <header className={styles.cityTopbar}>
            <Link className={styles.brand} href="/">
              <span>CityCore</span>
              <span className={styles.accent}>.</span>
            </Link>

            <Link className={styles.operatorLink} href="/admin/login">
              Area operatori
            </Link>
          </header>

          <section className={styles.cityHero} aria-labelledby="city-home-title">
            <p className={styles.currentCity}>
              <span className={styles.pinIcon} aria-hidden="true" />
              <span>{city.name}</span>
            </p>

            <h1 className={styles.cityTitle} id="city-home-title">
              <span>
                {heroTitle}
                <span className={styles.accent}>.</span>
              </span>
            </h1>

            <p className={styles.cityIntro}>{heroDescription}</p>
            {live ? (
              <p className={styles.cityCount}>
                {city.businessCount} {activityLabel}
              </p>
            ) : null}
            <a className={styles.cityHeroCta} href="#directory">
              Esplora le attività <span aria-hidden="true">→</span>
            </a>
          </section>
        </aside>

        <div className={styles.cityMain}>
          <CityBusinessDirectory businesses={city.businesses} degraded={degraded} />
        </div>
      </div>

      <MobileBottomNav citySlug={city.slug} />
    </main>
  );
}
