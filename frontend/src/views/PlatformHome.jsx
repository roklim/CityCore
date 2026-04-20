import { useEffect, useMemo, useState } from "react";
import {
  getPlatformBusinesses,
  getPublicBusinesses,
  loginAdmin,
} from "../lib/api";
import { money } from "../utils/format";
import Toast from "../components/Toast";
import EmptyState from "../components/ui/EmptyState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";

const PUBLIC_TYPE_FILTERS = [
  { id: "all", label: "Tutti", icon: "grid" },
  { id: "food", label: "Mangia", icon: "slice" },
  { id: "bar", label: "Bar", icon: "cup" },
  { id: "rental", label: "Noleggi", icon: "bike" },
  { id: "shop", label: "Negozi", icon: "bag" },
  { id: "service", label: "Servizi", icon: "wrench" },
  { id: "event", label: "Eventi", icon: "calendar" },
  { id: "report", label: "Segnalazioni", icon: "alert" },
];

const SECTION_LABELS = {
  all: "Tutte le attività",
  food: "Ristoranti e pizzerie",
  bar: "Bar e locali",
  rental: "Noleggi",
  shop: "Negozi",
  service: "Servizi",
  event: "Eventi",
  report: "Segnalazioni",
};

const EMPTY_MESSAGES = {
  event: "Nessun evento in programma al momento.",
  report: "Nessuna segnalazione attiva.",
  rental: "Nessun noleggio disponibile.",
};

