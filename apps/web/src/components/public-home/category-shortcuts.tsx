import Link from "next/link";
import type { CategoryShortcut, HomepageViewModel } from "./home-content";
import { CapabilityIcon } from "./visuals";
import styles from "./public-home.module.css";

export function CategoryShortcuts({
  categories,
  copy,
}: {
  categories: CategoryShortcut[];
  copy: HomepageViewModel["categorySection"];
}) {
  return (
    <section className={styles.categorySection} id="categories">
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
          <h2 className={styles.sectionTitle}>{copy.title}</h2>
          <p className={styles.sectionDescription}>{copy.description}</p>
        </div>
      </div>

      <div className={styles.categoryGrid}>
        {categories.map((category) => (
          <Link className={styles.categoryCard} href={category.href} key={category.title}>
            <span className={styles.categoryIcon}>
              <CapabilityIcon icon={category.icon} />
            </span>
            <strong>{category.title}</strong>
            <p>{category.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
