import Link from "next/link";
import type { HeroInsight } from "./home-content";
import { HeroArtwork } from "./visuals";
import styles from "./public-home.module.css";

export function GatewayHero({
  insights,
  trustPoints,
  copy,
}: {
  insights: HeroInsight[];
  trustPoints: string[];
  copy: {
    eyebrow: string;
    titleLine: string;
    accentLine: string;
    description: string;
    searchAria: string;
    searchPlaceholder: string;
    primaryCta: string;
    secondaryCta: string;
    trustTitle: string;
    trustDescription: string;
  };
}) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleLine}>{copy.titleLine}</span>
          <span className={styles.heroTitleAccentLine}>{copy.accentLine}</span>
        </h1>
        <p className={styles.heroDescription}>{copy.description}</p>

        <div className={styles.heroSearchRow}>
          <label className={styles.searchShell}>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              aria-label={copy.searchAria}
              className={styles.searchInput}
              placeholder={copy.searchPlaceholder}
              type="search"
            />
          </label>
          <Link className={styles.primaryButton} href="#cities">
            {copy.primaryCta}
          </Link>
        </div>

        <Link className={styles.secondaryButton} href="#for-businesses">
          {copy.secondaryCta}
        </Link>

        <div className={styles.trustPanel}>
          <div className={styles.trustLead}>
            <div className={styles.trustShield} aria-hidden="true">
              <span />
            </div>
            <div>
              <strong>{copy.trustTitle}</strong>
              <p>{copy.trustDescription}</p>
            </div>
          </div>

          <div className={styles.trustList}>
            {trustPoints.map((point) => (
              <div className={styles.trustListItem} key={point}>
                <span aria-hidden="true" />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.heroVisualColumn}>
        <HeroArtwork />
        <div className={styles.heroStatsGrid}>
          {insights.map((insight) => (
            <article className={styles.heroStatCard} key={insight.label}>
              <span>{insight.label}</span>
              <strong>{insight.value}</strong>
              <p>{insight.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
