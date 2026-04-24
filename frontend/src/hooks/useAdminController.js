import { useEffect, useMemo, useState } from "react";
import {
  createCoupon,
  createMenuItem,
  deleteCoupon,
  deleteMenuItem,
  getAdminCustomers,
  getAdminMenu,
  getAvailability,
  getCoupons,
  getCurrentBusiness,
  getMe,
  getOrderStats,
  getOrders,
  getStoreSettings,
  loginAdmin,
  toggleCoupon,
  toggleMenuItem,
  updateCoupon,
  updateMenuItem,
  updateOrderStatus,
  updateStoreSettings,
} from "../lib/api";
import {
  ADMIN_NAV,
  ADMIN_REFRESH_INTERVAL_MS,
  EMPTY_MENU_FORM,
  MENU_CATEGORY_OPTIONS,
  OPENING_DAY_OPTIONS,
} from "../constants";
import {
  getAdminMenuCategory,
  isFreshOrder,
  isUrgentOrder,
  menuFormToPayload,
  menuItemToForm,
  parseCommaList,
  todayISO,
} from "../utils/format";

const DEFAULT_OPENING_DAYS = ["mar", "mer", "gio", "ven", "sab", "dom"];
const DAY_LABEL_BY_ID = Object.fromEntries(
  OPENING_DAY_OPTIONS.map((day) => [day.id, day.label]),
);
const DAY_ORDER = OPENING_DAY_OPTIONS.map((day) => day.id);

function compactDayLabel(days) {
  const ordered = DAY_ORDER.filter((day) => days.includes(day));
  if (ordered.length === 0) return "Chiuso";
  if (ordered.length === DAY_ORDER.length) return "Tutti i giorni";

  const firstIndex = DAY_ORDER.indexOf(ordered[0]);
  const isContiguous = ordered.every(
    (day, index) => DAY_ORDER[firstIndex + index] === day,
  );

  if (ordered.length > 1 && isContiguous) {
    return `${DAY_LABEL_BY_ID[ordered[0]]}-${DAY_LABEL_BY_ID[ordered[ordered.length - 1]]}`;
  }

  return ordered.map((day) => DAY_LABEL_BY_ID[day]).join(", ");
}

function formatOpeningHours(days, start, end) {
  const safeDays = Array.isArray(days) ? days : [];
  if (safeDays.length === 0) return "Chiuso";
  const safeStart = start || "18:00";
  const safeEnd = end || "22:30";
  return `${compactDayLabel(safeDays)} ${safeStart}-${safeEnd}`;
}

function parseOpeningDays(openingHours = "") {
  const value = openingHours.toLowerCase();
  if (value.includes("chiuso")) return [];
  if (value.includes("tutti")) return DAY_ORDER;
  if (value.includes("mar-dom")) return DEFAULT_OPENING_DAYS;
  if (value.includes("lun-sab")) return ["lun", "mar", "mer", "gio", "ven", "sab"];
  if (value.includes("lun-dom")) return DAY_ORDER;
  return DEFAULT_OPENING_DAYS;
}

function parseOpeningTimes(openingHours = "") {
  const match = String(openingHours).match(/(\d{1,2}:\d{2})\s*[-/]\s*(\d{1,2}:\d{2})/);
  return {
    openingTimeStart: match?.[1] || "18:00",
    openingTimeEnd: match?.[2] || "22:30",
  };
}

