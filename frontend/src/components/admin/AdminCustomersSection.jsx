import { formatDateTime, money } from "../../utils/format";
import InlineNotice from "../ui/InlineNotice";

export default function AdminCustomersSection({
  customerSearch,
  customers,
  setCustomerSearch,
}) {
  return (
    <section className="admin-panel">
      <div className="section-heading">
        <p className="eyebrow">Clienti</p>
        <h2>Rubrica ordini</h2>
      </div>
      <input
        className="admin-search"
        placeholder="Cerca nome o telefono"
        value={customerSearch}
        onChange={(event) => setCustomerSearch(event.target.value)}
      />
      <div className="customer-admin-list">
        {customers.length === 0 ? (
          <InlineNotice
            title="Nessun cliente trovato"
            description="Prova con un altro nome o numero di telefono."
          />
        ) : (
          customers.map((customer) => (
            <article key={customer._id}>
              <div>
                <strong>{customer.name || "Cliente senza nome"}</strong>
                <span>{customer.phone}</span>
              </div>
              <span>{customer.totalOrders || 0} ordini</span>
              <span>{customer.completedOrders || 0} ritirati</span>
              <strong>{money(customer.totalSpent)}</strong>
              <small>
                {customer.lastOrderAt
                  ? formatDateTime(customer.lastOrderAt)
                  : "Nessun ordine"}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