const QUICK_ACTIONS = [
  { label: "Gestisci menu", icon: "M", href: "menu" },
  { label: "Vedi ordini", icon: "O", href: "orders" },
  { label: "Configura fasce", icon: "D", href: "availability" },
  { label: "Vedi clienti", icon: "C", href: "customers" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAdminSession() {
  try {
    return {
      token: localStorage.getItem("admin_token") || "",
      ...(JSON.parse(localStorage.getItem("admin_session") || "{}") || {}),
    };
  } catch {
    return { token: "" };
  }
}

function businessName(business) {
  return (
    business?.branding?.publicName || business?.name || business?.slug || "App"
  );
}

function businessInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function businessTypeLabel(type = "") {
  const labels = {
    pizzeria: "Pizzeria",
    sushi: "Sushi",
    restaurant: "Ristorante",
    bar: "Bar",
    bike_rental: "Noleggio bici",
    shop: "Negozio",
    service: "Servizio",
    event: "Evento",
    report: "Segnalazione",
    custom: "Altro",
  };
  return labels[type] || "Altro";
}

function businessTypeIcon(type = "") {
  if (["pizzeria", "sushi", "restaurant"].includes(type)) return "slice";
  if (type === "bar") return "cup";
  if (type === "bike_rental") return "bike";
  if (type === "shop") return "bag";
  if (type === "service") return "wrench";
  if (type === "event") return "calendar";
  if (type === "report") return "alert";
  return "tag";
}

function businessCoverUrl(business) {
  return (
    business?.branding?.coverImageUrl ||
    business?.branding?.heroImageUrl ||
    business?.branding?.imageUrl ||
    business?.settings?.coverImageUrl ||
    business?.settings?.heroImageUrl ||
    business?.settings?.imageUrl ||
    ""
  );
}

function typeBucket(type = "") {
  if (["pizzeria", "sushi", "restaurant"].includes(type)) return "food";
  if (type === "bar") return "bar";
  if (type === "bike_rental") return "rental";
  if (type === "shop") return "shop";
  if (type === "service") return "service";
  if (type === "event") return "event";
  if (type === "report") return "report";
  return "other";
}

function statusLabel(status = "") {
  if (status === "active") return "Attivo";
  if (status === "trialing") return "Trial";
  if (status === "past_due") return "Da verificare";
  if (status === "cancelled") return "Inattivo";
  return "Pubblico";
}

function isBusinessActive(business) {
  return business.subscriptionStatus !== "cancelled";
}

function hasMenuReady(business) {
  if (!business?.metrics) return true;
  const { metrics } = business;
  return Boolean(
    metrics.products ||
    metrics.availableProducts ||
    metrics.menuItems ||
    metrics.activeProducts,
  );
}

function cardFooterLabel(type, menuReady) {
  if (type === "event") return "Vedi dettagli";
  if (type === "report") return "Vedi segnalazione";
  if (type === "rental" || type === "bike_rental")
    return "Controlla disponibilità";
  return menuReady ? "Menu disponibile" : "Disponibile a breve";
}

function readRouteMode(mode) {
  if (mode) return mode;
  return window.location.pathname === "/admin" ? "admin" : "home";
}

// ── Highlight ─────────────────────────────────────────────────────────────────

function Highlight({ text, search }) {
  const value = String(text || "");
  const needle = search.trim();
  if (!needle) return value;
  const index = value.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark>{value.slice(index, index + needle.length)}</mark>
      {value.slice(index + needle.length)}
    </>
  );
}

// ── BusinessLogo ──────────────────────────────────────────────────────────────

function BusinessLogo({ business, size = "md" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = businessName(business);
  const logoUrl = business.branding?.logoUrl;
  const color = business.branding?.primaryColor || "var(--cagli-basil)";
  const showLogo = logoUrl && !imageFailed;

  return (
    <span
      className={`cagli-business-logo ${size}`}
      style={{ background: color }}
    >
      {showLogo ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        businessInitials(name)
      )}
    </span>
  );
}

// ── Icon ──────────────────────────────────────────────────────────────────────

function Icon({ name }) {
  const p = { "aria-hidden": "true", viewBox: "0 0 24 24", focusable: "false" };
  if (name === "user")
    return (
      <svg {...p}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...p}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (name === "slice")
    return (
      <svg {...p}>
        <path d="M5 20 19 4l-3 16H5Z" />
        <path d="M9 16h.01M13 11h.01" />
      </svg>
    );
  if (name === "cup")
    return (
      <svg {...p}>
        <path d="M7 8h9v6a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4V8Z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2M7 5h9" />
      </svg>
    );
  if (name === "grid")
    return (
      <svg {...p}>
        <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" />
      </svg>
    );
  if (name === "bike")
    return (
      <svg {...p}>
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6h-3l-3 7h8l-2-7zM5.5 17.5l4.5-7" />
      </svg>
    );
  if (name === "bag")
    return (
      <svg {...p}>
        <path d="M6 2 3 6v14h18V6l-3-4z" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  if (name === "wrench")
    return (
      <svg {...p}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  if (name === "calendar")
    return (
      <svg {...p}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  if (name === "alert")
    return (
      <svg {...p}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M5 7h14M7 12h10M9 17h6" />
    </svg>
  );
}

// ── PlatformHome (root) ───────────────────────────────────────────────────────

export default function PlatformHome({ mode }) {
  const routeMode = readRouteMode(mode);
  const [session, setSession] = useState(() => readAdminSession());
  const [publicBusinesses, setPublicBusinesses] = useState([]);
  const [platformBusinesses, setPlatformBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(
    routeMode === "admin" && !session.token,
  );
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [toast, setToast] = useState("");

  const isGlobalAdmin = session.role === "global_admin";
  const isBusinessUser =
    session.role && ["owner", "admin", "staff"].includes(session.role);
  const ownSlug = session.business?.slug || "";

  useEffect(() => {
    let cancelled = false;
    async function loadDirectory() {
      setLoading(true);
      try {
        const publicList = await getPublicBusinesses();
        if (!cancelled) setPublicBusinesses(publicList);
        if (session.token && isGlobalAdmin) {
          const platformList = await getPlatformBusinesses(session.token);
          if (!cancelled) setPlatformBusinesses(platformList);
        } else {
          setPlatformBusinesses([]);
        }
      } catch (error) {
        if (!cancelled) setToast(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDirectory();
    return () => {
      cancelled = true;
    };
  }, [session.token, isGlobalAdmin]);

  useEffect(() => {
    setLoginOpen(routeMode === "admin" && !session.token);
  }, [routeMode, session.token]);

  useEffect(() => {
    if (routeMode !== "admin" || !isBusinessUser || !ownSlug) return;
    window.location.replace(`/${ownSlug}/admin`);
  }, [routeMode, isBusinessUser, ownSlug]);

  const businesses =
    isGlobalAdmin && platformBusinesses.length
      ? platformBusinesses
      : publicBusinesses;

  const filteredBusinesses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesType =
        typeFilter === "all" || typeBucket(business.type) === typeFilter;
      if (!matchesType) return false;
      if (!needle) return true;
      return [
        business.name,
        business.branding?.publicName,
        business.slug,
        business.type,
        business.owner?.email,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [businesses, search, typeFilter]);

  const platformStats = useMemo(() => {
    return platformBusinesses.reduce(
      (t, b) => {
        t.businesses += 1;
        t.orders += b.metrics?.orders || 0;
        t.revenue += b.metrics?.revenue || 0;
        if (b.subscriptionStatus === "active") t.active += 1;
        return t;
      },
      { businesses: 0, active: 0, orders: 0, revenue: 0 },
    );
  }, [platformBusinesses]);

  const heroStats = useMemo(
    () => ({
      openNow: businesses.filter((b) => b.isOpen || b.settings?.isOpen).length,
      rentals: businesses.filter((b) => b.type === "bike_rental").length,
    }),
    [businesses],
  );

  const ownerBusiness = useMemo(() => {
    if (!isBusinessUser || !ownSlug) return null;
    return businesses.find((b) => b.slug === ownSlug) || session.business;
  }, [businesses, isBusinessUser, ownSlug, session.business]);

  useEffect(() => {
    if (isGlobalAdmin) {
      document.title = "Console piattaforma - Cagli Local";
      return;
    }
    if (isBusinessUser && ownerBusiness) {
      document.title = `${businessName(ownerBusiness)} - Area gestione`;
      return;
    }
    if (routeMode === "admin") {
      document.title = "Area gestori - Cagli Local";
      return;
    }
    document.title = "Cagli Local - Attività locali";
  }, [isBusinessUser, isGlobalAdmin, ownerBusiness, routeMode]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const data = await loginAdmin(username, password);
      const nextSession = {
        token: data.token,
        role: data.role,
        user: data.user,
        business: data.business,
      };
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem(
        "admin_session",
        JSON.stringify({
          role: data.role,
          user: data.user,
          business: data.business,
        }),
      );
      setSession(nextSession);
      setLoginOpen(false);
      if (data.role !== "global_admin" && data.business?.slug) {
        window.location.replace(`/${data.business.slug}/admin`);
      }
    } catch (error) {
      setLoginError(error.message || "Credenziali non valide");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session");
    setSession({ token: "" });
    setPlatformBusinesses([]);
  }

  return (
    <main className={`cagli-page ${isGlobalAdmin ? "admin" : "public"}`}>
      <CagliHeader
        isGlobalAdmin={isGlobalAdmin}
        isLogged={Boolean(session.token)}
        onLogin={() => setLoginOpen(true)}
        onLogout={logout}
      />

      {!session.token && (
        <PublicHero
          businesses={filteredBusinesses}
          heroStats={heroStats}
          loading={loading}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      )}

      {isGlobalAdmin && (
        <GlobalAdminView
          businesses={filteredBusinesses}
          loading={loading}
          onToast={setToast}
          platformStats={platformStats}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      )}

      {isBusinessUser && ownerBusiness && (
        <OwnerHome business={ownerBusiness} user={session.user} />
      )}

      {isBusinessUser && (
        <PublicHero
          businesses={filteredBusinesses}
          heroStats={heroStats}
          loading={loading}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      )}

      <CagliFooter onLogin={() => setLoginOpen(true)} />

      {loginOpen && (
        <LoginModal
          error={loginError}
          loading={loginLoading}
          onClose={() => {
            setLoginOpen(false);
            setLoginError("");
          }}
          onSubmit={handleLogin}
          password={password}
          setPassword={setPassword}
          setShowPassword={setShowPassword}
          setUsername={setUsername}
          showPassword={showPassword}
          username={username}
        />
      )}

      <Toast message={toast} />
    </main>
  );
}

// ── CagliHeader ───────────────────────────────────────────────────────────────

function CagliHeader({ isGlobalAdmin, isLogged, onLogin, onLogout }) {
  return (
    <header className={`cagli-header ${isGlobalAdmin ? "admin" : ""}`}>
      <a className="cagli-brand" href="/">
        <img
          src="/public/businesses/home/logo.png"
          alt="Cagli"
          className="cagli-logo"
        />
        <span>Scopri le attività locali di Cagli</span>
      </a>
      <nav>
        {isGlobalAdmin && (
          <>
            <a className="active" href="/admin">
              Console globale
            </a>
            <a href="/admin/businesses?section=businesses">Gestione business</a>
            <span className="cagli-notification">0</span>
          </>
        )}
        {isLogged ? (
          <button
            className="cagli-text-button"
            type="button"
            onClick={onLogout}
          >
            Esci
          </button>
        ) : (
          <button
            className="cagli-manager-button"
            type="button"
            onClick={onLogin}
            aria-label="Area gestori"
            title="Area gestori"
          >
            <Icon name="user" />
          </button>
        )}
      </nav>
    </header>
  );
}

// ── PublicHero ────────────────────────────────────────────────────────────────

function PublicHero({
  businesses,
  heroStats = {},
  loading,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  const { openNow = 0, rentals = 0 } = heroStats;
  const totalActive = businesses.filter((b) => isBusinessActive(b)).length;
  const events = businesses.filter((b) => b.type === "event").length;
  const visibleCount = businesses.length;
  const sectionLabel = SECTION_LABELS[typeFilter] || "Tutte le attività";

  return (
    <>
      <section className="cagli-public-hero">
        <div className="cagli-public-hero-inner">
          <div className="cagli-hero-copy">
            <h1>La tua citta a portata di mano.</h1>
            <p>
              Locali, negozi, noleggi ed eventi del territorio. Ordina, prenota
              e scopri cosa succede in città.
            </p>
            {(totalActive > 0 || openNow > 0 || events > 0 || rentals > 0) && (
              <div className="cagli-hero-stats" aria-label="Riepilogo attività">
                {totalActive > 0 && (
                  <span>
                    <strong>{totalActive}</strong>attività attive
                  </span>
                )}
                {openNow > 0 && (
                  <span>
                    <strong>{openNow}</strong>aperti ora
                  </span>
                )}
                {events > 0 && (
                  <span>
                    <strong>{events}</strong>eventi
                  </span>
                )}
                {rentals > 0 && (
                  <span>
                    <strong>{rentals}</strong>noleggi
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="cagli-hero-search-card">
          <label className="cagli-search">
            <span aria-hidden="true">
              <Icon name="search" />
            </span>
            <input
              placeholder="Cerca un locale, evento, noleggio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="cagli-filter-pills">
            {PUBLIC_TYPE_FILTERS.map((filter) => (
              <button
                className={typeFilter === filter.id ? "active" : ""}
                key={filter.id}
                type="button"
                onClick={() => setTypeFilter(filter.id)}
              >
                <Icon name={filter.icon} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="cagli-directory-title">
        <h2>{sectionLabel}</h2>
        <span>{loading ? "Caricamento..." : `${visibleCount} risultati`}</span>
      </section>

      <section className="cagli-public-grid">
        {loading ? (
          <SkeletonCards />
        ) : businesses.length === 0 ? (
          <EmptyDirectory typeFilter={typeFilter} />
        ) : (
          businesses.map((business, index) => (
            <PublicBusinessCard
              business={business}
              index={index}
              key={business._id || business.slug}
              search={search}
            />
          ))
        )}
      </section>
    </>
  );
}

// ── GlobalAdminView ───────────────────────────────────────────────────────────

function GlobalAdminView({
  businesses,
  loading,
  onToast,
  platformStats,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  return (
    <section className="cagli-admin-console">
      <div className="cagli-admin-overview">
        <div className="cagli-admin-title">
          <p>Console piattaforma</p>
          <h1>Console globale</h1>
          <span>
            Gestisci locali, immagini, menu e accessi da un unico punto.
          </span>
        </div>
        <div className="cagli-admin-quick-actions">
          <a href="/admin/businesses?section=businesses">Aggiungi business</a>
          <a href="/">Vedi directory</a>
        </div>
      </div>

      <section className="cagli-admin-metrics">
        <MetricCard
          icon="B"
          label="Business"
          value={platformStats.businesses}
        />
        <MetricCard icon="A" label="Attivi" value={platformStats.active} />
        <MetricCard icon="O" label="Ordini" value={platformStats.orders} />
        <MetricCard
          icon="EUR"
          label="GMV"
          value={money(platformStats.revenue)}
        />
      </section>

      <section className="cagli-admin-directory-head">
        <div>
          <p>Directory</p>
          <h2>Tutti i locali</h2>
          <span>
            {loading
              ? "Caricamento..."
              : `${businesses.length} risultati filtrati`}
          </span>
        </div>
        <div className="cagli-admin-tools">
          <input
            placeholder="Cerca nome, slug o owner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {PUBLIC_TYPE_FILTERS.map((f) => (
              <option value={f.id} key={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <a href="/admin/businesses?section=businesses">Nuovo locale</a>
        </div>
      </section>

      <section className="cagli-admin-grid">
        {loading ? (
          <SkeletonCards admin />
        ) : businesses.length === 0 ? (
          <EmptyDirectory typeFilter={typeFilter} />
        ) : (
          businesses.map((business) => (
            <AdminBusinessCard
              business={business}
              key={business._id || business.slug}
              onToast={onToast}
            />
          ))
        )}
      </section>
    </section>
  );
}

// ── OwnerHome ─────────────────────────────────────────────────────────────────

function OwnerHome({ business, user }) {
  const slug = business.slug || "";
  const metrics = business.metrics || {};
  const name = businessName(business);

  return (
    <section className="cagli-owner-home">
      <header className="cagli-owner-header">
        <BusinessLogo business={business} size="lg" />
        <div>
          <span>Ciao, {user?.name || user?.email || "gestore"}</span>
          <h1>{name}</h1>
        </div>
        <nav>
          <a className="active" href={`/${slug}/admin`}>
            Il mio banco
          </a>
          <a href={`/${slug}/admin?section=menu`}>Menu</a>
          <a href={`/${slug}/admin?section=orders`}>Ordini</a>
          <a href={`/${slug}/admin?section=settings`}>Impostazioni</a>
        </nav>
        <a className="cagli-outline-link" href={`/${slug}`}>
          Apri menu pubblico
        </a>
      </header>

      <article className="cagli-owner-hero-card">
        <BusinessLogo business={business} size="xl" />
        <div>
          <span className="cagli-type-badge">
            {businessTypeLabel(business.type)}
          </span>
          <h2>{name}</h2>
          <p>/{slug}</p>
          <strong>{statusLabel(business.subscriptionStatus)}</strong>
        </div>
        <div className="cagli-owner-inline-metrics">
          <span>
            <b>{metrics.orders || 0}</b>Ordini oggi
          </span>
          <span>
            <b>{money(metrics.revenue || 0)}</b>Incasso
          </span>
          <span>
            <b>{metrics.availableProducts || 0}</b>Prodotti attivi
          </span>
          <span>
            <b>{metrics.customers || 0}</b>Clienti
          </span>
        </div>
        <a href={`/${slug}/admin`}>Vai all'area gestione</a>
      </article>

      <section className="cagli-owner-quick-grid">
        {QUICK_ACTIONS.map((action) => (
          <a href={`/${slug}/admin?section=${action.href}`} key={action.href}>
            <span>{action.icon}</span>
            <strong>{action.label}</strong>
            <i>-&gt;</i>
          </a>
        ))}
      </section>
    </section>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value }) {
  return (
    <article>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

// ── PublicBusinessCard ────────────────────────────────────────────────────────

function PublicBusinessCard({ business, index, search }) {
  const slug = business.slug || "";
  const name = businessName(business);
  const active = isBusinessActive(business);
  const typeLabel = businessTypeLabel(business.type);
  const typeIcon = businessTypeIcon(business.type);
  const coverUrl = businessCoverUrl(business);
  const bucket = typeBucket(business.type);
  const menuReady = hasMenuReady(business);
  const footerLabel = cardFooterLabel(business.type, menuReady);
  const description = business.settings?.publicMessage || "";
  const isOpen = business.isOpen || business.settings?.isOpen;
  const openingHours = business.settings?.openingHours || "Orari da verificare";

  return (
    <a
      className={`cagli-public-card ${active ? "" : "disabled"}`}
      href={active ? `/${slug}` : undefined}
      style={{ animationDelay: `${250 + index * 60}ms` }}
      aria-disabled={!active}
      aria-label={`${active ? "Apri" : "Non disponibile"} ${name}`}
    >
      <header
        className={`cagli-card-media ${coverUrl ? "has-image" : ""} ${bucket}`}
        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
      >
        <BusinessLogo business={business} />
        <span className="cagli-media-icon" aria-hidden="true">
          <Icon name={typeIcon} />
        </span>
      </header>
      <div>
        <div className="cagli-card-badges">
          <span className="cagli-type-badge">
            <Icon name={typeIcon} />
            {active ? typeLabel : "Temporaneamente chiuso"}
          </span>
          {active && (
            <span className={`cagli-open-badge ${isOpen ? "open" : "closed"}`}>
              {isOpen ? "Aperto" : "Chiuso"}
            </span>
          )}
        </div>
        <h2>
          <Highlight text={name} search={search} />
        </h2>
        {description && <p>{description}</p>}
        <small>
          <Icon name="clock" />
          {openingHours}
        </small>
      </div>
      <strong className={menuReady ? "ready" : "soon"}>{footerLabel}</strong>
    </a>
  );
}

// ── AdminBusinessCard ─────────────────────────────────────────────────────────

function AdminBusinessCard({ business, onToast }) {
  const slug = business.slug || "";
  const name = businessName(business);
  const metrics = business.metrics || {};
  const status = statusLabel(business.subscriptionStatus);
  const typeIcon = businessTypeIcon(business.type);
  const coverUrl = businessCoverUrl(business);
  const logoUrl = business.branding?.logoUrl || "";
  const bucket = typeBucket(business.type);
  const publicPath = `/${slug}`;
  const adminPath = `/${slug}/admin`;
  const logoPath = `/businesses/${slug}/logo.png`;
  const coverPath = `/businesses/${slug}/cover.jpg`;

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.(message);
    } catch {
      onToast?.(
        "Non riesco a copiare automaticamente. Seleziona il testo manualmente.",
      );
    }
  }

  return (
    <article className="cagli-admin-card">
      <header
        className={`cagli-card-media cagli-admin-card-media ${coverUrl ? "has-image" : ""} ${bucket}`}
        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
      >
        <BusinessLogo business={business} />
        <strong
          className={`cagli-status ${business.subscriptionStatus || "public"}`}
        >
          {status}
        </strong>
      </header>

      <div className="cagli-admin-card-main">
        <span className="cagli-type-badge">
          <Icon name={typeIcon} />
          {businessTypeLabel(business.type)}
        </span>
        <h2>{name}</h2>
        <p>{publicPath}</p>
      </div>

      <div className="cagli-admin-card-metrics">
        <span>
          <small>Ordini</small>
          <b>{metrics.orders || 0}</b>
        </span>
        <span>
          <small>GMV</small>
          <b>{money(metrics.revenue || 0)}</b>
        </span>
        <span>
          <small>Prodotti</small>
          <b>{metrics.products || 0}</b>
        </span>
        <span>
          <small>Clienti</small>
          <b>{metrics.customers || 0}</b>
        </span>
      </div>

      <div className="cagli-admin-tags">
        <span>{business.plan || "free"}</span>
        <span>{business.subscriptionStatus || "public"}</span>
        <span>{logoUrl ? "Logo ok" : "Logo mancante"}</span>
        <span>{coverUrl ? "Cover ok" : "Cover mancante"}</span>
        {business.owner?.email && (
          <small title={business.owner.email}>{business.owner.email}</small>
        )}
      </div>

      <div className="cagli-admin-card-actions">
        <a href={publicPath}>Pubblico</a>
        <a href={adminPath}>Admin</a>
        <a href="/admin/businesses?section=businesses">Modifica</a>
        <button
          type="button"
          onClick={() =>
            copyText(
              `${window.location.origin}${publicPath}\n${window.location.origin}${adminPath}`,
              `Link copiati per ${name}`,
            )
          }
        >
          Copia link
        </button>
      </div>

      <div className="cagli-admin-asset-actions">
        <button
          type="button"
          onClick={() =>
            copyText(logoPath, `Percorso logo copiato per ${name}`)
          }
        >
          Copia logo
        </button>
        <button
          type="button"
          onClick={() =>
            copyText(coverPath, `Percorso cover copiato per ${name}`)
          }
        >
          Copia cover
        </button>
      </div>
    </article>
  );
}

// ── LoginModal ────────────────────────────────────────────────────────────────

function LoginModal({
  error,
  loading,
  onClose,
  onSubmit,
  password,
  setPassword,
  setShowPassword,
  setUsername,
  showPassword,
  username,
}) {
  return (
    <div className="cagli-login-overlay" onMouseDown={onClose}>
      <section
        className="cagli-login-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="cagli-modal-close" type="button" onClick={onClose}>
          x
        </button>
        <div className="cagli-login-logo">C</div>
        <h2>Area gestori</h2>
        <p>Area riservata a gestori e amministratori</p>
        <form onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <div className="cagli-password-row">
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Nascondi" : "Mostra"}
              </button>
            </div>
          </label>
          {error && <strong className="cagli-login-error">{error}</strong>}
          <button type="submit" disabled={loading}>
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </section>
    </div>
  );
}

// ── CagliFooter ───────────────────────────────────────────────────────────────

function CagliFooter({ onLogin }) {
  return (
    <footer className="cagli-footer">
      <span>Cagli Local - 2026</span>
      <button type="button" onClick={onLogin}>
        Area gestori
      </button>
    </footer>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function SkeletonCards({ admin = false }) {
  return <LoadingSkeleton variant="card" count={admin ? 8 : 6} />;
}

function EmptyDirectory({ typeFilter = "all" }) {
  const description =
    EMPTY_MESSAGES[typeFilter] ||
    "Prova con un altro termine o cambia categoria.";
  return (
    <EmptyState title="Nessuna attività trovata" description={description} />
  );
}
