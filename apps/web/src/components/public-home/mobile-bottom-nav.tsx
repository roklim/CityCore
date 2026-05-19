import Link from "next/link";
import styles from "./context-gateway.module.css";

function BottomIcon({ icon }: { icon: "home" | "search" | "places" | "saved" | "profile" }) {
  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 11 8-7 8 7" />
          <path d="M6 10v10h12V10" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "places":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 20V8l4-3 4 3v12" />
          <path d="M13 20V5l3-2 3 2v15" />
        </svg>
      );
    case "saved":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21c1.5-4 4-6 7-6s5.5 2 7 6" />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileBottomNav({ citySlug }: { citySlug: string }) {
  const items = [
    { label: "Home", href: `/${citySlug}`, icon: "home" as const, active: true },
    { label: "Cerca", href: `/${citySlug}`, icon: "search" as const, active: false },
    { label: "Attivita", href: `/${citySlug}`, icon: "places" as const, active: false },
    { label: "Salvati", href: `/${citySlug}`, icon: "saved" as const, active: false },
    { label: "Profilo", href: "/admin/login", icon: "profile" as const, active: false },
  ];

  return (
    <nav className={styles.bottomNav} aria-label="Navigazione mobile">
      {items.map((item) => (
        <Link
          className={`${styles.bottomItem} ${item.active ? styles.bottomItemActive : ""}`}
          href={item.href}
          key={item.label}
        >
          <span className={styles.bottomIcon}>
            <BottomIcon icon={item.icon} />
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
