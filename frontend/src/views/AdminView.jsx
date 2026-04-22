import { getBusinessSlug } from "../lib/api";
import { businessHref, money } from "../utils/format";
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

export default function AdminView() {
  const {
    activeAdminSection,
    adminMenu,
    availability,
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
    editCoupon,
    editMenuItem,
    editingCouponId,
    editingMenuId,
    groupedMenu,
    groupedOrders,
    lastUpdatedAt,
    login,
    logout,
    menuForm,
    menuSaving,
    orderFilter,
    orderSearch,
    password,
    pickupDate,
    recentOrders,
    refresh,
    refreshing,
    removeCoupon,
    removeMenuItem,
    resetCouponForm,
    resetMenuForm,
    saveCoupon,
    saveMenuItem,
    saveSettings,
    setActiveAdminSection,
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
    updateCouponForm,
    updateMenuForm,
    updateSettingsForm,
    applyOpeningPreset,
    username,
    visibleAdminNav,
    visibleOrders,
  } = useAdminController();

  const adminTitleName = currentBusiness?.name || getBusinessSlug() || "Locale";
  document.title = `${adminTitleName} - Banco admin`;

  if (!token) {
    return (
      <main className="admin-login">
        <form className="login-panel" onSubmit={login}>
          <a href={businessHref(getBusinessSlug())}>Menu cliente</a>
          <h1>Banco admin</h1>
          <input
            placeholder="Email o username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
        businessName={currentBusiness?.name || "Locale"}
        businessSlug={getBusinessSlug()}
        navItems={visibleAdminNav}
        onSelect={setActiveAdminSection}
        publicHref={businessHref(getBusinessSlug())}
        publicLabel="Apri menu pubblico"
        title="Banco locale"
      />

      <section className="admin-main">
        <AdminHeader
          activeLabel={
            visibleAdminNav.find((item) => item.id === activeAdminSection)
              ?.label
          }
          contextLabel={`Operativita ${currentBusiness?.name || getBusinessSlug()}`}
          lastUpdatedAt={lastUpdatedAt}
          onDateChange={setPickupDate}
          onLogout={logout}
          onRefresh={refresh}
          pickupDate={pickupDate}
          refreshing={refreshing}
        />

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
