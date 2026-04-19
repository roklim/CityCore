import { getBusinessSlug } from "../lib/api";
import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_USER_ROLES,
  PLAN_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "../constants";
import { money, slugify } from "../utils/format";
import Toast from "../components/Toast";
import useAdminController from "../hooks/useAdminController";
import AdminAvailabilitySection from "../components/admin/AdminAvailabilitySection";
import AdminCouponsSection from "../components/admin/AdminCouponsSection";
import AdminCustomersSection from "../components/admin/AdminCustomersSection";
import AdminDashboardSection from "../components/admin/AdminDashboardSection";
import AdminHeader from "../components/admin/AdminHeader";
import AdminMenuSection from "../components/admin/AdminMenuSection";
import AdminOrdersSection from "../components/admin/AdminOrdersSection";
import AdminSettingsSection from "../components/admin/AdminSettingsSection";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminStatsGrid from "../components/admin/AdminStatsGrid";
import InlineNotice from "../components/ui/InlineNotice";
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
    setUsername,
    settingsForm,
    settingsSaving,
    toast,
    toggleOpeningDay,
    token,
    topProductMax,
    topProducts,
    unavailableItems,
    updateBusinessForm,
    updateCouponForm,
    updateMenuForm,
    updateSettingsForm,
    applyOpeningPreset,
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
      <AdminSidebar
        activeSection={activeAdminSection}
        businessName={currentBusiness?.name || "Platform"}
        businessSlug={getBusinessSlug()}
        navItems={visibleAdminNav}
        onSelect={setActiveAdminSection}
      />

      <section className="admin-main">
        <AdminHeader
          activeLabel={
            visibleAdminNav.find((item) => item.id === activeAdminSection)
              ?.label
          }
          contextLabel={
            activeAdminSection === "businesses"
              ? "Controllo piattaforma"
              : `Operativita ${currentBusiness?.name || getBusinessSlug()}`
          }
          lastUpdatedAt={lastUpdatedAt}
          onDateChange={setPickupDate}
          onLogout={logout}
          onRefresh={refresh}
          pickupDate={pickupDate}
          refreshing={refreshing}
        />

        {isGlobalAdmin && activeAdminSection === "businesses" && (
          <>
            <AdminStatsGrid
              items={[
                { label: "Business", value: platformStats.businesses },
                { label: "Attivi", value: platformStats.active },
                { label: "Ordini totali", value: platformStats.orders },
                { label: "GMV stimato", value: money(platformStats.revenue) },
              ]}
            />

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
                  <InlineNotice
                    title="Nessun business creato"
                    description="Crea il primo locale per iniziare a usare la piattaforma."
                  />
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
                            {business.slug} - {business.type} - {business.plan}
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
                      <InlineNotice
                        title="Nessun utente creato"
                        description="Aggiungi owner, admin o staff per dare accesso al locale."
                      />
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
          <AdminStatsGrid
            items={[
              { label: "Ordini oggi", value: dashboardStats.total },
              { label: "Incasso", value: money(dashboardStats.revenue) },
              { label: "In attesa", value: dashboardStats.pending },
              { label: "Ritirati", value: dashboardStats.done },
            ]}
          />
        )}

        {activeAdminSection === "dashboard" && (
          <AdminDashboardSection
            availability={availability}
            recentOrders={recentOrders}
            topProductMax={topProductMax}
            topProducts={topProducts}
          />
        )}

        {activeAdminSection === "orders" && (
          <AdminOrdersSection
            changeStatus={changeStatus}
            groupedOrders={groupedOrders}
            orderFilter={orderFilter}
            orderSearch={orderSearch}
            setOrderFilter={setOrderFilter}
            setOrderSearch={setOrderSearch}
            visibleOrders={visibleOrders}
          />
        )}

        {activeAdminSection === "menu" && (
          <AdminMenuSection
            adminMenu={adminMenu}
            changeMenuAvailability={changeMenuAvailability}
            editMenuItem={editMenuItem}
            editingMenuId={editingMenuId}
            groupedMenu={groupedMenu}
            menuForm={menuForm}
            menuSaving={menuSaving}
            removeMenuItem={removeMenuItem}
            resetMenuForm={resetMenuForm}
            saveMenuItem={saveMenuItem}
            unavailableItems={unavailableItems}
            updateMenuForm={updateMenuForm}
          />
        )}
        {activeAdminSection === "availability" && (
          <AdminAvailabilitySection
            adminMenu={adminMenu}
            changeMenuAvailability={changeMenuAvailability}
            unavailableItems={unavailableItems}
          />
        )}
        {activeAdminSection === "customers" && (
          <AdminCustomersSection
            customerSearch={customerSearch}
            customers={customers}
            setCustomerSearch={setCustomerSearch}
          />
        )}
        {activeAdminSection === "coupons" && (
          <AdminCouponsSection
            changeCouponStatus={changeCouponStatus}
            couponForm={couponForm}
            couponSaving={couponSaving}
            coupons={coupons}
            editCoupon={editCoupon}
            editingCouponId={editingCouponId}
            removeCoupon={removeCoupon}
            resetCouponForm={resetCouponForm}
            saveCoupon={saveCoupon}
            updateCouponForm={updateCouponForm}
          />
        )}
        {activeAdminSection === "settings" && (
          <AdminSettingsSection
            applyOpeningPreset={applyOpeningPreset}
            saveSettings={saveSettings}
            settingsForm={settingsForm}
            settingsSaving={settingsSaving}
            toggleOpeningDay={toggleOpeningDay}
            updateSettingsForm={updateSettingsForm}
          />
        )}
      </section>

      <Toast message={toast} />
    </main>
  );
}



