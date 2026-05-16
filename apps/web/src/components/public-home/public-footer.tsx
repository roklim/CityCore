import Link from "next/link";
import type { FooterSection, HomepageViewModel } from "./home-content";
import styles from "./public-home.module.css";

export function PublicFooter({
  sections,
  copy,
}: {
  sections: FooterSection[];
  copy: HomepageViewModel["footerContent"];
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrandColumn}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span className={styles.brandMarkOuter} />
            <span className={styles.brandMarkInner} />
            <span className={styles.brandMarkCore} />
          </span>
          <span className={styles.brandName}>CityCore</span>
        </div>
        <p>{copy.tagline}</p>
      </div>

      <div className={styles.footerLinks}>
        {sections.map((section) => (
          <div className={styles.footerColumn} key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
