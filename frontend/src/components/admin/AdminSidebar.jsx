export default function AdminSidebar({
  businessName,
  businessSlug,
  activeSection,
  navItems,
  onSelect,
  publicHref,
  publicLabel = "Apri menu pubblico",
  title = "Area gestione",
}) {
  return (
    <aside className="admin-sidebar">
      <div>
        <p className="eyebrow">{businessName || "Console piattaforma"}</p>
        <strong>{title}</strong>
        {businessSlug && <span className="admin-business-slug">{businessSlug}</span>}
      </div>
      <nav>
        {navItems.map((item) =>
          item.href ? (
            <a
              className={activeSection === item.id ? "active" : ""}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </a>
          ) : (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          ),
        )}
      </nav>
      <a href={publicHref || `/${businessSlug}`}>{publicLabel}</a>
    </aside>
  );
}
