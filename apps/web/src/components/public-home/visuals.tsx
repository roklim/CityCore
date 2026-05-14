import type { ReactNode } from "react";
import styles from "./public-home.module.css";

function getToneClass(
  tone:
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "cafe"
    | "fitness"
    | "garden"
    | "service"
    | "atelier",
) {
  switch (tone) {
    case "emerald":
      return styles.toneEmerald;
    case "violet":
      return styles.toneViolet;
    case "amber":
      return styles.toneAmber;
    case "rose":
      return styles.toneRose;
    case "cafe":
      return styles.toneCafe;
    case "fitness":
      return styles.toneFitness;
    case "garden":
      return styles.toneGarden;
    case "service":
      return styles.toneService;
    case "atelier":
      return styles.toneAtelier;
    default:
      return "";
  }
}

export function HeroArtwork() {
  return (
    <div className={styles.heroArtwork}>
      <div className={styles.heroArtworkGlow} />
      <div className={styles.heroArtworkRings} />
      <div className={styles.heroArtworkSkyline}>
        <span className={styles.heroTowerOne} />
        <span className={styles.heroTowerTwo} />
        <span className={styles.heroTowerThree} />
        <span className={styles.heroTowerFour} />
        <span className={styles.heroTowerFive} />
      </div>
      <div className={styles.heroArtworkBridge} />
      <div className={styles.heroArtworkWater} />
    </div>
  );
}

export function CityArtwork({
  tone,
  children,
}: {
  tone: "emerald" | "violet" | "amber" | "rose";
  children?: ReactNode;
}) {
  return (
    <div className={`${styles.cityArtwork} ${getToneClass(tone)}`}>
      <div className={styles.cityArtworkSkyline}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.cityArtworkWaterline} />
      {children}
    </div>
  );
}

export function BusinessArtwork({
  tone,
  badge,
}: {
  tone: "cafe" | "fitness" | "garden" | "service" | "atelier";
  badge?: string;
}) {
  return (
    <div className={`${styles.businessArtwork} ${getToneClass(tone)}`}>
      {badge ? <span className={styles.businessBadge}>{badge}</span> : null}
      <div className={styles.businessArtworkFrame}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function CalloutArtwork() {
  return (
    <div className={styles.calloutArtwork}>
      <div className={styles.calloutPhone}>
        <div className={styles.calloutPhoneTop} />
        <div className={styles.calloutPhoneScreen}>
          <div className={styles.calloutPhoneWidget} />
          <div className={styles.calloutPhoneList}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className={styles.calloutDashboard}>
        <div className={styles.calloutDashboardTop}>
          <span />
          <span />
        </div>
        <div className={styles.calloutDashboardStats}>
          <div />
          <div />
          <div />
        </div>
        <div className={styles.calloutDashboardChart}>
          <svg viewBox="0 0 240 120" aria-hidden="true">
            <path
              d="M10 88 L54 46 L96 74 L138 34 L180 58 L230 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function CapabilityIcon({
  icon,
}: {
  icon: "discover" | "book" | "order" | "contact" | "manage";
}) {
  switch (icon) {
    case "discover":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16.2 16.2 21 21" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "order":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="7" width="14" height="12" rx="2.5" />
          <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 18.5c1.5-1.2 3.4-1.9 6-1.9s4.5.7 6 1.9" />
          <path d="M12 14.5c4.2 0 7.5-2.8 7.5-6.3S16.2 1.9 12 1.9 4.5 4.7 4.5 8.2c0 1.5.6 2.8 1.6 3.8L5 16.8l3.4-2.1" />
        </svg>
      );
    case "manage":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h16M6.5 20V9.5M12 20V5.5M17.5 20v-7" />
          <path d="M4 9.5h5M9.5 5.5H14M14.5 13h5" />
        </svg>
      );
    default:
      return null;
  }
}
