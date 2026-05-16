import Link from "next/link";
import type { FeaturedBusiness, HomepageViewModel } from "./home-content";
import { BusinessArtwork } from "./visuals";
import styles from "./public-home.module.css";

export function FeaturedBusinessGrid({
  businesses,
  copy,
}: {
  businesses: FeaturedBusiness[];
  copy: HomepageViewModel["businessSection"];
}) {
  return (
    <section className={styles.sectionBlock} id="showcase">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{copy.title}</h2>
          <p className={styles.sectionDescription}>{copy.description}</p>
        </div>
      </div>

      <div className={styles.businessGrid}>
        {businesses.map((business) => (
          <article className={styles.businessCard} key={business.slug}>
            <BusinessArtwork badge={business.badge} tone={business.tone} />

            <div className={styles.businessCardCopy}>
              <h3>{business.name}</h3>
              <span>
                {business.category} / {business.cityName}
              </span>
              <p>{business.summary}</p>
            </div>

            <div className={styles.businessMeta}>
              <span>Valutazione {business.rating}</span>
              <span>{business.reviews} recensioni</span>
              <span>{business.distance}</span>
            </div>

            <Link className={styles.businessCardLink} href={business.href}>
              {copy.openProfile}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
