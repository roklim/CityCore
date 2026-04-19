import { useEffect, useState } from "react";
import { getBusinessSlug, getOrder } from "../lib/api";
import { ORDER_STATUS_STEPS, PUBLIC_STATUS_LABELS } from "../constants";
import { businessHref, money } from "../utils/format";
import Toast from "../components/Toast";
import EmptyState from "../components/ui/EmptyState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import StatusPill from "../components/ui/StatusPill";

function statusTone(status) {
  if (status === "ready" || status === "done") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

export default function TrackingView({ orderId }) {
  // Vista pubblica minimale per controllare stato e dettagli essenziali ordine.
  const [order, setOrder] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const businessSlug = getBusinessSlug();
  const menuHref = businessHref(businessSlug);

  useEffect(() => {
    refreshOrder();
  }, [orderId]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2400);
  }

  async function refreshOrder() {
    setLoading(true);
    setError("");
    try {
      setOrder(await getOrder(orderId));
    } catch (error) {
      setError(error.message || "Errore durante il caricamento dell'ordine");
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }

  const activeStep = Math.max(
    ORDER_STATUS_STEPS.indexOf(order?.status || "preparing"),
    0,
  );

  return (
    <main className="tracking-shell">
      <section className="tracking-card">
        <div className="tracking-links">
          <a href={menuHref}>Torna al menu</a>
          <a href="/">Tutte le attivita</a>
        </div>
        <p className="eyebrow">Tracking ordine</p>
        {loading && !order ? (
          <>
            <h1>Caricamento ordine</h1>
            <LoadingSkeleton variant="list" count={3} />
          </>
        ) : order ? (
          <>
            <div className="tracking-status-row">
              <h1>{PUBLIC_STATUS_LABELS[order.status] || order.status}</h1>
              <StatusPill tone={statusTone(order.status)}>
                {PUBLIC_STATUS_LABELS[order.status] || order.status}
              </StatusPill>
            </div>
            <p>
              Ritiro al banco:{" "}
              <strong>
                {order.pickupDate} alle {order.pickupTime}
              </strong>
            </p>
            <div className="tracking-steps">
              {ORDER_STATUS_STEPS.map((status, index) => (
                <span
                  className={index <= activeStep ? "active" : ""}
                  key={status}
                >
                  {PUBLIC_STATUS_LABELS[status]}
                </span>
              ))}
            </div>
            <div className="tracking-items">
              {order.items.map((item, index) => (
                <span key={`${item.name}-${index}`}>
                  <strong>
                    {item.qty}x {item.name}
                  </strong>
                  {item.notes && <small>{item.notes}</small>}
                </span>
              ))}
            </div>
            <strong className="tracking-total">{money(order.total)}</strong>
            <button type="button" onClick={refreshOrder}>
              Aggiorna stato
            </button>
          </>
        ) : (
          <EmptyState
            title={error ? "Non riusciamo a caricare l'ordine" : "Ordine non trovato"}
            description={
              error ||
              "Controlla il link ricevuto oppure torna al menu del locale."
            }
            actionLabel="Riprova"
            onAction={refreshOrder}
            secondaryLabel="Torna al menu"
            secondaryHref={menuHref}
          />
        )}
      </section>
      <Toast message={toast} />
    </main>
  );
}


