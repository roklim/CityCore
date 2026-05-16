import Link from "next/link";
import type { HomepageViewModel } from "./home-content";
import styles from "./public-home.module.css";

export function EntryGateway({ copy }: { copy: HomepageViewModel["entry"] }) {
  return (
    <section className={styles.entrySection} id="entry">
      <div className={styles.entryIntro}>
        <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
      </div>

      <div className={styles.entryGrid}>
        <article className={styles.entryCard}>
          <div className={styles.entryCardCopy}>
            <h2>{copy.cityTitle}</h2>
            <p>{copy.cityDescription}</p>
          </div>
          <div className={styles.entryControl} aria-hidden="true">
            <span className={styles.entryControlLabel}>{copy.cityControlLabel}</span>
            <span className={styles.entryControlValue}>
              <span className={styles.entryControlDot} />
              <span>Scegli citta</span>
            </span>
            <span className={styles.entryControlArrow}>v</span>
          </div>
          <Link className={styles.primaryButton} href="#cities">
            {copy.cityCta}
          </Link>
        </article>

        <article className={styles.entryCard}>
          <div className={styles.entryCardCopy}>
            <h2>{copy.categoryTitle}</h2>
            <p>{copy.categoryDescription}</p>
          </div>

          <div className={styles.entryPills}>
            {copy.categoryPreview.map((item) => (
              <Link className={styles.entryPill} href={item.href} key={item.title}>
                {item.title}
              </Link>
            ))}
          </div>

          <Link className={styles.secondaryButtonWide} href="#categories">
            {copy.categoryCta}
          </Link>
        </article>
      </div>
    </section>
  );
}
