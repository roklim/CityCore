import { useEffect, useState } from "react";
import { getOrder } from "../lib/api";
import { ORDER_STATUS_STEPS, PUBLIC_STATUS_LABELS } from "../constants";
import { money } from "../utils/format";
import Toast from "../components/Toast";
export default function TrackingView({ orderId }) {
  // Vista pubblica minimale per controllare stato e dettagli essenziali ordine.
  const [order, setOrder] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

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
    try {
      setOrder(await getOrder(orderId));
    } catch (error) {
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
        <a href="/">Torna al menu</a>
        <p className="eyebrow">Tracking ordine</p>
        {loading && !order ? (
          <h1>Caricamento...</h1>
        ) : order ? (
          <>
            <h1>{PUBLIC_STATUS_LABELS[order.status] || order.status}</h1>
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
          <h1>Ordine non trovato</h1>
        )}
      </section>
      <Toast message={toast} />
    </main>
  );
}


