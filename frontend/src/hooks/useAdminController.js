import { useEffect, useMemo, useState } from "react";
import {
  createBusinessUser,
  createCoupon,
  createMenuItem,
  createPlatformBusiness,
  deleteCoupon,
  deleteMenuItem,
  getAdminCustomers,
  getAdminMenu,
  getAvailability,
  getBusinessUsers,
  getCoupons,
  getCurrentBusiness,
  getMe,
  getOrderStats,
  getOrders,
  getPlatformBusinesses,
  getStoreSettings,
  loginAdmin,
  toggleCoupon,
  toggleMenuItem,
  updateBusinessUser,
  updateCoupon,
  updateMenuItem,
  updateOrderStatus,
  updatePlatformBusiness,
  updateStoreSettings,
} from "../lib/api";
import {
  ADMIN_NAV,
  ADMIN_REFRESH_INTERVAL_MS,
  EMPTY_BUSINESS_FORM,
  EMPTY_BUSINESS_USER_FORM,
  EMPTY_MENU_FORM,
  MENU_CATEGORY_OPTIONS,
} from "../constants";
import {
  businessFormToPayload,
  businessToForm,
  getAdminMenuCategory,
  isFreshOrder,
  isUrgentOrder,
  menuFormToPayload,
  menuItemToForm,
  money,
  parseCommaList,
  slugify,
  todayISO,
} from "../utils/format";

