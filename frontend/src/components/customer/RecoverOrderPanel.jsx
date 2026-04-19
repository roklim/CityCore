import { PUBLIC_STATUS_LABELS } from "../../constants";
import { money, orderTrackingHref } from "../../utils/format";

export default function RecoverOrderPanel({
  customerOrders,
  customerOrdersLoading,
  normalizedPhone,
  onPhoneChange,
  phone,
}) {
  return (
    <div className="customer-orders-panel" id="recover-order">
      <div>
        <p className="eyebrow">I miei ordini</p>
        <h2>Recupera il tuo ritiro</h2>
        <p>
          Inserisci il numero lasciato in ordine: ritrovi gli ultimi ritiri e li
          segui senza cercare il link.
        </p>
      </div>
      <label>
        Telefono
        <input
          type="tel"
          placeholder="Es. 333 123 4567"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </label>
      {normalizedPhone.length > 0 && normalizedPhone.length < 6 && (
        <p className="orders-helper">
          Scrivi almeno 6 cifre per cercare i tuoi ordini.
        </p>
      )}
      {customerOrdersLoading && (
        <p className="orders-helper">Sto cercando i tuoi ordini...</p>
      )}
      {!customerOrdersLoading &&
        normalizedPhone.length >= 6 &&
        customerOrders.length === 0 && (
          <p className="orders-helper">
            Nessun ordine trovato con questo numero.
          </p>
        )}
      {customerOrders.length > 0 && (
        <div className="customer-orders-list">
          {customerOrders.map((order) => (
            <a href={orderTrackingHref(order._id)} key={order._id}>
              <span>
                <strong>
                  {order.pickupDate} alle {order.pickupTime}
                </strong>
                <small>
                  {PUBLIC_STATUS_LABELS[order.status] || order.status} -{" "}
                  {order.items.length} prodotti
                </small>
              </span>
              <b>{money(order.total)}</b>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
