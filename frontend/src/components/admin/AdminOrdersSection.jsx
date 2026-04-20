import { ORDER_FILTERS, ORDER_STATUS_STEPS, STATUSES } from "../../constants";
import { isFreshOrder, isUrgentOrder, money } from "../../utils/format";
import InlineNotice from "../ui/InlineNotice";

function getNextStatus(status) {
  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);
  return currentIndex >= 0 ? ORDER_STATUS_STEPS[currentIndex + 1] : null;
}

export default function AdminOrdersSection({
  changeStatus,
  groupedOrders,
  orderFilter,
  orderSearch,
  setOrderFilter,
  setOrderSearch,
  visibleOrders,
}) {
  const readyCount = visibleOrders.filter((order) => order.status === "ready").length;
  const activeCount = visibleOrders.filter(
    (order) => !["done", "cancelled"].includes(order.status),
  ).length;

  return (
    <>
      <section className="admin-toolbar">
        <div className="admin-orders-summary">
          <strong>{visibleOrders.length} ordini</strong>
          <span>{activeCount} da gestire</span>
          <span>{readyCount} pronti al banco</span>
        </div>
        <div className="quick-filters">
          {ORDER_FILTERS.map((filter) => (
            <button
              className={orderFilter === filter.id ? "active" : ""}
              key={filter.id}
              type="button"
              onClick={() => setOrderFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Cerca cliente, telefono, prodotto o nota"
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
        />
      </section>

      <section className="slot-columns">
        {visibleOrders.length === 0 ? (
          <InlineNotice
            title="Nessun ordine con questi filtri"
            description="Cambia stato, ricerca o data per vedere altri ordini."
          />
        ) : (
          Object.entries(groupedOrders).map(([slot, slotOrders]) => (
            <div className="slot-column" key={slot}>
              <h2>{slotOrders[0]?.pickupTime || slot}</h2>
              {slotOrders.map((order) => (
                <article
                  className={`order-card ${isUrgentOrder(order) ? "urgent" : ""}`}
                  key={order._id}
                >
                  <div className="order-card-head">
                    <strong>{order.customer}</strong>
                    <span className={`status ${order.status}`}>
                      {isFreshOrder(order) ? "Nuovo" : STATUSES[order.status]}
                    </span>
                  </div>
                  <div className="order-meta">
                    <span>{order.phone || "Telefono non inserito"}</span>
                    <span>
                      {order.pickupDate} - {order.pickupTime}
                    </span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  <p>
                    {(order.items || [])
                      .map((item) => `${item.qty}x ${item.name}`)
                      .join(" | ")}
                  </p>
                  {order.notes && <p className="order-note">{order.notes}</p>}
                  {order.items?.some((item) => item.notes) && (
                    <div className="order-item-notes">
                      {order.items
                        .filter((item) => item.notes)
                        .map((item, index) => (
                          <span key={`${order._id}-note-${index}`}>
                            <strong>{item.name}</strong>: {item.notes}
                          </span>
                      ))}
                    </div>
                  )}
                  {getNextStatus(order.status) && (
                    <button
                      className="order-next-action"
                      type="button"
                      onClick={() =>
                        changeStatus(order._id, getNextStatus(order.status))
                      }
                    >
                      Porta a {STATUSES[getNextStatus(order.status)]}
                    </button>
                  )}
                  <div className="status-buttons">
                    {Object.keys(STATUSES).map((status) => (
                      <button
                        className={order.status === status ? "active" : ""}
                        type="button"
                        key={status}
                        onClick={() => changeStatus(order._id, status)}
                      >
                        {STATUSES[status]}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </>
  );
}
