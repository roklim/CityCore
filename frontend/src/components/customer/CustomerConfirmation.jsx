import { PUBLIC_STATUS_LABELS } from "../../constants";
import { formatDate, money, orderTrackingHref } from "../../utils/format";
import Toast from "../Toast";

export default function CustomerConfirmation({
  confirmation,
  onBackToMenu,
  toast,
}) {
  const trackingHref = orderTrackingHref(confirmation._id);
  const pickupDateLabel = confirmation.pickupDate
    ? formatDate(confirmation.pickupDate)
    : "Da confermare";

  return (
    <main className="customer-shell confirmation-shell">
      <section className="confirmation-card">
        <p className="eyebrow">Ordine confermato</p>
        <h1>Ritiro alle {confirmation.pickupTime}</h1>
        <p>
          Il locale ha ricevuto l'ordine. Tieni questa schermata o apri il
          tracking per seguire lo stato del ritiro.
        </p>

        <div className="confirmation-summary">
          <span>
            Nome <strong>{confirmation.customer}</strong>
          </span>
          <span>
            Giorno <strong>{pickupDateLabel}</strong>
          </span>
          <span>
            Totale <strong>{money(confirmation.total)}</strong>
          </span>
          <span>
            Stato{" "}
            <strong>
              {PUBLIC_STATUS_LABELS[confirmation.status] ||
                confirmation.status}
            </strong>
          </span>
          <span>
            Codice{" "}
            <strong>{String(confirmation._id).slice(-6).toUpperCase()}</strong>
          </span>
        </div>

        {confirmation.items?.length > 0 && (
          <div className="confirmation-items">
            <strong>Riepilogo</strong>
            {confirmation.items.map((item, index) => (
              <span key={`${item.name}-${index}`}>
                {item.qty}x {item.name}
              </span>
            ))}
          </div>
        )}

        <div className="confirmation-actions">
          <a className="tracking-link" href={trackingHref}>
            Segui il ritiro
          </a>
          <button type="button" onClick={onBackToMenu}>
            Nuovo ordine
          </button>
          <a href="/">Tutte le attivita</a>
        </div>
      </section>
      <Toast message={toast} />
    </main>
  );
}
