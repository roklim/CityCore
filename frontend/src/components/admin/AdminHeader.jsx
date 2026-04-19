export default function AdminHeader({
  activeLabel,
  contextLabel,
  lastUpdatedAt,
  pickupDate,
  refreshing,
  onDateChange,
  onLogout,
  onRefresh,
}) {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">{contextLabel}</p>
        <h1>{activeLabel}</h1>
      </div>
      <div className="admin-actions">
        <span className="refresh-note">
          {lastUpdatedAt ? `Aggiornato ${lastUpdatedAt}` : "Non aggiornato"}
        </span>
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Aggiorno..." : "Aggiorna"}
        </button>
        <input
          type="date"
          value={pickupDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
