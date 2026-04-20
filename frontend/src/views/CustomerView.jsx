import { BUSINESS_TYPE_OPTIONS } from "../constants";
import { isCounterOpenNow, money } from "../utils/format";
import { getBusinessSlug } from "../lib/api";
import Toast from "../components/Toast";
import useCustomerController from "../hooks/useCustomerController";
import BusinessPublicHeader from "../components/customer/BusinessPublicHeader";
import CustomerCheckoutPanel from "../components/customer/CustomerCheckoutPanel";
import CustomerConfirmation from "../components/customer/CustomerConfirmation";
import CustomerHero from "../components/customer/CustomerHero";
import CustomerMenuArea from "../components/customer/CustomerMenuArea";
import RecoverOrderPanel from "../components/customer/RecoverOrderPanel";

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
  const name =
    business?.branding?.publicName || business?.name || "Mucho Gusto";
  const typeLabel = getBusinessTypeLabel(type);

  if (type === "sushi") {
    return {
      eyebrow: `${name} - ${typeLabel}`,
      title:
        "Ordina i tuoi piatti preferiti, scegli l'orario e ritira al banco.",
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
    title:
      "Scopri prodotti e servizi, scegli l'orario e completa la richiesta.",
    subtitle:
      "Consulta la disponibilita, prepara la richiesta e segui tutto da questa pagina.",
  };
}

function getBusinessServiceHighlights(type) {
  if (type === "sushi") {
    return [
      ["Asporto", "ritiro al banco"],
      ["Sushi", "box e piatti pronti"],
      ["Pagamento", "al ritiro"],
    ];
  }

  if (["pizzeria", "restaurant"].includes(type || "pizzeria")) {
    return [
      ["Asporto", "ritiro al banco"],
      ["Menu", "trancio, teglia o pizza"],
      ["Pagamento", "in pizzeria"],
    ];
  }

  return [
    ["Prenotazione", "richiesta rapida"],
    ["Orario", "scelto da te"],
    ["Conferma", "subito online"],
  ];
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "")
    .split(":")
    .map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isBusinessOpenNow(business) {
  const settings = business?.settings;
  if (!settings) return isCounterOpenNow();

  const dayCodes = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const now = new Date();
  const openingDays = Array.isArray(settings.openingDays)
    ? settings.openingDays
    : null;

  if (openingDays && !openingDays.includes(dayCodes[now.getDay()])) {
    return false;
  }

  const start = timeToMinutes(settings.openingTimeStart || "17:30");
  const end = timeToMinutes(settings.openingTimeEnd || "22:30");
  const current = now.getHours() * 60 + now.getMinutes();

  if (start === null || end === null) return isCounterOpenNow();
  return current >= start && current <= end;
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
    menu,
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
  const serviceHighlights = getBusinessServiceHighlights(currentBusiness?.type);
  const businessPrimary =
    currentBusiness?.branding?.primaryColor || "var(--mg-basil)";
  const businessAccent =
    currentBusiness?.branding?.accentColor || "var(--mg-tomato)";
  const businessLogoUrl = currentBusiness?.branding?.logoUrl || "";
  const openingHours =
    currentBusiness?.settings?.openingHours || "Orari in aggiornamento";
  const publicMessage = currentBusiness?.settings?.publicMessage || "";
  const counterOpen = isBusinessOpenNow(currentBusiness);
  const customPizzaEnabled =
    currentBusiness?.features?.customPizza !== false &&
    ["pizzeria", "restaurant"].includes(currentBusiness?.type || "pizzeria");
  const checkoutDisabled =
    !customer.trim() || !phone.trim() || cart.length === 0 || !selectedSlot;

  if (confirmation) {
    return (
      <CustomerConfirmation
        confirmation={confirmation}
        onBackToMenu={() => setConfirmation(null)}
        toast={toast}
      />
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
      <BusinessPublicHeader
        businessLogoUrl={businessLogoUrl}
        businessName={businessName}
        businessSlug={businessSlug}
        businessTypeLabel={businessTypeLabel}
        counterOpen={counterOpen}
        getInitials={getBusinessInitials}
      />
      <CustomerHero
        counterOpen={counterOpen}
        heroCopy={heroCopy}
        openingHours={openingHours}
        publicMessage={publicMessage}
        serviceHighlights={serviceHighlights}
      />

      <RecoverOrderPanel
        customerOrders={customerOrders}
        customerOrdersLoading={customerOrdersLoading}
        normalizedPhone={normalizedPhone}
        onPhoneChange={setPhone}
        phone={phone}
      />

      <section className="order-layout" id="menu">
        <CustomerMenuArea
          activeFilters={activeFilters}
          activeMenu={activeMenu}
          activeMenuSection={activeMenuSection}
          addCustomPizzaToCart={addCustomPizzaToCart}
          addToCart={addToCart}
          addedItemId={addedItemId}
          customPizzaBase={customPizzaBase}
          customPizzaBaseId={customPizzaBaseId}
          customPizzaEnabled={customPizzaEnabled}
          customPizzaNotes={customPizzaNotes}
          customPizzaOpen={customPizzaOpen}
          customPizzaPrice={customPizzaPrice}
          customPizzaRef={customPizzaRef}
          customPizzaSelectedToppings={customPizzaSelectedToppings}
          customPizzaToppings={customPizzaToppings}
          getCartItem={getCartItem}
          loadPublicData={loadPublicData}
          loading={loading}
          menu={menu}
          menuBySection={menuBySection}
          menuError={menuError}
          removeFromCart={removeFromCart}
          searchTerm={searchTerm}
          setActiveFilters={setActiveFilters}
          setActiveMenuSection={setActiveMenuSection}
          setCustomPizzaBaseId={setCustomPizzaBaseId}
          setCustomPizzaNotes={setCustomPizzaNotes}
          setSearchTerm={setSearchTerm}
          toggleCustomPizzaBuilder={toggleCustomPizzaBuilder}
          toggleCustomPizzaTopping={toggleCustomPizzaTopping}
          toggleFilter={toggleFilter}
        />
        <CustomerCheckoutPanel
          addToCart={addToCart}
          availability={availability}
          availabilityLoading={availabilityLoading}
          businessName={businessName}
          cart={cart}
          checkoutDisabled={checkoutDisabled}
          customer={customer}
          customerLookupLoading={customerLookupLoading}
          customerProfile={customerProfile}
          dateOptions={dateOptions}
          loyaltyCyclePoints={loyaltyCyclePoints}
          loyaltyPoints={loyaltyPoints}
          loyaltyRemaining={loyaltyRemaining}
          mobileCartOpen={mobileCartOpen}
          notes={notes}
          onCloseMobileCart={() => setMobileCartOpen(false)}
          phone={phone}
          pickupDate={pickupDate}
          removeFromCart={removeFromCart}
          reorderLastOrder={reorderLastOrder}
          selectedSlot={selectedSlot}
          setCustomer={setCustomer}
          setNotes={setNotes}
          setPhone={setPhone}
          setPickupDate={setPickupDate}
          setSelectedSlot={setSelectedSlot}
          submitOrder={submitOrder}
          total={total}
          updateCartItemNote={updateCartItemNote}
          visibleCustomerSlots={visibleCustomerSlots}
        />
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
