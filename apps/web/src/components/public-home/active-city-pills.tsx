import Link from "next/link";
import type { HomepageCityCard } from "../../lib/public-runtime";
import styles from "./context-gateway.module.css";

export function ActiveCityPills({ cities }: { cities: HomepageCityCard[] }) {
  return (
    <section className={styles.activeCities} id="active-cities">
      <p className={styles.sectionKicker}>Citta attive</p>
      <div className={styles.cityPills}>
        {cities.map((city) => (
          <Link className={styles.cityPill} href={city.href} key={city.slug}>
            {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