function businessSlugFromAdminPath() {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (["admin", "ordine", "p"].includes(parts[0])) return "";
  if (parts[2] === "admin") return parts[1] || "";
  if (parts[1] !== "admin") return "";
  return parts[0] || "";
}

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
    openingDays: DEFAULT_OPENING_DAYS,
    openingTimeStart: "18:00",
    openingTimeEnd: "22:30",
    deliveryCost: "",
    minimumOrder: "",
    serviceZones: "",
    customerMessage: "",
  });
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
      if (!session.user && !session.role) return null;
      return {
        ...(session.user || {}),
        role: session.user?.role || session.role,
      };
    } catch {
      return null;
    }
  });
  const [toast, setToast] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const isGlobalAdmin = currentUser?.role === "global_admin";
  const sessionRoleKnown = !token || Boolean(currentUser?.role);

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
    if (!token || !currentBusiness?.slug || currentUser?.role === "global_admin") {
      return;
    }

    const routeSlug = businessSlugFromAdminPath();
    if (routeSlug && routeSlug !== currentBusiness.slug) {
      const citySlug = currentBusiness.location?.citySlug || "";
      window.location.replace(
        citySlug
          ? `/${citySlug}/${currentBusiness.slug}/admin`
          : `/${currentBusiness.slug}/admin`,
      );
    }
  }, [token, currentBusiness?.slug, currentUser?.role]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => loadCustomers(customerSearch), 350);
    return () => window.clearTimeout(timer);
  }, [customerSearch, token]);

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
    // coupon e impostazioni. La console piattaforma ha un controller separato.
    const tasks = [loadAdminMenu()];

    if (currentUser?.role !== "staff") {
      tasks.push(loadCustomers(customerSearch), loadCoupons(), loadSettings());
    }

    await Promise.all(tasks);
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
      setCurrentUser({
        ...(session.user || {}),
        role: session.user?.role || nextSession.role,
      });
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
      const parsedTimes = parseOpeningTimes(settings.openingHours || "");
      const openingDays =
        Array.isArray(settings.openingDays) && settings.openingDays.length > 0
          ? settings.openingDays
          : parseOpeningDays(settings.openingHours || "");
      const openingTimeStart =
        settings.openingTimeStart || parsedTimes.openingTimeStart;
      const openingTimeEnd =
        settings.openingTimeEnd || parsedTimes.openingTimeEnd;
      setSettingsForm({
        openingHours:
          settings.openingHours ||
          formatOpeningHours(openingDays, openingTimeStart, openingTimeEnd),
        openingDays,
        openingTimeStart,
        openingTimeEnd,
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

  function updateSettingsForm(patch) {
    setSettingsForm((current) => {
      const next = { ...current, ...patch };
      if (
        patch.openingDays !== undefined ||
        patch.openingTimeStart !== undefined ||
        patch.openingTimeEnd !== undefined
      ) {
        next.openingHours = formatOpeningHours(
          next.openingDays,
          next.openingTimeStart,
          next.openingTimeEnd,
        );
      }
      return next;
    });
  }

  function toggleOpeningDay(dayId) {
    updateSettingsForm({
      openingDays: settingsForm.openingDays.includes(dayId)
        ? settingsForm.openingDays.filter((day) => day !== dayId)
        : [...settingsForm.openingDays, dayId],
    });
  }

  function applyOpeningPreset(preset) {
    const next = {
      daily: {
        openingDays: DAY_ORDER,
        openingTimeStart: "18:00",
        openingTimeEnd: "22:30",
      },
      takeaway: {
        openingDays: DEFAULT_OPENING_DAYS,
        openingTimeStart: "18:00",
        openingTimeEnd: "22:30",
      },
      weekend: {
        openingDays: ["ven", "sab", "dom"],
        openingTimeStart: "18:00",
        openingTimeEnd: "23:00",
      },
      weekly: {
        openingDays: ["lun", "mar", "mer", "gio", "ven", "sab"],
        openingTimeStart: "12:00",
        openingTimeEnd: "15:00",
      },
      closed: {
        openingDays: [],
        openingTimeStart: settingsForm.openingTimeStart || "18:00",
        openingTimeEnd: settingsForm.openingTimeEnd || "22:30",
        openingHours: "Chiuso per ferie",
      },
    }[preset];

    setSettingsForm((current) => ({
      ...current,
      ...next,
      openingHours:
        next.openingHours ||
        formatOpeningHours(
          next.openingDays,
          next.openingTimeStart,
          next.openingTimeEnd,
        ),
    }));
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
    if (
      settingsForm.openingDays.length > 0 &&
      settingsForm.openingTimeStart >= settingsForm.openingTimeEnd
    ) {
      notify("L'orario di chiusura deve essere dopo l'apertura.");
      return;
    }

    setSettingsSaving(true);
    try {
      await updateStoreSettings(
        {
          openingHours: settingsForm.openingHours,
          openingDays: settingsForm.openingDays,
          openingTimeStart: settingsForm.openingTimeStart,
          openingTimeEnd: settingsForm.openingTimeEnd,
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

  const visibleAdminNav = useMemo(() => {
    // Difesa UX: nasconde sezioni non pertinenti al ruolo. Il backend applica
    // comunque i controlli reali, quindi questa non e' sicurezza primaria.
    return ADMIN_NAV.filter((item) => {
      if (currentUser?.role === "staff") {
        return ["dashboard", "orders", "availability"].includes(item.id);
      }
      return true;
    });
  }, [currentUser?.role]);
  useEffect(() => {
    if (
      sessionRoleKnown &&
      token &&
      visibleAdminNav.length > 0 &&
      !visibleAdminNav.some((item) => item.id === activeAdminSection)
    ) {
      setActiveAdminSection(visibleAdminNav[0].id);
    }
  }, [activeAdminSection, sessionRoleKnown, token, visibleAdminNav]);

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
    isGlobalAdmin,
    lastUpdatedAt,
    login,
    logout,
    menuForm,
    menuSaving,
    notify,
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
  };
}
