import Link from "next/link";
import type { PublicCityBusinessCard } from "../../lib/public-runtime";
import styles from "./context-gateway.module.css";

function getBusinessToneClass(index: number) {
  switch (index % 5) {
    case 0:
      return styles.toneAmber;
    case 1:
      return styles.toneSteel;
    case 2:
      return styles.toneGraphite;
    case 3:
      return styles.toneRose;
    default:
      return styles.toneOlive;
  }
}

function getCategoryLabel(categoryLabel: string) {
  if (categoryLabel.toLowerCase() === "bed & breakfast") {
    return "Dormire";
  }

  return categoryLabel;
}

export function NearbyBusinessList({ businesses }: { businesses: PublicCityBusinessCard[] }) {
  return (
    <section className={styles.utilitySection}>
      <div className={styles.sectionHeader}>
        <h2>Attività disponibili</h2>
        <Link href="#directory">Vedi tutto</Link>
      </div>

      {businesses.length > 0 ? (
        <div className={styles.nearbyList}>
          {businesses.map((business, index) => (
            <Link className={styles.nearbyCard} href={business.href} key={business.slug}>
              <span
                className={`${styles.businessThumb} ${styles.nearbyThumb} ${getBusinessToneClass(
                  index,
                )}`}
              />

              <span className={styles.businessCopy}>
                <strong>{business.name}</strong>
                <span className={styles.metaLine}>
                  {getCategoryLabel(business.categoryLabel)}
                  <span className={styles.metaDot} aria-hidden="true" />
                  {business.area}
                </span>
              </span>

              <span className={styles.arrow} aria-hidden="true">
                &rsaquo;
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>
          Le prime attivita pubbliche di questa citta compariranno qui appena saranno attive.
        </p>
      )}
    </section>
  );
}

export function PopularBusinessStrip({ businesses }: { businesses: PublicCityBusinessCard[] }) {
  return (
    <section className={styles.utilitySection} id="directory">
      <div className={styles.sectionHeader}>
        <h2>Esplora le attività</h2>
        <Link href="#directory">Vedi tutto</Link>
      </div>

      {businesses.length > 0 ? (
        <div className={styles.popularRow}>
          {businesses.map((business, index) => (
            <Link className={styles.popularCard} href={business.href} key={business.slug}>
              <span
                className={`${styles.businessThumb} ${styles.popularThumb} ${getBusinessToneClass(
                  index + 1,
                )}`}
              />
              <span className={styles.popularLabel}>{business.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>Nessuna attività pubblica disponibile per ora.</p>
      )}
    </section>
  );
}
