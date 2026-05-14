import Link from "next/link";
import type { HomepageViewModel } from "./home-content";
import { CalloutArtwork } from "./visuals";
import styles from "./public-home.module.css";

export function BusinessCallout({ copy }: { copy: HomepageViewModel["callout"] }) {
  return (
    <section className={styles.calloutSection} id="for-businesses">
      <div className={styles.calloutCopy}>
        <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
        <h2>
          {copy.titleLine1}
          <br />
          {copy.titleLine2}
        </h2>
        <p>{copy.description}</p>

        <div className={styles.calloutActions}>
          <Link className={styles.primaryButton} href="/admin/login">
            {copy.primaryCta}
          </Link>
          <Link className={styles.ghostButton} href="#cities">
            {copy.secondaryCta}
          </Link>
        </div>
      </div>

      <CalloutArtwork />
    </section>
  );
}
