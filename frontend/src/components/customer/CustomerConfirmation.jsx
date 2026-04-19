import { PUBLIC_STATUS_LABELS } from "../../constants";
import { money, orderTrackingHref } from "../../utils/format";
import Toast from "../Toast";

export default function CustomerConfirmation({
  confirmation,
  onBackToMenu,
  toast,
}) {
  return (
    <main className="customer-shell confirmation-shell">
      <section className="confirmation-card">
        <p className="eyebrow">Ordine preso al banco</p>
        <h1>Passa alle {confirmation.pickupTime}</h1>
        <p>
          Il forno ha ricevuto il tuo ordine. Tieni questa schermata o segui
          il ritiro per controllare quando passa a pronto.
        </p>

        <div className="confirmation-summary">
          <span>
            Nome <strong>{confirmation.customer}</strong>
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
            ID ordine <strong>{confirmation._id}</strong>
          </span>
        </div>

        <div className="confirmation-actions">
          <a className="tracking-link" href={orderTrackingHref(confirmation._id)}>
            Segui il ritiro
          </a>
          <a href="/">Tutte le attivita</a>
          <button type="button" onClick={onBackToMenu}>
            Torna al menu
          </button>
        </div>
      </section>
      <Toast message={toast} />
    </main>
  );
}
