import {
  CUSTOM_PIZZA_BASES,
  CUSTOM_PIZZA_MAX_TOPPINGS,
  CUSTOM_PIZZA_TOPPINGS,
  QUICK_FILTERS,
} from "../../constants";
import { money } from "../../utils/format";
import InlineNotice from "../ui/InlineNotice";
import MenuSkeleton from "./MenuSkeleton";
import MenuStateCard from "./MenuStateCard";

export default function CustomerMenuArea({
  activeFilters,
  activeMenu,
  activeMenuSection,
  addCustomPizzaToCart,
  addToCart,
  addedItemId,
  customPizzaBase,
  customPizzaBaseId,
  customPizzaEnabled,
  customPizzaNotes,
  customPizzaOpen,
  customPizzaPrice,
  customPizzaRef,
  customPizzaSelectedToppings,
  customPizzaToppings,
  getCartItem,
  loadPublicData,
  loading,
  menu,
  menuBySection,
  menuError,
  removeFromCart,
  searchTerm,
  setActiveFilters,
  setActiveMenuSection,
  setCustomPizzaBaseId,
  setCustomPizzaNotes,
  setSearchTerm,
  toggleCustomPizzaBuilder,
  toggleCustomPizzaTopping,
  toggleFilter,
}) {
  const hasActiveSearch = searchTerm.trim().length > 0;
  const hasActiveFilters = activeFilters.length > 0;
  const resultCount = menuBySection.reduce(
    (total, section) => total + section.items.length,
    0,
  );

  return (
    <div className="menu-area">
      <div className="section-heading">
        <p className="eyebrow">Menu</p>
        <h2>Il banco di oggi</h2>
      </div>

      {loading ? (
        <MenuSkeleton />
      ) : menuError ? (
        <MenuStateCard
          tone="error"
          eyebrow="Menu non disponibile"
          title="Non riusciamo a caricare il menu"
          description={menuError}
          action={
            <>
              <button type="button" onClick={loadPublicData}>
                Riprova
              </button>
              <a href="/">Torna alla home</a>
            </>
          }
        />
      ) : menu.length === 0 ? (
        <MenuStateCard
          eyebrow="Menu in aggiornamento"
          title="Menu non ancora disponibile"
          description="Il locale sta aggiornando i prodotti. Riprova piu tardi o torna alle attivita di Cagli."
          action={<a href="/">Torna alle attivita</a>}
        />
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
                  className={activeFilters.includes(filter.id) ? "active" : ""}
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {(hasActiveSearch || hasActiveFilters) && (
              <div className="menu-filter-summary">
                <span>
                  {resultCount} prodotti trovati
                  {hasActiveSearch ? ` per "${searchTerm.trim()}"` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveFilters([]);
                  }}
                >
                  Azzera filtri
                </button>
              </div>
            )}
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
            <InlineNotice
              title="Nessun prodotto trovato"
              description="Prova a cambiare ricerca o rimuovere i filtri attivi."
            />
          ) : (
            activeMenu && (
              <section
                className="menu-section"
                id={`menu-${activeMenu.id}`}
                key={activeMenuSection}
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
                        String(addedItemId).startsWith("custom-pizza")
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
                                  base.id === customPizzaBaseId ? "active" : ""
                                }
                                key={base.id}
                                onClick={() => setCustomPizzaBaseId(base.id)}
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
                                Aggiungi ingredienti ({customPizzaToppings.length}
                                /{CUSTOM_PIZZA_MAX_TOPPINGS})
                              </span>
                              <div className="topping-grid">
                                {CUSTOM_PIZZA_TOPPINGS.map((topping) => (
                                  <button
                                    type="button"
                                    className={
                                      customPizzaToppings.includes(topping.id)
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
                                <strong>{money(customPizzaBase.price)}</strong>
                              </span>
                              {customPizzaSelectedToppings.map((topping) => (
                                <span key={topping.id}>
                                  <small>+ {topping.name}</small>
                                  <strong>{money(topping.price)}</strong>
                                </span>
                              ))}
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
                        <span className="menu-desc">{item.description}</span>
                        {item.featured && (
                          <span className="menu-featured">Piu richiesto</span>
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
                            <button type="button" onClick={() => addToCart(item)}>
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
  );
}
