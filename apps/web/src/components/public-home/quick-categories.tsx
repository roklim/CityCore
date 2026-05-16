import Link from "next/link";
import styles from "./context-gateway.module.css";

export type QuickCategory = {
  title: string;
  href: string;
  icon: "restaurant" | "stay" | "services" | "booking" | "shop";
};

function CategoryIcon({ icon }: { icon: QuickCategory["icon"] }) {
  switch (icon) {
    case "restaurant":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v8M11 3v8M7 7h4M9 11v10" />
          <path d="M16 3v18" />
          <path d="M19 4c1.2 2.4 1.2 5.4 0 7.8-.5 1-1.2 1.6-2 1.9" />
        </svg>
      );
    case "services":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5.5a4.5 4.5 0 0 0 4 6.9L11 20l-3-3 7.5-7.5a4.5 4.5 0 0 0-1-4Z" />
          <path d="M6 18l-2 2" />
        </svg>
      );
    case "shop":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 10h14l-1 11H6L5 10Z" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
        </svg>
      );
    case "booking":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "stay":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20V9" />
          <path d="M4 14h16v6" />
          <path d="M7 14V8h5a3 3 0 0 1 3 3v3" />
          <path d="M15 14h5V7" />
        </svg>
      );
    default:
      return null;
  }
}

export function QuickCategories({ categories }: { categories: QuickCategory[] }) {
  return (
    <section className={styles.utilitySection}>
      <div className={styles.sectionHeader}>
        <h2>Categorie</h2>
        <Link href="#popular">Vedi tutto</Link>
      </div>

      <div className={styles.categoryGrid}>
        {categories.map((category) => (
          <Link className={styles.categoryTile} href={category.href} key={category.title}>
            <span className={styles.categoryIcon}>
              <CategoryIcon icon={category.icon} />
            </span>
            <span>{category.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
