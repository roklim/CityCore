import type { HomepageViewModel } from "./home-content";
import styles from "./public-home.module.css";

export function TrustStrip({ copy }: { copy: HomepageViewModel["trustStrip"] }) {
  return (
    <section className={styles.trustStrip} aria-label={copy.title}>
      <div className={styles.trustStripLead}>
        <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
        <strong>{copy.title}</strong>
      </div>

      <div className={styles.trustStripItems}>
        {copy.items.map((item) => (
          <span className={styles.trustStripItem} key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
