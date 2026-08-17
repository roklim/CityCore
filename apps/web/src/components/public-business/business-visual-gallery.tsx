import { demoVisualLabel, getDemoBusinessVisual } from "../public-home/city-demo-visuals";
import styles from "./business-showcase.module.css";

type BusinessVisualGalleryProps = {
  name: string;
  cityName: string;
  categoryLabel: string;
  visualSource: {
    slug: string;
    name: string;
    categoryLabel: string;
    categories: readonly { name: string }[];
    services: readonly string[];
  };
};

export function BusinessVisualGallery({
  name,
  cityName,
  categoryLabel,
  visualSource,
}: BusinessVisualGalleryProps) {
  return (
    <div className={styles.gallery} aria-label={`Racconto visivo dimostrativo di ${name}`}>
      <div
        className={styles.primary}
        role="img"
        aria-label={`${demoVisualLabel} per ${name}`}
        style={{ backgroundImage: `url("${getDemoBusinessVisual(visualSource, 0)}")` }}
      >
        <span className={styles.demoBadge}>{demoVisualLabel}</span>
        <div className={styles.caption}>
          <span>{categoryLabel}</span>
          <strong>Atmosfera e dettagli</strong>
          <small>
            Visual di supporto alla demo. Foto e contenuti reali potranno essere pubblicati
            direttamente dall'attività.
          </small>
        </div>
      </div>
      <div className={styles.secondaryStack}>
        <div
          className={styles.secondary}
          role="img"
          aria-label={`${demoVisualLabel}: dettaglio di ${name}`}
          style={{ backgroundImage: `url("${getDemoBusinessVisual(visualSource, 1)}")` }}
        >
          <span className={styles.demoBadge}>{demoVisualLabel}</span>
        </div>
        <div
          className={styles.secondary}
          role="img"
          aria-label={`${demoVisualLabel}: atmosfera locale a ${cityName}`}
          style={{ backgroundImage: `url("${getDemoBusinessVisual(visualSource, 2)}")` }}
        >
          <span className={styles.demoBadge}>{demoVisualLabel}</span>
        </div>
      </div>
    </div>
  );
}
