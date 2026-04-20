export default function AdminSidebar({
  businessName,
  businessSlug,
  activeSection,
  navItems,
  onSelect,
}) {
  return (
    <aside className="admin-sidebar">
      <div>
        <p className="eyebrow">{businessName || "Console piattaforma"}</p>
        <strong>Area gestione</strong>
        <span className="admin-business-slug">{businessSlug}</span>
      </div>
      <nav>
        {navItems.map((item) => (
          <button
            className={activeSection === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <a href={`/${businessSlug}`}>Apri menu pubblico</a>
    </aside>
  );
}
