import { getBusinessSlug } from "../lib/api";
import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_USER_ROLES,
  MENU_CATEGORY_OPTIONS,
  MENU_UNIT_OPTIONS,
  ORDER_FILTERS,
  PLAN_OPTIONS,
  STATUSES,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "../constants";
import {
  formatDate,
  formatDateTime,
  isFreshOrder,
  isUrgentOrder,
  minutesUntilPickup,
  money,
  slugify,
} from "../utils/format";
import Toast from "../components/Toast";
import useAdminController from "../hooks/useAdminController";
export default function AdminView() {
  const {
    activeAdminSection,
    adminMenu,
    availability,
    businessForm,
    businessSaving,
    businessUserForm,
    businessUserSaving,
    businessUsers,
    changeCouponStatus,
    changeMenuAvailability,
    changeStatus,
    couponForm,
    couponSaving,
    coupons,
    currentBusiness,
    customerSearch,
    customers,
    dashboardStats,
    editBusiness,
    editBusinessUser,
    editCoupon,
    editMenuItem,
    editingBusinessId,
    editingBusinessUserId,
    editingCouponId,
    editingMenuId,
    groupedMenu,
    groupedOrders,
    isGlobalAdmin,
    lastUpdatedAt,
    login,
    logout,
    menuForm,
    menuSaving,
    notify,
    openBusinessUsers,
    orderFilter,
    orderSearch,
    password,
    pickupDate,
    platformBusinesses,
    platformStats,
    recentOrders,
    refresh,
    refreshing,
    removeCoupon,
    removeMenuItem,
    resetBusinessForm,
    resetBusinessUserForm,
    resetCouponForm,
    resetMenuForm,
    saveBusiness,
    saveBusinessUser,
    saveCoupon,
    saveMenuItem,
    saveSettings,
    selectedBusinessForUsers,
    setActiveAdminSection,
    setBusinessUserForm,
    setCustomerSearch,
    setOrderFilter,
    setOrderSearch,
    setPassword,
    setPickupDate,
    setSettingsForm,
    setUsername,
    settingsForm,
    settingsSaving,
    toast,
    token,
    topProductMax,
    topProducts,
    unavailableItems,
    updateBusinessForm,
    updateCouponForm,
    updateMenuForm,
    username,
    visibleAdminNav,
    visibleOrders,
  } = useAdminController();
  if (!token) {
    return (
      <main className="admin-login">
        <form className="login-panel" onSubmit={login}>
          <a href={`/${getBusinessSlug()}`}>Menu cliente</a>
          <h1>Banco admin</h1>
          <input
            placeholder="Email o username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Accedi</button>
        </form>
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">
            {currentBusiness?.name || "Platform"}
          </p>
          <strong>Banco admin</strong>
          <span className="admin-business-slug">
            {getBusinessSlug()}
          </span>
        </div>
        <nav>
          {visibleAdminNav.map((item) => (
            <button
              className={activeAdminSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setActiveAdminSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <a href={`/${getBusinessSlug()}`}>Menu cliente</a>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">
              {activeAdminSection === "businesses"
                ? "Controllo piattaforma"
                : `Operativita ${currentBusiness?.name || getBusinessSlug()}`}
            </p>
            <h1>
              {visibleAdminNav.find((item) => item.id === activeAdminSection)?.label}
            </h1>
          </div>
          <div className="admin-actions">
            <span className="refresh-note">
              {lastUpdatedAt ? `Aggiornato ${lastUpdatedAt}` : "Non aggiornato"}
            </span>
            <button type="button" onClick={refresh} disabled={refreshing}>
              {refreshing ? "Aggiorno..." : "Aggiorna"}
            </button>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {isGlobalAdmin && activeAdminSection === "businesses" && (
          <>
            <section className="admin-stats-grid">
              <article>
                <span>Business</span>
                <strong>{platformStats.businesses}</strong>
              </article>
              <article>
                <span>Attivi</span>
                <strong>{platformStats.active}</strong>
              </article>
              <article>
                <span>Ordini totali</span>
                <strong>{platformStats.orders}</strong>
              </article>
              <article>
                <span>GMV stimato</span>
                <strong>{money(platformStats.revenue)}</strong>
              </article>
            </section>

            <section className="admin-menu-manager">
              <form className="menu-editor-panel" onSubmit={saveBusiness}>
                <div className="section-heading">
                  <p className="eyebrow">Platform admin</p>
                  <h2>
                    {editingBusinessId
                      ? "Modifica business"
                      : "Nuovo business"}
                  </h2>
                </div>

                <div className="menu-editor-grid">
                  <label>
                    Nome attivita
                    <input
                      value={businessForm.name}
                      onChange={(event) =>
                        updateBusinessForm("name", event.target.value)
                      }
                      placeholder="Es. Mucho Gusto"
                    />
                  </label>
                  <label>
                    Slug app
                    <input
                      value={businessForm.slug}
                      onChange={(event) =>
                        updateBusinessForm("slug", event.target.value)
                      }
                      placeholder="mucho-gusto"
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={businessForm.type}
                      onChange={(event) =>
                        updateBusinessForm("type", event.target.value)
                      }
                    >
                      {BUSINESS_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Piano
                    <select
                      value={businessForm.plan}
                      onChange={(event) =>
                        updateBusinessForm("plan", event.target.value)
                      }
                    >
                      {PLAN_OPTIONS.map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Stato
                    <select
                      value={businessForm.subscriptionStatus}
                      onChange={(event) =>
                        updateBusinessForm(
                          "subscriptionStatus",
                          event.target.value,
                        )
                      }
                    >
                      {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nome pubblico
                    <input
                      value={businessForm.publicName}
                      onChange={(event) =>
                        updateBusinessForm("publicName", event.target.value)
                      }
                      placeholder="Nome visibile ai clienti"
                    />
                  </label>
                  <label>
                    Nome owner
                    <input
                      value={businessForm.ownerName}
                      onChange={(event) =>
                        updateBusinessForm("ownerName", event.target.value)
                      }
                      placeholder="Mario Rossi"
                    />
                  </label>
                  <label>
                    Email owner
                    <input
                      value={businessForm.ownerEmail}
                      onChange={(event) =>
                        updateBusinessForm("ownerEmail", event.target.value)
                      }
                      placeholder="owner@locale.it"
                    />
                  </label>
                  <label>
                    Password temporanea owner
                    <input
                      type="password"
                      value={businessForm.ownerPassword}
                      onChange={(event) =>
                        updateBusinessForm("ownerPassword", event.target.value)
                      }
                      placeholder={
                        editingBusinessId
                          ? "Lascia vuota per non cambiarla"
                          : "Minimo 8 caratteri"
                      }
                    />
                  </label>
                  <label>
                    URL Vercel
                    <input
                      value={businessForm.publicUrl}
                      onChange={(event) =>
                        updateBusinessForm("publicUrl", event.target.value)
                      }
                      placeholder="https://mucho-gusto.vercel.app"
                    />
                  </label>
                  <label>
                    Vercel project
                    <input
                      value={businessForm.vercelProjectName}
                      onChange={(event) =>
                        updateBusinessForm(
                          "vercelProjectName",
                          event.target.value,
                        )
                      }
                      placeholder="mucho-gusto"
                    />
                  </label>
                  <label>
                    API base URL
                    <input
                      value={businessForm.apiBaseUrl}
                      onChange={(event) =>
                        updateBusinessForm("apiBaseUrl", event.target.value)
                      }
                      placeholder="https://mucho-gusto-mg5y.onrender.com/api"
                    />
                  </label>
                  <label>
                    Orari
                    <input
                      value={businessForm.openingHours}
                      onChange={(event) =>
                        updateBusinessForm("openingHours", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="business-color-row">
                  <label>
                    Colore primario
                    <input
                      type="color"
                      value={businessForm.primaryColor}
                      onChange={(event) =>
                        updateBusinessForm("primaryColor", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Colore accento
                    <input
                      type="color"
                      value={businessForm.accentColor}
                      onChange={(event) =>
                        updateBusinessForm("accentColor", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label>
                  Messaggio pubblico
                  <textarea
                    value={businessForm.publicMessage}
                    onChange={(event) =>
                      updateBusinessForm("publicMessage", event.target.value)
                    }
                    placeholder="Es. Siamo chiusi per ferie"
                  />
                </label>

                <div className="business-feature-grid">
                  {[
                    ["ordering", "Ordini"],
                    ["seedTemplate", "Menu demo automatico"],
                    ["customPizza", "Pizza su misura"],
                    ["coupons", "Coupon"],
                    ["booking", "Booking"],
                    ["rental", "Rental"],
                  ].map(([field, label]) => (
                    <label className="menu-featured-check" key={field}>
                      <input
                        checked={Boolean(businessForm[field])}
                        type="checkbox"
                        onChange={(event) =>
                          updateBusinessForm(field, event.target.checked)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="business-env-preview">
                  <span>Env Vercel per questa app</span>
                  <code>
                    VITE_BUSINESS_SLUG=
                    {slugify(businessForm.slug || businessForm.name) ||
                      "nome-business"}
                  </code>
                </div>

                <div className="menu-editor-actions">
                  <button type="submit" disabled={businessSaving}>
                    {businessSaving
                      ? "Salvataggio..."
                      : editingBusinessId
                        ? "Salva business"
                        : "Crea business"}
                  </button>
                  {editingBusinessId && (
                    <button type="button" onClick={resetBusinessForm}>
                      Annulla
                    </button>
                  )}
                </div>
              </form>

              <div className="menu-admin-list">
                <div className="section-heading">
                  <p className="eyebrow">Tenant SaaS</p>
                  <h2>Business gestiti</h2>
                </div>
                {platformBusinesses.length === 0 ? (
                  <p className="muted">Nessun business creato.</p>
                ) : (
                  <div className="business-admin-list">
                    {platformBusinesses.map((business) => (
                      <article className="business-admin-card" key={business._id}>
                        <div>
                          <span
                            className="business-swatch"
                            style={{
                              background:
                                business.branding?.primaryColor || "#2C5F2E",
                            }}
                          />
                          <strong>{business.name}</strong>
                          <small>
                            {business.slug} Â· {business.type} Â· {business.plan}
                          </small>
                          <small>
                            Owner: {business.owner?.email || "non impostato"}
                          </small>
                        </div>
                        <div className="business-card-metrics">
                          <span>
                            <b>{business.metrics?.orders || 0}</b>
                            ordini
                          </span>
                          <span>
                            <b>{money(business.metrics?.revenue || 0)}</b>
                            GMV
                          </span>
                          <span>
                            <b>{business.metrics?.products || 0}</b>
                            prodotti
                          </span>
                          <span>
                            <b>{business.metrics?.customers || 0}</b>
                            clienti
                          </span>
                        </div>
                        <div className="business-deploy-box">
                          <code>VITE_BUSINESS_SLUG={business.slug}</code>
                          <a
                            href={`/${business.slug}/admin`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Apri admin app
                          </a>
                        </div>
                        <div className="menu-admin-actions">
                          <a
                            className="admin-action-link"
                            href={`/${business.slug}/admin`}
                          >
                            Gestisci
                          </a>
                          <a
                            className="admin-action-link"
                            href={`/${business.slug}`}
                          >
                            Anteprima
                          </a>
                          <button
                            type="button"
                            onClick={() => editBusiness(business)}
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => openBusinessUsers(business)}
                          >
                            Utenti
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                `VITE_BUSINESS_SLUG=${business.slug}`,
                              );
                              notify("Variabile Vercel copiata.");
                            }}
                          >
                            Copia env
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {selectedBusinessForUsers && (
                <div className="menu-admin-list">
                  <div className="section-heading">
                    <p className="eyebrow">Accessi business</p>
                    <h2>Utenti {selectedBusinessForUsers.name}</h2>
                  </div>
                  <form className="settings-form" onSubmit={saveBusinessUser}>
                    <label>
                      Nome
                      <input
                        value={businessUserForm.name}
                        onChange={(event) =>
                          setBusinessUserForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Email
                      <input
                        value={businessUserForm.email}
                        onChange={(event) =>
                          setBusinessUserForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Ruolo
                      <select
                        value={businessUserForm.role}
                        onChange={(event) =>
                          setBusinessUserForm((current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                      >
                        {BUSINESS_USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Password temporanea
                      <input
                        type="password"
                        value={businessUserForm.password}
                        onChange={(event) =>
                          setBusinessUserForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder={
                          editingBusinessUserId
                            ? "Lascia vuota per non cambiarla"
                            : "Minimo 8 caratteri"
                        }
                      />
                    </label>
                    <label className="menu-featured-check">
                      <input
                        checked={businessUserForm.active}
                        type="checkbox"
                        onChange={(event) =>
                          setBusinessUserForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                      />
                      Utente attivo
                    </label>
                    <div className="menu-editor-actions">
                      <button type="submit" disabled={businessUserSaving}>
                        {businessUserSaving
                          ? "Salvataggio..."
                          : editingBusinessUserId
                            ? "Salva utente"
                            : "Crea utente"}
                      </button>
                      {editingBusinessUserId && (
                        <button type="button" onClick={resetBusinessUserForm}>
                          Annulla
                        </button>
                      )}
                    </div>
                  </form>
                  <div className="business-admin-list">
                    {businessUsers.length === 0 ? (
                      <p className="muted">Nessun utente creato.</p>
                    ) : (
                      businessUsers.map((user) => (
                        <article className="business-admin-card" key={user._id}>
                          <div>
                            <span className="business-swatch" />
                            <strong>{user.name || user.email}</strong>
                            <small>
                              {user.email} - {user.role} -{" "}
                              {user.active ? "attivo" : "disattivato"}
                            </small>
                          </div>
                          <div className="menu-admin-actions">
                            <button
                              type="button"
                              onClick={() => editBusinessUser(user)}
                            >
                              Modifica
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {(activeAdminSection === "dashboard" ||
          activeAdminSection === "orders") && (
          <section className="admin-stats-grid">
            <article>
              <span>Ordini oggi</span>
              <strong>{dashboardStats.total}</strong>
            </article>
            <article>
              <span>Incasso</span>
              <strong>{money(dashboardStats.revenue)}</strong>
            </article>
            <article>
              <span>In attesa</span>
              <strong>{dashboardStats.pending}</strong>
            </article>
            <article>
              <span>Ritirati</span>
              <strong>{dashboardStats.done}</strong>
            </article>
          </section>
        )}

        {activeAdminSection === "dashboard" && (
          <section className="admin-dashboard-grid">
            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Oggi al banco</p>
                <h2>Ordini in arrivo</h2>
              </div>
              <div className="admin-table">
                {recentOrders.length === 0 ? (
                  <p className="muted">Nessun ordine registrato oggi.</p>
                ) : (
                  recentOrders.map((order) => (
                    <article
                      className={`compact-order ${isUrgentOrder(order) ? "urgent" : ""}`}
                      key={order._id}
                    >
                      <div>
                        <strong>{order.customer}</strong>
                        <span>
                          {order.pickupTime} Â· {money(order.total)}
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
                  <p className="muted">Ancora nessun prodotto venduto oggi.</p>
                ) : (
                  topProducts.map((item) => (
                    <span className="top-product-row" key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <b>
                          {item.qty} pz Â· {money(item.revenue)}
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
        )}

        {activeAdminSection === "orders" && (
          <>
            <section className="admin-toolbar">
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
                <p className="muted">Nessun ordine con questi filtri.</p>
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
                            {isFreshOrder(order)
                              ? "Nuovo"
                              : STATUSES[order.status]}
                          </span>
                        </div>
                        <div className="order-meta">
                          <span>{order.phone || "Telefono non inserito"}</span>
                          <span>
                            {order.pickupDate} Â· {order.pickupTime}
                          </span>
                          <strong>{money(order.total)}</strong>
                        </div>
                        <p>
                          {(order.items || [])
                            .map((item) => `${item.qty}x ${item.name}`)
                            .join(" | ")}
                        </p>
                        {order.notes && (
                          <p className="order-note">{order.notes}</p>
                        )}
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
                        <div className="status-buttons">
                          {Object.keys(STATUSES).map((status) => (
                            <button
                              className={
                                order.status === status ? "active" : ""
                              }
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
        )}

        {activeAdminSection === "menu" && (
          <section className="admin-menu-manager">
            <form className="menu-editor-panel" onSubmit={saveMenuItem}>
              <div className="section-heading">
                <p className="eyebrow">Gestione menu</p>
                <h2>
                  {editingMenuId ? "Modifica prodotto" : "Aggiungi prodotto"}
                </h2>
              </div>

              <div className="menu-editor-grid">
                <label>
                  Nome prodotto
                  <input
                    value={menuForm.name}
                    onChange={(event) =>
                      updateMenuForm("name", event.target.value)
                    }
                    placeholder="Es. Margherita"
                  />
                </label>
                <label>
                  Prezzo
                  <input
                    min="0"
                    step="0.1"
                    type="number"
                    value={menuForm.price}
                    onChange={(event) =>
                      updateMenuForm("price", event.target.value)
                    }
                    placeholder="6.00"
                  />
                </label>
                <label>
                  Categoria
                  <select
                    value={menuForm.category}
                    onChange={(event) =>
                      updateMenuForm("category", event.target.value)
                    }
                  >
                    {MENU_CATEGORY_OPTIONS.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Unita
                  <select
                    value={menuForm.unit}
                    onChange={(event) =>
                      updateMenuForm("unit", event.target.value)
                    }
                  >
                    {MENU_UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Emoji
                  <input
                    value={menuForm.emoji}
                    onChange={(event) =>
                      updateMenuForm("emoji", event.target.value)
                    }
                    placeholder="ðŸ•"
                  />
                </label>
                <label>
                  Ordine
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={menuForm.sortOrder}
                    onChange={(event) =>
                      updateMenuForm("sortOrder", event.target.value)
                    }
                    placeholder="10"
                  />
                </label>
              </div>

              <label>
                Immagine prodotto
                <input
                  value={menuForm.imageUrl}
                  onChange={(event) =>
                    updateMenuForm("imageUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>

              <label>
                Descrizione ingredienti
                <textarea
                  value={menuForm.description}
                  onChange={(event) =>
                    updateMenuForm("description", event.target.value)
                  }
                  placeholder="Pomodoro, mozzarella, basilico"
                />
              </label>

              <div className="menu-editor-grid">
                <label>
                  Tag
                  <input
                    value={menuForm.tags}
                    onChange={(event) =>
                      updateMenuForm("tags", event.target.value)
                    }
                    placeholder="vegetariana, classica"
                  />
                </label>
                <label>
                  Allergeni
                  <input
                    value={menuForm.allergens}
                    onChange={(event) =>
                      updateMenuForm("allergens", event.target.value)
                    }
                    placeholder="glutine, latte"
                  />
                </label>
              </div>

              <label className="menu-featured-check">
                <input
                  checked={menuForm.featured}
                  type="checkbox"
                  onChange={(event) =>
                    updateMenuForm("featured", event.target.checked)
                  }
                />
                Segna come piu richiesta / novita
              </label>

              <div className="menu-editor-actions">
                <button type="submit" disabled={menuSaving}>
                  {menuSaving
                    ? "Salvataggio..."
                    : editingMenuId
                      ? "Salva modifiche"
                      : "Aggiungi al menu"}
                </button>
                {editingMenuId && (
                  <button type="button" onClick={resetMenuForm}>
                    Annulla modifica
                  </button>
                )}
              </div>
            </form>

            <div className="menu-admin-list">
              <div className="section-heading">
                <p className="eyebrow">Prodotti pubblicati</p>
                <h2>Menu della pizzeria</h2>
              </div>
              {MENU_CATEGORY_OPTIONS.map((category) => {
                const items = groupedMenu[category.value] || [];
                if (items.length === 0) return null;

                return (
                  <section className="menu-admin-category" key={category.value}>
                    <h3>{category.label}</h3>
                    <div className="menu-admin-items">
                      {items.map((item) => (
                        <article
                          className={`menu-admin-item ${item.available ? "" : "off"}`}
                          key={item._id}
                        >
                          <div>
                            <strong>
                              {item.emoji || "ðŸ•"} {item.name}
                            </strong>
                            {item.imageUrl && (
                              <img
                                className="menu-admin-thumb"
                                src={item.imageUrl}
                                alt=""
                              />
                            )}
                            <span>
                              {item.description || "Senza descrizione"}
                            </span>
                            <small>
                              {money(item.price)} Â· {item.unit || "pezzo"} Â·
                              ordine {item.sortOrder || 0}
                            </small>
                          </div>
                          <div className="menu-admin-actions">
                            <button
                              type="button"
                              onClick={() => editMenuItem(item)}
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              onClick={() => changeMenuAvailability(item._id)}
                            >
                              {item.available ? "Nascondi" : "Mostra"}
                            </button>
                            <button
                              className="danger"
                              type="button"
                              onClick={() => removeMenuItem(item._id)}
                            >
                              Elimina
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        )}

        {activeAdminSection === "availability" && (
          <section className="admin-dashboard-grid">
            <div className="admin-panel wide">
              <div className="section-heading">
                <p className="eyebrow">Disponibilita prodotti</p>
                <h2>Esauriti o nascosti</h2>
              </div>
              <div className="availability-list">
                {adminMenu.length === 0 ? (
                  <p className="muted">Menu non ancora caricato.</p>
                ) : (
                  adminMenu.map((item) => (
                    <article
                      className={item.available ? "" : "off"}
                      key={item._id}
                    >
                      <div>
                        <strong>
                          {item.emoji || "ðŸ•"} {item.name}
                        </strong>
                        <span>
                          {item.available
                            ? "Visibile ai clienti"
                            : "Nascosto / esaurito"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => changeMenuAvailability(item._id)}
                      >
                        {item.available ? "Segna esaurito" : "Rendi ordinabile"}
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
            <div className="admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Riepilogo</p>
                <h2>Stato menu</h2>
              </div>
              <div className="top-products">
                <span>
                  <strong>Prodotti attivi</strong>
                  <b>{adminMenu.length - unavailableItems.length}</b>
                </span>
                <span>
                  <strong>Non ordinabili</strong>
                  <b>{unavailableItems.length}</b>
                </span>
                <span>
                  <strong>Categorie</strong>
                  <b>{MENU_CATEGORY_OPTIONS.length}</b>
                </span>
              </div>
            </div>
          </section>
        )}

        {activeAdminSection === "customers" && (
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
                <p className="muted">Nessun cliente trovato.</p>
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
        )}

        {activeAdminSection === "coupons" && (
          <section className="admin-menu-manager">
            <form className="menu-editor-panel" onSubmit={saveCoupon}>
              <div className="section-heading">
                <p className="eyebrow">Coupon e offerte</p>
                <h2>{editingCouponId ? "Modifica coupon" : "Nuovo coupon"}</h2>
              </div>
              <div className="menu-editor-grid">
                <label>
                  Codice
                  <input
                    value={couponForm.code}
                    onChange={(event) =>
                      updateCouponForm("code", event.target.value)
                    }
                    placeholder="PIZZA10"
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={couponForm.type}
                    onChange={(event) =>
                      updateCouponForm("type", event.target.value)
                    }
                  >
                    <option value="percent">Percentuale</option>
                    <option value="fixed">Importo fisso</option>
                  </select>
                </label>
                <label>
                  Valore
                  <input
                    min="0"
                    step="0.1"
                    type="number"
                    value={couponForm.value}
                    onChange={(event) =>
                      updateCouponForm("value", event.target.value)
                    }
                  />
                </label>
                <label>
                  Scadenza
                  <input
                    type="date"
                    value={couponForm.expiresAt}
                    onChange={(event) =>
                      updateCouponForm("expiresAt", event.target.value)
                    }
                  />
                </label>
                <label>
                  Limite utilizzi
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={couponForm.usageLimit}
                    onChange={(event) =>
                      updateCouponForm("usageLimit", event.target.value)
                    }
                    placeholder="0 = illimitato"
                  />
                </label>
              </div>
              <label className="menu-featured-check">
                <input
                  checked={couponForm.active}
                  type="checkbox"
                  onChange={(event) =>
                    updateCouponForm("active", event.target.checked)
                  }
                />
                Coupon attivo
              </label>
              <div className="menu-editor-actions">
                <button type="submit" disabled={couponSaving}>
                  {couponSaving
                    ? "Salvataggio..."
                    : editingCouponId
                      ? "Salva coupon"
                      : "Crea coupon"}
                </button>
                {editingCouponId && (
                  <button type="button" onClick={resetCouponForm}>
                    Annulla
                  </button>
                )}
              </div>
            </form>

            <div className="menu-admin-list">
              <div className="section-heading">
                <p className="eyebrow">Offerte attive</p>
                <h2>Codici sconto</h2>
              </div>
              {coupons.length === 0 ? (
                <p className="muted">Nessun coupon creato.</p>
              ) : (
                <div className="menu-admin-items">
                  {coupons.map((coupon) => (
                    <article
                      className={`menu-admin-item ${coupon.active ? "" : "off"}`}
                      key={coupon._id}
                    >
                      <div>
                        <strong>{coupon.code}</strong>
                        <span>
                          {coupon.type === "percent"
                            ? `${coupon.value}%`
                            : money(coupon.value)}
                          {coupon.expiresAt
                            ? ` Â· fino al ${coupon.expiresAt}`
                            : " Â· senza scadenza"}
                        </span>
                        <small>
                          {coupon.usedCount || 0}/{coupon.usageLimit || "âˆž"}{" "}
                          utilizzi
                        </small>
                      </div>
                      <div className="menu-admin-actions">
                        <button
                          type="button"
                          onClick={() => editCoupon(coupon)}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => changeCouponStatus(coupon._id)}
                        >
                          {coupon.active ? "Disattiva" : "Attiva"}
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => removeCoupon(coupon._id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeAdminSection === "settings" && (
          <section className="admin-panel settings-panel">
            <div className="section-heading">
              <p className="eyebrow">Locale</p>
              <h2>Impostazioni operative</h2>
            </div>
            <form className="settings-form" onSubmit={saveSettings}>
              <label>
                Orari apertura
                <input
                  value={settingsForm.openingHours}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      openingHours: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Costo consegna
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={settingsForm.deliveryCost}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      deliveryCost: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Ordine minimo
                <input
                  min="0"
                  step="0.1"
                  type="number"
                  value={settingsForm.minimumOrder}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      minimumOrder: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Zone servite
                <input
                  value={settingsForm.serviceZones}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      serviceZones: event.target.value,
                    }))
                  }
                  placeholder="Centro, San Paolo, Eur"
                />
              </label>
              <label className="settings-full">
                Messaggio temporaneo
                <textarea
                  value={settingsForm.customerMessage}
                  onChange={(event) =>
                    setSettingsForm((current) => ({
                      ...current,
                      customerMessage: event.target.value,
                    }))
                  }
                  placeholder="Siamo chiusi per ferie"
                />
              </label>
              <button type="submit" disabled={settingsSaving}>
                {settingsSaving ? "Salvataggio..." : "Salva impostazioni"}
              </button>
            </form>
          </section>
        )}
      </section>

      <Toast message={toast} />
    </main>
  );
}



