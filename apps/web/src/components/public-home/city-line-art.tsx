import styles from "./context-gateway.module.css";

export function CityLineArt() {
  return (
    <div className={styles.cityLineArt} aria-hidden="true">
      <img alt="" className={styles.cityIllustration} src="/citycore-city-skyline.svg" />
    </div>
  );
}
