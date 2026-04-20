import { LOYALTY_GOAL } from "../../constants";
import { formatDate, getSlotHint, money } from "../../utils/format";

export default function CustomerCheckoutPanel({
  addToCart,
  availability,
  availabilityLoading,
  businessName,
  cart,
  checkoutDisabled,
  customer,
  customerLookupLoading,
  customerProfile,
  dateOptions,
  loyaltyCyclePoints,
  loyaltyPoints,
  loyaltyRemaining,
  mobileCartOpen,
  notes,
  onCloseMobileCart,
  phone,
  pickupDate,
  removeFromCart,
  reorderLastOrder,
  selectedSlot,
  setCustomer,
  setNotes,
  setPhone,
  setPickupDate,
  setSelectedSlot,
  submitOrder,
  total,
  updateCartItemNote,
  visibleCustomerSlots,
}) {
  const missingRequirements = [
    cart.length === 0 ? "Aggiungi almeno un prodotto" : "",
    !customer.trim() ? "Inserisci il nome" : "",
    !phone.trim() ? "Inserisci il telefono" : "",
    !selectedSlot ? "Scegli l'orario di ritiro" : "",
  ].filter(Boolean);
  const submitTitle = missingRequirements.length
    ? missingRequirements.join(" - ")
    : "Conferma ordine";

  return (
    <form
      className={`checkout-panel ${mobileCartOpen ? "mobile-open" : ""}`}
      onSubmit={submitOrder}
    >
      <button className="drawer-close" type="button" onClick={onCloseMobileCart}>
        Chiudi
      </button>
      <div className="section-heading">
        <p className="eyebrow">Ritiro al banco</p>
        <h2>Il tuo ordine</h2>
        <span className="checkout-subtitle">Ritiro presso {businessName}</span>
      </div>

      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="empty-cart">
            <strong>Ancora nessun prodotto</strong>
            <span>Scegli dal menu per preparare il tuo ritiro.</span>
          </div>
        ) : (
          cart.map((item) => (
            <div className="cart-row" key={item.id}>
              <div>
                <span>
                  {item.emoji && <b className="cart-row-emoji">{item.emoji}</b>}
                  {item.name}
                </span>
                {item.customSummary ? (
                  <small className="cart-custom-summary">
                    {item.customSummary}
                  </small>
                ) : (
                  <textarea
                    placeholder={`Note per ${item.name}`}
                    value={item.itemNotes || ""}
                    onChange={(event) =>
                      updateCartItemNote(item.id, event.target.value)
                    }
                  />
                )}
              </div>
              <strong>
                {money(item.price * item.qty)}
                <small>x{item.qty}</small>
              </strong>
              <div className="cart-row-actions">
                <button type="button" onClick={() => removeFromCart(item.id)}>
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addToCart({
                      _id: item.id,
                      name: item.name,
                      price: item.price,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="total-row">
        <span>Totale</span>
        <strong>{money(total)}</strong>
      </div>

      <label>
        Nome
        <input
          autoComplete="name"
          placeholder="Es. Marco"
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
        />
      </label>
      <label>
        Telefono
        <input
          autoComplete="tel"
          inputMode="tel"
          placeholder="Es. 333 123 4567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <p className="privacy-note">
        Usiamo il numero solo per riconoscerti, gestire l'ordine e mostrarti i
        tuoi punti.
      </p>

      {!customerProfile && !customerLookupLoading && (
        <div className="loyalty-card loyalty-empty">
          <div>
            <p className="eyebrow">Tessera banco</p>
            <strong>Ordina con il tuo numero</strong>
            <span>
              Accumuli punti e ritrovi piu velocemente i tuoi ordini preferiti.
            </span>
          </div>
        </div>
      )}

      {customerLookupLoading && (
        <p className="loyalty-card subtle">Controllo tessera fedelta...</p>
      )}

      {customerProfile && (
        <div className="loyalty-card">
          <div>
            <p className="eyebrow">Bentornato al banco</p>
            <strong>{customerProfile.customer.name || "Cliente Mucho Gusto"}</strong>
            <span>
              {loyaltyPoints} punti banco - {loyaltyRemaining} al prossimo
              bonus
            </span>
            <strong className="loyalty-progress-label">
              {loyaltyCyclePoints}/{LOYALTY_GOAL} verso il bonus
            </strong>
            <div className="loyalty-progress">
              <span
                style={{
                  width: `${(loyaltyCyclePoints / LOYALTY_GOAL) * 100}%`,
                }}
              />
            </div>
            <small>Ogni 10 ordini completati: 5 euro di sconto.</small>
          </div>
          {customerProfile.lastOrder && (
            <div className="reorder-panel">
              <span>Riprendiamo lo stesso ordine dell'altra volta?</span>
              <button type="button" onClick={reorderLastOrder}>
                Riordina ora
              </button>
            </div>
          )}
        </div>
      )}

      <label>
        Note
        <textarea
          placeholder="Allergie, preferenze o indicazioni per il banco"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="date-strip">
        {dateOptions.map((date) => (
          <button
            type="button"
            className={date === pickupDate ? "active" : ""}
            key={date}
            onClick={() => setPickupDate(date)}
          >
            {formatDate(date)}
          </button>
        ))}
      </div>

      <div className="slot-grid">
        {availabilityLoading ? (
          <div className="slot-skeleton" aria-label="Caricamento orari">
            <span />
            <span />
            <span />
          </div>
        ) : availability?.closed ? (
          <p className="slots-empty">
            <strong>Locale chiuso in questo giorno</strong>
            <span>Scegli un altro giorno di ritiro.</span>
          </p>
        ) : !availability ? (
          <p className="slots-empty">
            <strong>Orari non disponibili</strong>
            <span>Riprova tra poco o contatta il locale.</span>
          </p>
        ) : visibleCustomerSlots.length === 0 ? (
          <p className="slots-empty">
            <strong>Nessuna fascia disponibile</strong>
            <span>Prova un altro giorno o contatta il locale.</span>
          </p>
        ) : (
          visibleCustomerSlots.map((slot) => (
            <button
              type="button"
              key={slot.pickupSlot}
              className={[
                selectedSlot === slot.pickupSlot ? "active" : "",
                slot.almostFull ? "almost" : "",
              ].join(" ")}
              onClick={() => setSelectedSlot(slot.pickupSlot)}
            >
              <span>{slot.time}</span>
              <small>{getSlotHint(slot)}</small>
            </button>
          ))
        )}
      </div>

      <div className="payment-note">
        <strong>Pagamento al banco</strong>
        <span>Paghi quando passi a ritirare.</span>
      </div>

      {missingRequirements.length > 0 && (
        <div className="checkout-requirements" aria-live="polite">
          <strong>Per confermare manca:</strong>
          <span>{missingRequirements.join(", ")}</span>
        </div>
      )}

      <button
        className="submit-button"
        type="submit"
        disabled={checkoutDisabled}
        aria-disabled={checkoutDisabled}
        title={submitTitle}
      >
        Conferma ordine - {money(total)}
      </button>
    </form>
  );
}
