import { useEffect, useMemo, useState } from "react";
import {
  activatePlatformCity,
  createBusinessUser,
  createPlatformBusiness,
  getBusinessUsers,
  getMe,
  getPlatformBusinesses,
  getPlatformCities,
  loginAdmin,
  searchPlatformRegistryCities,
  updateBusinessUser,
  updatePlatformBusiness,
  updatePlatformCityStatus,
} from "../lib/api";
import {
  BUSINESS_USER_ROLES,
  EMPTY_BUSINESS_FORM,
  EMPTY_BUSINESS_USER_FORM,
} from "../constants";
import {
  businessFormToPayload,
  businessToForm,
  slugify,
} from "../utils/format";

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    return {
      ...(session.user || {}),
      role: session.user?.role || session.role,
      business: session.business,
    };
  } catch {
    return null;
  }
}

function localAdminHref(business) {
  const slug = business?.slug || "";
  const citySlug = business?.location?.citySlug || business?.city?.slug || "";
  if (!slug) return "/admin";
  return citySlug ? `/${citySlug}/${slug}/admin` : `/${slug}/admin`;
}

export default function usePlatformConsoleController() {
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [currentUser, setCurrentUser] = useState(() => readSession());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [refreshing, setRefreshing] = useState(false);

  const [platformBusinesses, setPlatformBusinesses] = useState([]);
  const [platformCities, setPlatformCities] = useState([]);
  const [cityRegistryQuery, setCityRegistryQuery] = useState("");
  const [cityRegistryResults, setCityRegistryResults] = useState([]);
  const [cityRegistryLoading, setCityRegistryLoading] = useState(false);
  const [cityActivationSaving, setCityActivationSaving] = useState("");
  const [cityStatusSaving, setCityStatusSaving] = useState("");

  const [businessForm, setBusinessForm] = useState(EMPTY_BUSINESS_FORM);
  const [editingBusinessId, setEditingBusinessId] = useState("");
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessCityFilter, setBusinessCityFilter] = useState("all");
  const [businessStatusFilter, setBusinessStatusFilter] = useState("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all");

  const [selectedBusinessForUsers, setSelectedBusinessForUsers] = useState(null);
  const [businessUsers, setBusinessUsers] = useState([]);
  const [businessUsersLoading, setBusinessUsersLoading] = useState(false);
  const [businessUserForm, setBusinessUserForm] = useState(
    EMPTY_BUSINESS_USER_FORM,
  );
  const [editingBusinessUserId, setEditingBusinessUserId] = useState("");
  const [businessUserSaving, setBusinessUserSaving] = useState(false);

  const isGlobalAdmin = currentUser?.role === "global_admin";

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function hydrate() {
      setLoading(true);
      try {
        const session = await getMe(token);
        if (cancelled) return;
        const user = {
          ...(session.user || {}),
          role: session.user?.role || session.role,
          business: session.business,
        };
        localStorage.setItem(
          "admin_session",
          JSON.stringify({
            role: user.role,
            user: session.user,
            business: session.business,
          }),
        );
        setCurrentUser(user);

        if (user.role !== "global_admin" && session.business?.slug) {
          window.location.replace(localAdminHref(session.business));
        }
      } catch (error) {
        if (!cancelled) {
          if (error.status === 401) logout();
          else notify(error.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !isGlobalAdmin) return;
    refreshPlatformResources();
  }, [token, isGlobalAdmin]);

  useEffect(() => {
    if (!token || !isGlobalAdmin) return;
    const timer = window.setTimeout(() => {
      loadCityRegistry(cityRegistryQuery);
    }, cityRegistryQuery.trim() ? 260 : 0);
    return () => window.clearTimeout(timer);
  }, [token, isGlobalAdmin, cityRegistryQuery]);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2600);
  }

  async function login(event) {
    event.preventDefault();
    try {
      const data = await loginAdmin(username, password);
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem(
        "admin_session",
        JSON.stringify({
          role: data.role,
          user: data.user,
          business: data.business,
        }),
      );
      setCurrentUser({
        ...(data.user || {}),
        role: data.user?.role || data.role,
        business: data.business,
      });
      setToken(data.token);

      if (data.role !== "global_admin" && data.business?.slug) {
        window.location.replace(localAdminHref(data.business));
      }
    } catch (error) {
      notify(error.message || "Credenziali non valide.");
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session");
    setToken("");
    setCurrentUser(null);
    setPlatformBusinesses([]);
    setPlatformCities([]);
    setBusinessUsers([]);
    setSelectedBusinessForUsers(null);
  }

  async function refreshPlatformResources() {
    if (!token || !isGlobalAdmin) return;
    setRefreshing(true);
    try {
      const [businesses, cities] = await Promise.all([
        getPlatformBusinesses(token),
        getPlatformCities(token),
      ]);
      setPlatformBusinesses(businesses);
      setPlatformCities(cities);
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadCityRegistry(query = "") {
    setCityRegistryLoading(true);
    try {
      setCityRegistryResults(await searchPlatformRegistryCities(token, query));
    } catch (error) {
      if (error.status === 401) logout();
      else notify(error.message);
    } finally {
      setCityRegistryLoading(false);
    }
  }

  async function activateCityFromRegistry(registryCity, status = "active") {
    if (!registryCity?._id) return notify("Seleziona un comune dal registro.");
    setCityActivationSaving(registryCity._id);
    try {
      const city = await activatePlatformCity(
        {
          registryId: registryCity._id,
          status,
          active: status !== "disabled",
        },
        token,
      );
      notify(`${city.name} attivata nella piattaforma.`);
      setBusinessForm((current) => ({
        ...current,
        cityId: city._id,
        citySlug: city.slug,
        cityName: city.name,
        province: city.province || "",
        region: city.region || "",
      }));
      await Promise.all([
        refreshPlatformResources(),
        loadCityRegistry(cityRegistryQuery),
      ]);
    } catch (error) {
      notify(error.message);
    } finally {
      setCityActivationSaving("");
    }
  }

  async function changeCityStatus(city, status) {
    if (!city?._id) return;
    setCityStatusSaving(city._id);
    try {
      await updatePlatformCityStatus(
        city._id,
        {
          status,
          active: status !== "disabled",
          heroTitle: city.heroTitle || "",
          heroDescription: city.heroDescription || "",
          sortOrder: city.sortOrder || 0,
        },
        token,
      );
      notify(`Stato citta aggiornato: ${city.name}.`);
      await refreshPlatformResources();
    } catch (error) {
      notify(error.message);
    } finally {
      setCityStatusSaving("");
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

  function chooseBusinessCity(cityIdOrSlug) {
    const city = platformCities.find(
      (item) => item._id === cityIdOrSlug || item.slug === cityIdOrSlug,
    );
    if (!city) return;
    setBusinessForm((current) => ({
      ...current,
      cityId: city._id || "",
      citySlug: city.slug || "",
      cityName: city.name || "",
      province: city.province || "",
      region: city.region || "",
    }));
  }

  function editBusiness(business) {
    setEditingBusinessId(business._id);
    setBusinessForm(businessToForm(business));
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
    if (!businessForm.cityId && !businessForm.citySlug) {
      return notify("Seleziona una citta attivata.");
    }

    setBusinessSaving(true);
    try {
      const payload = businessFormToPayload(businessForm);
      if (editingBusinessId) {
        await updatePlatformBusiness(editingBusinessId, payload, token);
        notify("Business aggiornato.");
      } else {
        await createPlatformBusiness(payload, token);
        notify("Business creato.");
      }
      resetBusinessForm();
      await refreshPlatformResources();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusinessSaving(false);
    }
  }

  async function openBusinessUsers(business) {
    setSelectedBusinessForUsers(business);
    setBusinessUserForm(EMPTY_BUSINESS_USER_FORM);
    setEditingBusinessUserId("");
    setBusinessUsersLoading(true);
    try {
      setBusinessUsers(await getBusinessUsers(business._id, token));
    } catch (error) {
      notify(error.message);
    } finally {
      setBusinessUsersLoading(false);
    }
  }

  function editBusinessUser(user) {
    setEditingBusinessUserId(user._id);
    setBusinessUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: BUSINESS_USER_ROLES.includes(user.role) ? user.role : "admin",
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
      const payload = {
        ...businessUserForm,
        name: businessUserForm.name.trim(),
        email: businessUserForm.email.trim(),
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
      setBusinessUsers(
        await getBusinessUsers(selectedBusinessForUsers._id, token),
      );
      await refreshPlatformResources();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusinessUserSaving(false);
    }
  }

  const assignableCities = useMemo(
    () =>
      platformCities.filter(
        (city) => city.active !== false && city.status !== "disabled",
      ),
    [platformCities],
  );

  const filteredBusinesses = useMemo(() => {
    const needle = businessQuery.trim().toLowerCase();
    return platformBusinesses.filter((business) => {
      const citySlug = business.location?.citySlug || business.city?.slug || "";
      const status = business.subscriptionStatus || "trialing";
      const type = business.type || "custom";
      if (businessCityFilter !== "all" && citySlug !== businessCityFilter) {
        return false;
      }
      if (businessStatusFilter !== "all" && status !== businessStatusFilter) {
        return false;
      }
      if (businessTypeFilter !== "all" && type !== businessTypeFilter) {
        return false;
      }
      if (!needle) return true;
      return [
        business.name,
        business.slug,
        business.branding?.publicName,
        business.owner?.name,
        business.owner?.email,
        business.location?.cityName,
        business.location?.citySlug,
        business.type,
        business.plan,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [
    businessCityFilter,
    businessQuery,
    businessStatusFilter,
    businessTypeFilter,
    platformBusinesses,
  ]);

  const allBusinessUsers = useMemo(() => {
    return platformBusinesses
      .map((business) => ({
        business,
        owner: business.owner,
      }))
      .filter((row) => row.owner?.email);
  }, [platformBusinesses]);

  const platformStats = useMemo(() => {
    return platformBusinesses.reduce(
      (totals, business) => {
        const metrics = business.metrics || {};
        const hasLogo = Boolean(business.branding?.logoUrl);
        const hasCover = Boolean(business.branding?.coverImageUrl);
        totals.businesses += 1;
        totals.orders += metrics.orders || 0;
        totals.revenue += metrics.revenue || 0;
        totals.pending += (metrics.preparing || 0) + (metrics.ready || 0);
        totals.products += metrics.products || 0;
        totals.customers += metrics.customers || 0;
        if (business.subscriptionStatus === "active") totals.active += 1;
        if (business.subscriptionStatus === "trialing") totals.trialing += 1;
        if (!business.owner?.email) totals.missingOwner += 1;
        if (!hasLogo || !hasCover) totals.assetIssues += 1;
        return totals;
      },
      {
        businesses: 0,
        active: 0,
        trialing: 0,
        orders: 0,
        revenue: 0,
        pending: 0,
        products: 0,
        customers: 0,
        missingOwner: 0,
        assetIssues: 0,
      },
    );
  }, [platformBusinesses]);

  const cityStats = useMemo(() => {
    return platformCities.reduce(
      (totals, city) => {
        totals.total += 1;
        if (city.status === "coming_soon") totals.comingSoon += 1;
        else if (city.status === "disabled" || city.active === false) {
          totals.disabled += 1;
        } else totals.active += 1;
        return totals;
      },
      { total: 0, active: 0, comingSoon: 0, disabled: 0 },
    );
  }, [platformCities]);

  return {
    activateCityFromRegistry,
    allBusinessUsers,
    assignableCities,
    businessCityFilter,
    businessForm,
    businessQuery,
    businessSaving,
    businessStatusFilter,
    businessTypeFilter,
    businessUserForm,
    businessUserSaving,
    businessUsers,
    businessUsersLoading,
    changeCityStatus,
    chooseBusinessCity,
    cityActivationSaving,
    cityRegistryLoading,
    cityRegistryQuery,
    cityRegistryResults,
    cityStats,
    cityStatusSaving,
    currentUser,
    editBusiness,
    editBusinessUser,
    editingBusinessId,
    editingBusinessUserId,
    filteredBusinesses,
    isGlobalAdmin,
    loading,
    login,
    logout,
    openBusinessUsers,
    password,
    platformBusinesses,
    platformCities,
    platformStats,
    refreshing,
    refreshPlatformResources,
    resetBusinessForm,
    resetBusinessUserForm,
    saveBusiness,
    saveBusinessUser,
    selectedBusinessForUsers,
    setBusinessCityFilter,
    setBusinessQuery,
    setBusinessStatusFilter,
    setBusinessTypeFilter,
    setBusinessUserForm,
    setCityRegistryQuery,
    setPassword,
    setUsername,
    toast,
    token,
    updateBusinessForm,
    username,
  };
}
