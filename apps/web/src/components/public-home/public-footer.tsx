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
            CC
          </span>
          <span className={styles.brandName}>CityCore</span>
        </div>
        <p>{copy.tagline}</p>
        <div className={styles.footerSocials}>
          <span>ig</span>
          <span>fb</span>
          <span>x</span>
          <span>in</span>
        </div>
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

      <div className={styles.footerNewsletter}>
        <h3>{copy.newsletterTitle}</h3>
        <p>{copy.newsletterDescription}</p>
        <form action="#cities" className={styles.newsletterForm}>
          <input
            aria-label={copy.newsletterAria}
            placeholder={copy.newsletterPlaceholder}
            type="email"
          />
          <button type="submit">{"->"}</button>
        </form>
      </div>
    </footer>
  );
}
