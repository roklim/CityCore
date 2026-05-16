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
  const nearbyDistances = ["0,3 km", "0,5 km", "0,8 km"];

  return (
    <section className={styles.utilitySection}>
      <div className={styles.sectionHeader}>
        <h2>Vicino a te</h2>
        <Link href="#popular">Vedi tutto</Link>
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
                  {nearbyDistances[index] ?? business.area}
                </span>
                <span className={styles.ratingLine}>
                  <span className={styles.star} aria-hidden="true">
                    *
                  </span>
                  4,8
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
    <section className={styles.utilitySection} id="popular">
      <div className={styles.sectionHeader}>
        <h2>Popolari oggi</h2>
        <Link href="#popular">Vedi tutto</Link>
      </div>

      {businesses.length > 0 ? (
        <div className={styles.popularRow}>
          {businesses.map((business, index) => (
            <Link className={styles.popularCard} href={business.href} key={business.slug}>
              <span
                className={`${styles.businessThumb} ${styles.popularThumb} ${getBusinessToneClass(
                  index + 1,
                )}`}
              >
                <span className={styles.popularBadge}>Top</span>
              </span>
              <span className={styles.popularLabel}>{business.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>Nessuna attivita popolare disponibile per ora.</p>
      )}
    </section>
  );
}
