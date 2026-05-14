import Link from "next/link";
import type { CityPortal, HomepageViewModel } from "./home-content";
import { CityArtwork } from "./visuals";
import styles from "./public-home.module.css";

export function CityPortalGrid({
  portals,
  copy,
}: {
  portals: CityPortal[];
  copy: HomepageViewModel["citySection"];
}) {
  return (
    <section className={styles.sectionBlock} id="cities">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{copy.title}</h2>
          <p className={styles.sectionDescription}>{copy.description}</p>
        </div>
        <Link className={styles.sectionLink} href="#for-businesses">
          {copy.viewAll}
        </Link>
      </div>

      <div className={styles.cityGrid}>
        {portals.map((portal) => (
          <article aria-label={portal.name} className={styles.cityCard} key={portal.slug}>
            <CityArtwork tone={portal.tone}>
              <span className={styles.cityBadge}>{portal.badge}</span>
              <div className={styles.cityArtworkLabel}>
                <strong>{portal.name}</strong>
                <span>{portal.region}</span>
              </div>
              <Link
                aria-label={`Apri ${portal.name}`}
                className={styles.cityArtworkAction}
                href={portal.href}
              >
                <span className={styles.cityCardButtonArrow} aria-hidden="true">
                  {"->"}
                </span>
              </Link>
            </CityArtwork>

            <div className={styles.cityCardCopy}>
              <p>{portal.summary}</p>
            </div>

            <div className={styles.cityCardFooter}>
              <span>{portal.activityLabel}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