export default function useAdminController() {
  // Pannello operativo admin. Il ruolo dell'utente decide quali sezioni sono
  // visibili; il backend resta comunque la fonte di verita per i permessi.
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeAdminSection, setActiveAdminSection] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    return ADMIN_NAV.some((item) => item.id === requested)
      ? requested
      : "dashboard";
  });
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [adminMenu, setAdminMenu] = useState([]);
  const [menuForm, setMenuForm] = useState(EMPTY_MENU_FORM);
  const [editingMenuId, setEditingMenuId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "percent",
    value: "",
    expiresAt: "",
    usageLimit: "",
    active: true,
  });
  const [editingCouponId, setEditingCouponId] = useState("");
  const [settingsForm, setSettingsForm] = useState({
    openingHours: "",
    deliveryCost: "",
    minimumOrder: "",
    serviceZones: "",
    customerMessage: "",
  });
  const [platformBusinesses, setPlatformBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_session") || "{}").user || null;
    } catch {
      return null;
    }
  });
  const [businessForm, setBusinessForm] = useState(EMPTY_BUSINESS_FORM);
  const [editingBusinessId, setEditingBusinessId] = useState("");
  const [businessUsers, setBusinessUsers] = useState([]);
  const [selectedBusinessForUsers, setSelectedBusinessForUsers] = useState(null);
  const [businessUserForm, setBusinessUserForm] = useState(EMPTY_BUSINESS_USER_FORM);
  const [editingBusinessUserId, setEditingBusinessUserId] = useState("");
  const [toast, setToast] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessUserSaving, setBusinessUserSaving] = useState(false);
  const isGlobalAdmin = currentUser?.role === "global_admin";

  useEffect(() => {
    if (!token) return;
    // Al login o refresh pagina ricostruiamo la sessione, poi avviamo polling
    // leggero per ordini, disponibilita e dashboard.
    hydrateSession();
    refresh();
    const timer = window.setInterval(refresh, ADMIN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [token, pickupDate]);

  useEffect(() => {
    if (!token) return;
    loadAdminResources();
  }, [token, currentUser?.role]);

  useEffect(() => {
    if (!token) return;
    loadCurrentBusiness();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => loadCustomers(customerSearch), 350);
    return () => window.clearTimeout(timer);
  }, [customerSearch, token]);

  useEffect(() => {
    if (!isGlobalAdmin && activeAdminSection === "businesses") {
      setActiveAdminSection("dashboard");
    }
  }, [activeAdminSection, isGlobalAdmin]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2400);
  }

  async function refresh() {
    // Evita richieste sovrapposte quando polling e azioni manuali partono insieme.
    if (refresh.inFlight) return;
    refresh.inFlight = true;
    setRefreshing(true);
    try {
      const [nextOrders, nextAvailability, nextStats] = await Promise.all([
        getOrders(token, pickupDate),
        getAvailability(pickupDate),
        getOrderStats(token),
      ]);
      setOrders(nextOrders);
      setAvailability(nextAvailability);
      setStats(nextStats);
      setLastUpdatedAt(
        new Intl.DateTimeFormat("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    } finally {
      refresh.inFlight = false;
      setRefreshing(false);
    }
  }

  async function loadAdminResources() {
    // Staff vede solo operativita rapida; owner/admin caricano anche clienti,
    // coupon e impostazioni. Il global admin carica inoltre la piattaforma.
    const tasks = [loadAdminMenu()];

    if (currentUser?.role !== "staff") {
      tasks.push(loadCustomers(customerSearch), loadCoupons(), loadSettings());
    }

    if (isGlobalAdmin) tasks.unshift(loadPlatformBusinesses());
    await Promise.all(tasks);
  }

  async function loadPlatformBusinesses() {
    if (!isGlobalAdmin) return;
    try {
      setPlatformBusinesses(await getPlatformBusinesses(token));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function hydrateSession() {
    // /auth/me e' fondamentale per applicare nav e business corrente dopo reload.
    try {
      const session = await getMe(token);
      const nextSession = {
        role: session.user?.role,
        user: session.user,
        business: session.business,
      };
      localStorage.setItem("admin_session", JSON.stringify(nextSession));
      setCurrentUser(session.user);
      setCurrentBusiness(session.business || (await getCurrentBusiness()));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadCurrentBusiness() {
    try {
      setCurrentBusiness(await getCurrentBusiness());
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadAdminMenu() {
    try {
      setAdminMenu(await getAdminMenu(token));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadCustomers(query = "") {
    try {
      setCustomers(await getAdminCustomers(token, query));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadCoupons() {
    try {
      setCoupons(await getCoupons(token));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function loadSettings() {
    try {
      const settings = await getStoreSettings(token);
      setSettingsForm({
        openingHours: settings.openingHours || "",
        deliveryCost: settings.deliveryCost ?? "",
        minimumOrder: settings.minimumOrder ?? "",
        serviceZones: (settings.serviceZones || []).join(", "),
        customerMessage: settings.customerMessage || "",
      });
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    }
  }

  async function login(event) {
    event.preventDefault();
    try {
      const data = await loginAdmin(username, password);
      // Salviamo sia token sia sessione descrittiva: il token autorizza il
      // backend, la sessione serve al frontend per nav e slug corrente.
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem(
        "admin_session",
        JSON.stringify({
          role: data.role,
          user: data.user,
          business: data.business,
        }),
      );
      setCurrentUser(data.user);
      setCurrentBusiness(data.business);
      setToken(data.token);
    } catch (error) {
      notify(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session");
    setToken("");
    setCurrentBusiness(null);
    setCurrentUser(null);
    setPlatformBusinesses([]);
    setAdminMenu([]);
    setCustomers([]);
    setCoupons([]);
  }

  async function changeStatus(id, status) {
    try {
      await updateOrderStatus(id, status, token);
      await refresh();
    } catch (error) {
      notify(error.message);
    }
  }

  function updateMenuForm(field, value) {
    setMenuForm((current) => ({ ...current, [field]: value }));
  }

  function editMenuItem(item) {
    setEditingMenuId(item._id);
    setMenuForm(menuItemToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetMenuForm() {
    setEditingMenuId("");
    setMenuForm(EMPTY_MENU_FORM);
  }

  async function saveMenuItem(event) {
    event.preventDefault();

    if (!menuForm.name.trim()) return notify("Inserisci il nome del prodotto.");
    if (!menuForm.price || Number(menuForm.price) < 0) {
      return notify("Inserisci un prezzo valido.");
    }

    setMenuSaving(true);
    try {
      // Stesso form per create/update: editingMenuId decide quale API chiamare.
      const payload = menuFormToPayload(menuForm);
      if (editingMenuId) {
        await updateMenuItem(editingMenuId, payload, token);
        notify("Prodotto aggiornato.");
      } else {
        await createMenuItem(payload, token);
        notify("Prodotto aggiunto al menu.");
      }
      resetMenuForm();
      await loadAdminMenu();
    } catch (error) {
      notify(error.message);
    } finally {
      setMenuSaving(false);
    }
  }

  function updateCouponForm(field, value) {
    setCouponForm((current) => ({ ...current, [field]: value }));
  }

  function editCoupon(coupon) {
    setEditingCouponId(coupon._id);
    setCouponForm({
      code: coupon.code || "",
      type: coupon.type || "percent",
      value: coupon.value ?? "",
      expiresAt: coupon.expiresAt || "",
      usageLimit: coupon.usageLimit ?? "",
      active: coupon.active !== false,
    });
    setActiveAdminSection("coupons");
  }

  function resetCouponForm() {
    setEditingCouponId("");
    setCouponForm({
      code: "",
      type: "percent",
      value: "",
      expiresAt: "",
      usageLimit: "",
      active: true,
    });
  }

  async function saveCoupon(event) {
    event.preventDefault();
    if (!couponForm.code.trim()) return notify("Inserisci un codice coupon.");
    if (!couponForm.value || Number(couponForm.value) <= 0) {
      return notify("Inserisci un valore coupon valido.");
    }

    setCouponSaving(true);
    try {
      const payload = {
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
        value: Number(couponForm.value),
        usageLimit: Number(couponForm.usageLimit) || 0,
      };
      if (editingCouponId) {
        await updateCoupon(editingCouponId, payload, token);
        notify("Coupon aggiornato.");
      } else {
        await createCoupon(payload, token);
        notify("Coupon creato.");
      }
      resetCouponForm();
      await loadCoupons();
    } catch (error) {
      notify(error.message);
    } finally {
      setCouponSaving(false);
    }
  }

  async function changeCouponStatus(id) {
    try {
      await toggleCoupon(id, token);
      await loadCoupons();
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeCoupon(id) {
    const confirmed = window.confirm("Eliminare questo coupon?");
    if (!confirmed) return;

    try {
      await deleteCoupon(id, token);
      await loadCoupons();
      notify("Coupon eliminato.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      await updateStoreSettings(
        {
          openingHours: settingsForm.openingHours,
          deliveryCost: Number(settingsForm.deliveryCost) || 0,
          minimumOrder: Number(settingsForm.minimumOrder) || 0,
          serviceZones: parseCommaList(settingsForm.serviceZones),
          customerMessage: settingsForm.customerMessage,
        },
        token,
      );
      notify("Impostazioni aggiornate.");
      await loadSettings();
    } catch (error) {
      notify(error.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  function updateBusinessForm(field, value) {
    setBusinessForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !editingBusinessId) {
        next.slug = slugify(value);
        next.publicName = value;
        next.vercelProjectName = slugify(value);
      }
      if (field === "slug") {
        next.slug = slugify(value);
        if (!next.vercelProjectName || next.vercelProjectName === current.slug) {
          next.vercelProjectName = next.slug;
        }
      }
      return next;
    });
  }

  function editBusiness(business) {
    setEditingBusinessId(business._id);
    setBusinessForm(businessToForm(business));
    setActiveAdminSection("businesses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetBusinessForm() {
    setEditingBusinessId("");
    setBusinessForm(EMPTY_BUSINESS_FORM);
  }

  async function saveBusiness(event) {
    event.preventDefault();
    if (!businessForm.name.trim()) {
      return notify("Inserisci il nome del business.");
    }
    if (!slugify(businessForm.slug || businessForm.name)) {
      return notify("Inserisci uno slug valido.");
    }

    setBusinessSaving(true);
    try {
      // Solo il global admin puo' arrivare qui: crea/aggiorna tenant e owner.
      const payload = businessFormToPayload(businessForm);
      if (editingBusinessId) {
        await updatePlatformBusiness(editingBusinessId, payload, token);
        notify("Business aggiornato.");
      } else {
        await createPlatformBusiness(payload, token);
        notify("Business creato.");
      }
      resetBusinessForm();
      await loadPlatformBusinesses();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusinessSaving(false);
    }
  }

  async function openBusinessUsers(business) {
    // Pannello laterale/logico per assegnare owner/admin/staff al tenant scelto.
    setSelectedBusinessForUsers(business);
    setBusinessUserForm(EMPTY_BUSINESS_USER_FORM);
    setEditingBusinessUserId("");
    try {
      setBusinessUsers(await getBusinessUsers(business._id, token));
    } catch (error) {
      notify(error.message);
    }
  }

  function editBusinessUser(user) {
    setEditingBusinessUserId(user._id);
    setBusinessUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "admin",
      active: user.active !== false,
    });
  }

  function resetBusinessUserForm() {
    setEditingBusinessUserId("");
    setBusinessUserForm(EMPTY_BUSINESS_USER_FORM);
  }

  async function saveBusinessUser(event) {
    event.preventDefault();
    if (!selectedBusinessForUsers) return notify("Seleziona un business.");
    if (!businessUserForm.email.trim()) return notify("Email utente obbligatoria.");

    setBusinessUserSaving(true);
    try {
      // Password vuota in modifica significa "non cambiarla"; in creazione il
      // backend la richiede per evitare utenti inutilizzabili.
      const payload = {
        ...businessUserForm,
        email: businessUserForm.email.trim(),
        name: businessUserForm.name.trim(),
        password: businessUserForm.password.trim(),
      };

      if (editingBusinessUserId) {
        await updateBusinessUser(editingBusinessUserId, payload, token);
        notify("Utente aggiornato.");
      } else {
        await createBusinessUser(selectedBusinessForUsers._id, payload, token);
        notify("Utente creato.");
      }

      resetBusinessUserForm();
      setBusinessUsers(await getBusinessUsers(selectedBusinessForUsers._id, token));
      await loadPlatformBusinesses();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusinessUserSaving(false);
    }
  }

  async function changeMenuAvailability(id) {
    try {
      await toggleMenuItem(id, token);
      await loadAdminMenu();
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeMenuItem(id) {
    const confirmed = window.confirm("Eliminare questo prodotto dal menu?");
    if (!confirmed) return;

    try {
      await deleteMenuItem(id, token);
      await loadAdminMenu();
      notify("Prodotto eliminato.");
    } catch (error) {
      notify(error.message);
    }
  }

  const groupedOrders = useMemo(() => {
    // Gli ordini vengono filtrati e poi raggruppati per fascia ritiro per
    // ridurre il caos operativo durante il servizio.
    return orders
      .filter((order) => {
        const query = orderSearch.trim().toLowerCase();
        const matchesFilter =
          orderFilter === "all" ||
          (orderFilter === "new"
            ? isFreshOrder(order)
            : order.status === orderFilter);
        const haystack = `${order.customer || ""} ${order.phone || ""} ${
          order.notes || ""
        } ${(order.items || []).map((item) => item.name).join(" ")}`.toLowerCase();
        return matchesFilter && (!query || haystack.includes(query));
      })
      .reduce((groups, order) => {
        const key = order.pickupSlot || "Senza fascia";
        groups[key] = groups[key] || [];
        groups[key].push(order);
        return groups;
      }, {});
  }, [orderFilter, orderSearch, orders]);

  const visibleOrders = useMemo(
    () => Object.values(groupedOrders).flat(),
    [groupedOrders],
  );

  const groupedMenu = useMemo(() => {
    // Lista admin ordinata per categoria operativa.
    return adminMenu.reduce((groups, item) => {
      const key = getAdminMenuCategory(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [adminMenu]);

  const dashboardStats = useMemo(() => {
    // Fallback locale: se /stats manca o e' parziale, la dashboard resta utile
    // usando gli ordini gia' caricati.
    const today = stats?.today || {};
    const fallbackRevenue = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    return {
      total:
        today.total ??
        orders.filter((order) => order.status !== "cancelled").length,
      revenue: today.revenue ?? fallbackRevenue,
      pending:
        (today.preparing ??
          orders.filter((order) => order.status === "preparing").length) +
        (today.ready ??
          orders.filter((order) => order.status === "ready").length),
      done:
        today.done ?? orders.filter((order) => order.status === "done").length,
      cancelled:
        today.cancelled ??
        orders.filter((order) => order.status === "cancelled").length,
    };
  }, [orders, stats]);

  const platformStats = useMemo(() => {
    // Metriche aggregate del global admin per capire lo stato della piattaforma.
    return platformBusinesses.reduce(
      (totals, business) => {
        totals.businesses += 1;
        totals.orders += business.metrics?.orders || 0;
        totals.revenue += business.metrics?.revenue || 0;
        totals.pending += business.metrics?.pending || 0;
        if (business.subscriptionStatus === "active") totals.active += 1;
        if (business.subscriptionStatus === "trialing") totals.trialing += 1;
        return totals;
      },
      {
        businesses: 0,
        orders: 0,
        revenue: 0,
        pending: 0,
        active: 0,
        trialing: 0,
      },
    );
  }, [platformBusinesses]);
  const visibleAdminNav = useMemo(() => {
    // Difesa UX: nasconde sezioni non pertinenti al ruolo. Il backend applica
    // comunque i controlli reali, quindi questa non e' sicurezza primaria.
    return ADMIN_NAV.filter((item) => {
      if (isGlobalAdmin) return true;
      if (item.id === "businesses") return false;
      if (currentUser?.role === "staff") {
        return ["dashboard", "orders", "availability"].includes(item.id);
      }
      return true;
    });
  }, [currentUser?.role, isGlobalAdmin]);
  useEffect(() => {
    if (
      token &&
      visibleAdminNav.length > 0 &&
      !visibleAdminNav.some((item) => item.id === activeAdminSection)
    ) {
      setActiveAdminSection(visibleAdminNav[0].id);
    }
  }, [activeAdminSection, token, visibleAdminNav]);

  const topProducts = useMemo(() => {
    if (stats?.topProducts?.length) return stats.topProducts;
    const productMap = new Map();
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      for (const item of order.items || []) {
        const current = productMap.get(item.name) || {
          name: item.name,
          qty: 0,
          revenue: 0,
        };
        current.qty += item.qty || 0;
        current.revenue += (item.price || 0) * (item.qty || 0);
        productMap.set(item.name, current);
      }
    }
    return Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders, stats]);

  const recentOrders = stats?.recentOrders?.length
    ? stats.recentOrders
    : orders.slice(0, 8);
  const unavailableItems = adminMenu.filter((item) => !item.available);
  const topProductMax = Math.max(
    ...topProducts.map((item) => item.qty || 0),
    1,
  );


  return {
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
  };
}
