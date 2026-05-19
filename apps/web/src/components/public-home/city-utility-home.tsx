import Link from "next/link";
import type { PublicCitySurfaceData } from "../../lib/public-runtime";
import { NearbyBusinessList, PopularBusinessStrip } from "./business-preview";
import styles from "./context-gateway.module.css";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { QuickCategories, type QuickCategory } from "./quick-categories";

function buildQuickCategories(surface: PublicCitySurfaceData["city"]) {
  return [
    { title: "Business", icon: "business", href: `/${surface.slug}#popular` },
    { title: "Servizi", icon: "services", href: `/${surface.slug}#popular` },
    { title: "Soggiorni", icon: "hospitality", href: `/${surface.slug}#popular` },
    { title: "Eventi", icon: "events", href: `/${surface.slug}#popular` },
    { title: "Directory", icon: "directory", href: `/${surface.slug}#popular` },
  ] satisfies QuickCategory[];
}

function IconButton({ href, label, icon }: { href: string; label: string; icon: "bell" | "user" }) {
  return (
    <Link aria-label={label} className={styles.iconButton} href={href}>
      {icon === "bell" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M18 16v-5a6 6 0 0 0-12 0v5l-2 3h16l-2-3ZM10 21h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5 21c1.5-4 4-6 7-6s5.5 2 7 6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </Link>
  );
}

function CitySearch() {
  return (
    <label className={`${styles.searchShell} ${styles.localSearch}`}>
      <span className={styles.searchIcon} aria-hidden="true" />
      <input
        className={styles.searchInput}
        placeholder="Cerca business, servizi, eventi..."
        readOnly
        type="search"
      />
      <button className={styles.filterButton} type="button" aria-label="Filtri">
        <span className={styles.filterIcon} aria-hidden="true" />
      </button>
    </label>
  );
}

export function CityUtilityHome({ surface }: { surface: PublicCitySurfaceData["city"] }) {
  const quickCategories = buildQuickCategories(surface);
  const nearbyBusinesses = surface.businesses.slice(0, 3);
  const popularBusinesses = surface.businesses.slice(0, 5);

  return (
    <main className={`${styles.contextStage} ${styles.cityHome}`}>
      <div className={styles.cityShell}>
        <aside className={styles.citySidebar}>
          <header className={styles.cityTopbar}>
            <Link className={styles.brand} href="/">
              <span>CityCore</span>
              <span className={styles.accent}>.</span>
            </Link>

            <div className={styles.iconActions}>
              <IconButton href={`/${surface.slug}`} label="Notifiche" icon="bell" />
              <IconButton href="/admin/login" label="Profilo o accesso" icon="user" />
            </div>
          </header>

          <section className={styles.cityHero} aria-labelledby="city-home-title">
            <p className={styles.currentCity}>
              <span className={styles.pinIcon} aria-hidden="true" />
              <span>{surface.name}</span>
            </p>

            <h1 className={styles.cityTitle} id="city-home-title">
              <span>{surface.name}.</span>
              <span>Scopri il</span>
              <span>
                contesto giusto<span className={styles.accent}>.</span>
              </span>
            </h1>

            <CitySearch />
          </section>
        </aside>

        <div className={styles.cityMain}>
          <QuickCategories categories={quickCategories} />
          <NearbyBusinessList businesses={nearbyBusinesses} />
          <PopularBusinessStrip businesses={popularBusinesses} />
        </div>
      </div>

      <MobileBottomNav citySlug={surface.slug} />
    </main>
  );
}
