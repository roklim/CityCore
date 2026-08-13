import Link from "next/link";
import type { HomepageCityCard } from "../../lib/public-runtime";
import styles from "./context-gateway.module.css";

export function ActiveCityPills({ cities }: { cities: HomepageCityCard[] }) {
  if (!cities.length) {
    return (
      <section
        className={styles.activeCities}
        id="active-cities"
        aria-labelledby="active-cities-title"
      >
        <p className={styles.sectionKicker} id="active-cities-title">
          Scegli una città
        </p>
        <p className={styles.emptyState} role="status">
          Nessuna città è ancora disponibile pubblicamente. Torna presto per vedere le prime
          directory locali.
        </p>
      </section>
    );
  }

  return (
    <nav className={styles.activeCities} id="active-cities" aria-label="Scegli una città">
      <p className={styles.sectionKicker}>Città disponibili</p>
      <div className={styles.cityPills}>
        {cities.map((city) => (
          <Link className={styles.cityPill} href={city.href} key={city.slug}>
            {city.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
