import {
  CUSTOM_PIZZA_BASES,
  CUSTOM_PIZZA_MAX_TOPPINGS,
  CUSTOM_PIZZA_TOPPINGS,
  LOYALTY_GOAL,
  MENU_SECTIONS,
  PUBLIC_STATUS_LABELS,
  QUICK_FILTERS,
} from "../constants";
import {
  formatDate,
  getSlotHint,
  isCounterOpenNow,
  money,
  orderTrackingHref,
} from "../utils/format";
import { getBusinessSlug } from "../lib/api";
import Toast from "../components/Toast";
import useCustomerController from "../hooks/useCustomerController";
export default function CustomerView() {
  const {
    activeFilters,
    activeMenu,
    activeMenuSection,
    addCustomPizzaToCart,
    addToCart,
    addedItemId,
    availability,
    cart,
    cartCount,
    confirmation,
    customPizzaBase,
    customPizzaBaseId,
    customPizzaNotes,
    customPizzaOpen,
    customPizzaPrice,
    customPizzaRef,
    customPizzaSelectedToppings,
    customPizzaToppings,
    customer,
    customerLookupLoading,
    customerOrders,
    customerOrdersLoading,
    customerProfile,
    dateOptions,
    getCartItem,
    loading,
    loyaltyCyclePoints,
    loyaltyPoints,
    loyaltyRemaining,
    menuBySection,
    mobileCartOpen,
    normalizedPhone,
    notes,
    phone,
    pickupDate,
    removeFromCart,
    reorderLastOrder,
    searchTerm,
    selectedSlot,
    setConfirmation,
    setCustomer,
    setCustomPizzaBaseId,
    setCustomPizzaNotes,
    setMobileCartOpen,
    setNotes,
    setPhone,
    setPickupDate,
    setSearchTerm,
    setSelectedSlot,
    setActiveFilters,
    setActiveMenuSection,
    submitOrder,
    toast,
    toggleCustomPizzaBuilder,
    toggleCustomPizzaTopping,
    toggleFilter,
    total,
    updateCartItemNote,
    visibleCustomerSlots,
  } = useCustomerController();
  if (confirmation) {
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
            <a
              className="tracking-link"
              href={orderTrackingHref(confirmation._id)}
            >
              Segui il ritiro
            </a>
            <button type="button" onClick={() => setConfirmation(null)}>
              Torna al menu
            </button>
          </div>
        </section>
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="customer-shell">
      <section className="brand-panel">
        <a className="admin-link" href={`/${getBusinessSlug()}/admin`}>
          Admin
        </a>
        <span
          className={`counter-badge ${isCounterOpenNow() ? "open" : "closed"}`}
        >
          {isCounterOpenNow()
            ? "Banco aperto Â· ordina ora"
            : "chiuso Â· riapre stasera alle 18:00"}
        </span>
        <p className="eyebrow">Mucho Gusto Pizzeria</p>
        <h1>Tranci caldi, teglie fumanti e pizze pronte per l'asporto.</h1>
        <p className="lead">
          Scegli tranci, teglie, fritti e bibite. Prenoti l'orario, passi al
          banco e paghi al ritiro.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("menu")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ordina ora â†’
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("recover-order")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Recupera il tuo ordine â†“
          </button>
        </div>
        <div className="service-strip" aria-label="Servizio pizzeria">
          <span>
            <strong>Asporto</strong> ritiro al banco
          </span>
          <span>
            <strong>Pizza</strong> trancio o teglia
          </span>
          <span>
            <strong>Pagamento</strong> in pizzeria
          </span>
        </div>
        <div className="customer-orders-panel" id="recover-order">
          <div>
            <p className="eyebrow">I miei ordini</p>
            <h2>Recupera il tuo ritiro</h2>
            <p>
              Inserisci il numero lasciato in ordine: ritrovi gli ultimi ritiri
              e li segui senza cercare il link.
            </p>
          </div>
          <label>
            Telefono
            <input
              type="tel"
              placeholder="Es. 333 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
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
      </section>

      <section className="order-layout" id="menu">
        <div className="menu-area">
          <div className="section-heading">
            <p className="eyebrow">Menu</p>
            <h2>Il banco di oggi</h2>
          </div>

          {loading ? (
            <p className="muted">Caricamento menu...</p>
          ) : (
            <div className="menu-sections">
              <div className="menu-tools">
                <label className="menu-search">
                  Cosa ti va dal banco?
                  <input
                    placeholder="Cerca trancio, teglia, fritto, bibita..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>
                <div className="quick-filters" aria-label="Filtri rapidi">
                  <button
                    type="button"
                    className={activeFilters.length === 0 ? "active" : ""}
                    onClick={() => {
                      setActiveFilters([]);
                      document
                        .getElementById("menu")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Tutti
                  </button>
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      type="button"
                      className={
                        activeFilters.includes(filter.id) ? "active" : ""
                      }
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <nav className="menu-category-nav" aria-label="Categorie menu">
                {menuBySection.map((section) => (
                  <button
                    type="button"
                    className={activeMenu?.id === section.id ? "active" : ""}
                    key={section.id}
                    onClick={() => setActiveMenuSection(section.id)}
                  >
                    <span>{section.eyebrow}</span>
                    <strong>{section.title}</strong>
                  </button>
                ))}
              </nav>

              {menuBySection.length === 0 ? (
                <p className="menu-empty">
                  Niente al banco con questi filtri: prova a cercare un altro
                  trancio o sfizio.
                </p>
              ) : (
                activeMenu && (
                  <section
                    className="menu-section"
                    id={`menu-${activeMenu.id}`}
                    key={activeMenu.id}
                  >
                    <div className="menu-section-head">
                      <div>
                        <p className="eyebrow">{activeMenu.eyebrow}</p>
                        <h3>{activeMenu.title}</h3>
                        <span>{activeMenu.description}</span>
                      </div>
                      <strong>
                        {activeMenu.items.length +
                          (activeMenu.id === "pizze-tonde" ? 1 : 0)}{" "}
                        prodotti
                      </strong>
                    </div>

                    <div className="menu-grid">
                      {activeMenu.id === "pizze-tonde" && (
                        <article
                          className={[
                            "menu-card",
                            "custom-pizza-card",
                            customPizzaOpen ? "expanded" : "",
                            addedItemId.startsWith("custom-pizza")
                              ? "just-added"
                              : "",
                          ].join(" ")}
                          ref={customPizzaRef}
                        >
                          <div className="menu-card-head">
                            <span className="menu-emoji">ðŸ•</span>
                            <div>
                              <span className="menu-featured custom">
                                Personalizzabile
                              </span>
                              <span className="menu-name">Pizza su misura</span>
                              <span className="menu-desc">
                                Scegli base e ingredienti, la prepariamo noi al
                                momento.
                              </span>
                              <span className="menu-unit">
                                da {money(CUSTOM_PIZZA_BASES[0].price)}
                              </span>
                            </div>
                          </div>

                          <button
                            className="menu-add-button custom-toggle"
                            type="button"
                            onClick={toggleCustomPizzaBuilder}
                            aria-expanded={customPizzaOpen}
                          >
                            {customPizzaOpen ? "â–² Chiudi" : "Configura"}
                          </button>

                          <div
                            className={`custom-pizza-accordion ${
                              customPizzaOpen ? "open" : ""
                            }`}
                          >
                            <hr />
                            <p className="custom-pizza-inner-title">
                              Componi la tua pizza
                            </p>

                            <div className="custom-pizza-group">
                              <span className="custom-pizza-label">
                                Scegli la base
                              </span>
                              <div className="custom-base-grid">
                                {CUSTOM_PIZZA_BASES.map((base) => (
                                  <button
                                    type="button"
                                    className={
                                      base.id === customPizzaBaseId
                                        ? "active"
                                        : ""
                                    }
                                    key={base.id}
                                    onClick={() =>
                                      setCustomPizzaBaseId(base.id)
                                    }
                                  >
                                    <strong>
                                      {base.id === customPizzaBaseId
                                        ? "âœ“ "
                                        : ""}
                                      {base.name}
                                    </strong>
                                    <small>{base.description}</small>
                                    <b>{money(base.price)}</b>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {customPizzaBase && (
                              <>
                                <div className="custom-pizza-group">
                                  <span className="custom-pizza-label">
                                    Aggiungi ingredienti (
                                    {customPizzaToppings.length}/
                                    {CUSTOM_PIZZA_MAX_TOPPINGS})
                                  </span>
                                  <div className="topping-grid">
                                    {CUSTOM_PIZZA_TOPPINGS.map((topping) => (
                                      <button
                                        type="button"
                                        className={
                                          customPizzaToppings.includes(
                                            topping.id,
                                          )
                                            ? "active"
                                            : ""
                                        }
                                        key={topping.id}
                                        onClick={() =>
                                          toggleCustomPizzaTopping(topping.id)
                                        }
                                      >
                                        <span>{topping.name}</span>
                                        <b>+ {money(topping.price)}</b>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <label className="custom-pizza-notes">
                                  Note pizza
                                  <textarea
                                    placeholder="Es. ben cotta, poca mozzarella..."
                                    maxLength={160}
                                    rows="2"
                                    value={customPizzaNotes}
                                    onChange={(event) =>
                                      setCustomPizzaNotes(event.target.value)
                                    }
                                  />
                                </label>

                                <div className="custom-pizza-summary">
                                  <span>
                                    <small>Base {customPizzaBase.name}</small>
                                    <strong>
                                      {money(customPizzaBase.price)}
                                    </strong>
                                  </span>
                                  {customPizzaSelectedToppings.map(
                                    (topping) => (
                                      <span key={topping.id}>
                                        <small>+ {topping.name}</small>
                                        <strong>{money(topping.price)}</strong>
                                      </span>
                                    ),
                                  )}
                                  <b>
                                    <span>Totale pizza</span>
                                    <strong>{money(customPizzaPrice)}</strong>
                                  </b>
                                </div>
                              </>
                            )}

                            <button
                              className="custom-pizza-submit"
                              type="button"
                              onClick={addCustomPizzaToCart}
                              disabled={!customPizzaBase}
                              aria-disabled={!customPizzaBase}
                            >
                              Aggiungi al carrello Â· {money(customPizzaPrice)}
                            </button>
                          </div>
                        </article>
                      )}

                      {activeMenu.items.map((item) => {
                        const cartItem = getCartItem(item._id);

                        return (
                          <article
                            className={[
                              "menu-card",
                              addedItemId === item._id ? "just-added" : "",
                            ].join(" ")}
                            key={item._id}
                          >
                            {addedItemId === item._id && (
                              <span className="added-badge">Aggiunta</span>
                            )}
                            <div className="menu-card-head">
                              <span className="menu-emoji">
                                {item.emoji || "Pizza"}
                              </span>
                              <div>
                                <span className="menu-name">{item.name}</span>
                                <span className="menu-unit">
                                  {money(item.price)} / {item.unit || "pezzo"}
                                </span>
                              </div>
                            </div>
                            <span className="menu-desc">
                              {item.description}
                            </span>
                            {item.featured && (
                              <span className="menu-featured">
                                Piu richiesto
                              </span>
                            )}
                            {cartItem ? (
                              <div className="menu-qty-controls">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item._id)}
                                >
                                  -
                                </button>
                                <strong>{cartItem.qty}</strong>
                                <button
                                  type="button"
                                  onClick={() => addToCart(item)}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                className="menu-add-button"
                                type="button"
                                onClick={() => addToCart(item)}
                              >
                                Aggiungi
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </div>

        <form
          className={`checkout-panel ${mobileCartOpen ? "mobile-open" : ""}`}
          onSubmit={submitOrder}
        >
          <button
            className="drawer-close"
            type="button"
            onClick={() => setMobileCartOpen(false)}
          >
            Chiudi
          </button>
          <div className="section-heading">
            <p className="eyebrow">Ritiro al banco</p>
            <h2>Il tuo asporto</h2>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <p className="empty-cart">Nessun prodotto selezionato</p>
            ) : (
              cart.map((item) => (
                <div className="cart-row" key={item.id}>
                  <div>
                    <span>
                      {item.emoji && (
                        <b className="cart-row-emoji">{item.emoji}</b>
                      )}
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
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                    >
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
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <label>
            Telefono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <p className="privacy-note">
            Usiamo il numero solo per riconoscerti, gestire l'ordine e mostrarti
            i tuoi punti.
          </p>

          {!customerProfile && !customerLookupLoading && (
            <div className="loyalty-card loyalty-empty">
              <div>
                <p className="eyebrow">Tessera banco</p>
                <strong>Ordina con il tuo numero</strong>
                <span>
                  Accumuli punti e ritrovi piu velocemente i tuoi ordini
                  preferiti.
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
                <strong>
                  {customerProfile.customer.name || "Cliente Mucho Gusto"}
                </strong>
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            {!availability ? (
              <p className="slots-empty">Caricamento orari...</p>
            ) : visibleCustomerSlots.length === 0 ? (
              <p className="slots-empty">
                Nessun orario disponibile per questo giorno.
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
            <span>Paghi quando passi a ritirare il sacchetto.</span>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={
              !customer.trim() ||
              !phone.trim() ||
              cart.length === 0 ||
              !selectedSlot
            }
          >
            Conferma ordine Â· {money(total)}
          </button>
        </form>
      </section>

      {mobileCartOpen && (
        <button
          className="drawer-scrim"
          type="button"
          aria-label="Chiudi carrello"
          onClick={() => setMobileCartOpen(false)}
        />
      )}

      {cartCount > 0 && (
        <div className="mobile-cart-bar">
          <div>
            <strong>
              {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"} Â·{" "}
              {money(total)}
            </strong>
            <span>Ritiro al banco</span>
          </div>
          <button type="button" onClick={() => setMobileCartOpen(true)}>
            Vedi ordine
          </button>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}



