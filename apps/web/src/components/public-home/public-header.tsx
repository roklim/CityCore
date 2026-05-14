import Link from "next/link";
import styles from "./public-home.module.css";

export function PublicHeader({ chooserLabel }: { chooserLabel: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark} aria-hidden="true">
            <span className={styles.brandMarkOuter} />
            <span className={styles.brandMarkInner} />
            <span className={styles.brandMarkCore} />
          </span>
          <span className={styles.brandName}>CityCore</span>
        </Link>

        <Link className={styles.cityChooser} href="#cities">
          <span className={styles.cityChooserIcon} aria-hidden="true">
            <span className={styles.cityChooserDot} />
          </span>
          <span>{chooserLabel}</span>
          <span className={styles.cityChooserChevron} aria-hidden="true">
            v
          </span>
        </Link>
      </div>

      <nav className={styles.headerNav} aria-label="Public routes">
        <Link href="#cities">Esplora citta</Link>
        <Link href="#for-businesses">Per le attivita</Link>
        <Link className={styles.signInLink} href="/admin/login">
          Accedi
        </Link>
      </nav>
    </header>
  );
}
