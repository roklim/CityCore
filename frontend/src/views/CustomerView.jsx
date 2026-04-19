import {
  BUSINESS_TYPE_OPTIONS,
  CUSTOM_PIZZA_BASES,
  CUSTOM_PIZZA_MAX_TOPPINGS,
  CUSTOM_PIZZA_TOPPINGS,
  LOYALTY_GOAL,
  PUBLIC_STATUS_LABELS,
  QUICK_FILTERS,
} from "../constants";
import {
  businessAdminHref,
  businessHref,
  formatDate,
  getSlotHint,
  isCounterOpenNow,
  money,
  orderTrackingHref,
} from "../utils/format";
import { getBusinessSlug } from "../lib/api";
import Toast from "../components/Toast";
import useCustomerController from "../hooks/useCustomerController";

function getBusinessTypeLabel(type) {
  return (
    BUSINESS_TYPE_OPTIONS.find((option) => option.value === type)?.label ||
    "Attivita locale"
  );
}

function getBusinessInitials(name) {
  return String(name || "C")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getBusinessHeroCopy(business) {
  const type = business?.type || "pizzeria";
  const name = business?.branding?.publicName || business?.name || "Mucho Gusto";
  const typeLabel = getBusinessTypeLabel(type);

  if (type === "sushi") {
    return {
      eyebrow: `${name} - ${typeLabel}`,
      title: "Ordina i tuoi piatti preferiti, scegli l'orario e ritira al banco.",
      subtitle:
        "Sfoglia il menu, aggiungi cio che vuoi e passa a ritirare quando e pronto.",
    };
  }

  if (["pizzeria", "restaurant"].includes(type)) {
    return {
      eyebrow: `${name} - ${typeLabel}`,
      title: "Tranci caldi, teglie fumanti e pizze pronte per l'asporto.",
      subtitle:
        "Scegli dal menu, prenota l'orario, passa al banco e paga al ritiro.",
    };
  }

  return {
    eyebrow: `${name} - ${typeLabel}`,
    title: "Scopri prodotti e servizi, scegli l'orario e completa la richiesta.",
    subtitle:
      "Consulta la disponibilita, prepara la richiesta e segui tutto da questa pagina.",
  };
}

function MenuSkeleton() {
  return (
    <div className="menu-skeleton" aria-label="Caricamento menu">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="menu-skeleton-card" key={index}>
          <i />
          <span />
          <strong />
          <p />
          <b />
        </article>
      ))}
    </div>
  );
}

export default function CustomerView() {
  const {
    activeFilters,
    activeMenu,
    activeMenuSection,
    addCustomPizzaToCart,
    addToCart,
    addedItemId,
    availability,
    availabilityLoading,
    cart,
    cartCount,
    confirmation,
    currentBusiness,
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
    loadPublicData,
    loading,
    loyaltyCyclePoints,
    loyaltyPoints,
    loyaltyRemaining,
    menuBySection,
    menuError,
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

  const businessName =
    currentBusiness?.branding?.publicName ||
    currentBusiness?.name ||
    "Mucho Gusto";
  const businessSlug = currentBusiness?.slug || getBusinessSlug();
  const businessTypeLabel = getBusinessTypeLabel(currentBusiness?.type);
  const heroCopy = getBusinessHeroCopy(currentBusiness);
  const businessPrimary =
    currentBusiness?.branding?.primaryColor || "var(--mg-basil)";
  const businessAccent =
    currentBusiness?.branding?.accentColor || "var(--mg-tomato)";
  const businessLogoUrl = currentBusiness?.branding?.logoUrl || "";
  const openingHours =
    currentBusiness?.settings?.openingHours || "Orari in aggiornamento";
  const publicMessage = currentBusiness?.settings?.publicMessage || "";
  const counterOpen = isCounterOpenNow();
  const customPizzaEnabled =
    currentBusiness?.features?.customPizza !== false &&
    ["pizzeria", "restaurant"].includes(currentBusiness?.type || "pizzeria");
  const checkoutDisabled =
    !customer.trim() || !phone.trim() || cart.length === 0 || !selectedSlot;

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
            <a href="/">Tutte le attivita</a>
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
    <main
      className="customer-shell"
      style={{
        "--business-primary": businessPrimary,
        "--business-accent": businessAccent,
      }}
    >
      <header className="business-public-header">
        <a
          className="business-home-link"
          href="/"
          aria-label="Torna a tutte le attivita Cagli"
        >
          <span aria-hidden="true">&lt;</span>
          Tutte le attivita
        </a>
        <a className="business-header-brand" href={businessHref(businessSlug)}>
          {businessLogoUrl ? (
            <img src={businessLogoUrl} alt="" loading="lazy" />
          ) : (
            <span>{getBusinessInitials(businessName)}</span>
          )}
          <div>
            <strong>{businessName}</strong>
            <small>{businessTypeLabel}</small>
          </div>
        </a>
        <div className="business-header-actions">
          <span className={`business-status-pill ${counterOpen ? "open" : "closed"}`}>
            {counterOpen ? "Aperto" : "Chiuso"}
          </span>
          <a href={businessAdminHref(businessSlug)}>Admin</a>
        </div>
      </header>
      <section className="brand-panel">
        <span
          className={`counter-badge ${counterOpen ? "open" : "closed"}`}
        >
          {counterOpen
            ? "Banco aperto - ordina ora"
            : "Chiuso - riapre stasera alle 18:00"}
        </span>
        <p className="eyebrow">{heroCopy.eyebrow}</p>
        <h1>{heroCopy.title}</h1>
        <p className="lead">{heroCopy.subtitle}</p>
        <div className="opening-hours-card">
          <span>Orari di apertura</span>
          <strong>{openingHours}</strong>
          {publicMessage && <p>{publicMessage}</p>}
          <a href="/">Torna a tutte le attivita</a>
        </div>
        <div className="hero-actions">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("menu")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ordina ora -&gt;
          </button>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("recover-order")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Recupera il tuo ordine
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
            <MenuSkeleton />
          ) : menuError ? (
            <div className="menu-state-card error">
              <p className="eyebrow">Menu non disponibile</p>
              <h3>Non riusciamo a caricare il menu</h3>
              <p>{menuError}</p>
              <div>
                <button type="button" onClick={loadPublicData}>
                  Riprova
                </button>
                <a href="/">Torna alla home</a>
              </div>
            </div>
          ) : menu.length === 0 ? (
            <div className="menu-state-card">
              <p className="eyebrow">Menu in aggiornamento</p>
              <h3>Menu non ancora disponibile</h3>
              <p>
                Il locale sta aggiornando i prodotti. Riprova piu tardi o torna
                alle attivita di Cagli.
              </p>
              <a href="/">Torna alle attivita</a>
            </div>
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
                          (activeMenu.id === "pizze-tonde" && customPizzaEnabled
                            ? 1
                            : 0)}{" "}
                        prodotti
                      </strong>
                    </div>

                    <div className="menu-grid">
                      {activeMenu.id === "pizze-tonde" && customPizzaEnabled && (
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
                            <span className="menu-emoji">{"\u{1F355}"}</span>
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
                            {customPizzaOpen ? "Chiudi" : "Configura"}
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
                                        ? "Scelta - "
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
                              Aggiungi al carrello - {money(customPizzaPrice)}
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
            <span>Paghi quando passi a ritirare il sacchetto.</span>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={checkoutDisabled}
            aria-disabled={checkoutDisabled}
          >
            Conferma ordine - {money(total)}
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
              {cartCount} {cartCount === 1 ? "prodotto" : "prodotti"} -{" "}
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



