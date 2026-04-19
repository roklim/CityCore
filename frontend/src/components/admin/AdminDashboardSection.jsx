import { STATUSES } from "../../constants";
import { isFreshOrder, isUrgentOrder, money } from "../../utils/format";
import InlineNotice from "../ui/InlineNotice";

export default function AdminDashboardSection({
  availability,
  recentOrders,
  topProductMax,
  topProducts,
}) {
  return (
    <section className="admin-dashboard-grid">
      <div className="admin-panel">
        <div className="section-heading">
          <p className="eyebrow">Oggi al banco</p>
          <h2>Ordini in arrivo</h2>
        </div>
        <div className="admin-table">
          {recentOrders.length === 0 ? (
            <InlineNotice
              title="Nessun ordine registrato oggi"
              description="Gli ordini in arrivo appariranno qui in tempo reale."
            />
          ) : (
            recentOrders.map((order) => (
              <article
                className={`compact-order ${isUrgentOrder(order) ? "urgent" : ""}`}
                key={order._id}
              >
                <div>
                  <strong>{order.customer}</strong>
                  <span>
                    {order.pickupTime} - {money(order.total)}
                  </span>
                </div>
                <span className={`status ${order.status}`}>
                  {isFreshOrder(order) ? "Nuovo" : STATUSES[order.status]}
                </span>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="admin-panel">
        <div className="section-heading">
          <p className="eyebrow">Vendite</p>
          <h2>Piu ordinati</h2>
        </div>
        <div className="top-products">
          {topProducts.length === 0 ? (
            <InlineNotice
              title="Ancora nessun prodotto venduto"
              description="La classifica si aggiorna appena arrivano ordini."
            />
          ) : (
            topProducts.map((item) => (
              <span className="top-product-row" key={item.name}>
                <span>
                  <strong>{item.name}</strong>
                  <b>
                    {item.qty} pz - {money(item.revenue)}
                  </b>
                </span>
                <i
                  style={{
                    width: `${((item.qty || 0) / topProductMax) * 100}%`,
                  }}
                />
              </span>
            ))
          )}
        </div>
      </div>

      <div className="admin-panel">
        <div className="section-heading">
          <p className="eyebrow">Capienza</p>
          <h2>Fasce orarie</h2>
        </div>
        <div className="capacity-strip compact">
          {(availability?.slots || []).map((slot) => (
            <div
              className={[
                "capacity-pill",
                slot.full ? "full" : "",
                slot.almostFull ? "almost" : "",
              ].join(" ")}
              key={slot.pickupSlot}
            >
              <strong>{slot.time}</strong>
              <span>
                {slot.count}/{availability.maxOrdersPerSlot}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
