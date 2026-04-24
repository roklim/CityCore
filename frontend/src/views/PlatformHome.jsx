import { useEffect, useMemo, useState } from "react";
import {
  getPublicBusinesses,
  getPublicCity,
  loginAdmin,
} from "../lib/api";
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

function BusinessLogo({ business }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = businessName(business);
  const logoUrl = business.branding?.logoUrl;
  const color = business.branding?.primaryColor || "var(--cagli-basil)";
  const showLogo = logoUrl && !imageFailed;

  return (
    <span
      className="cagli-business-logo"
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

// ── PlatformHome (city directory) ─────────────────────────────────────────────

export default function PlatformHome({ citySlug = "" }) {
  const [session, setSession] = useState(() => readAdminSession());
  const [currentCity, setCurrentCity] = useState(null);
  const [publicBusinesses, setPublicBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [toast, setToast] = useState("");

  const isGlobalAdmin = session.role === "global_admin";

  useEffect(() => {
    let cancelled = false;
    async function loadDirectory() {
      setLoading(true);
      try {
        const [selectedCity, publicList] = await Promise.all([
          citySlug ? getPublicCity(citySlug) : Promise.resolve(null),
          citySlug ? getPublicBusinesses(citySlug) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setCurrentCity(selectedCity);
          setPublicBusinesses(publicList);
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
  }, [citySlug]);

  const businesses = publicBusinesses;

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
        business.location?.cityName,
        business.location?.citySlug,
        business.owner?.email,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [businesses, search, typeFilter]);

  const heroStats = useMemo(
    () => ({
      openNow: businesses.filter((b) => b.isOpen || b.settings?.isOpen).length,
      rentals: businesses.filter((b) => b.type === "bike_rental").length,
    }),
    [businesses],
  );

  useEffect(() => {
    document.title = currentCity?.name
      ? `${currentCity.name} - Cagli Local`
      : "Cagli Local - Attivita locali";
  }, [currentCity]);

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
      if (data.role === "global_admin") {
        window.location.href = "/admin";
      } else if (data.business?.slug) {
        const citySlug = data.business.location?.citySlug || "";
        window.location.href = citySlug
          ? `/${citySlug}/${data.business.slug}/admin`
          : `/${data.business.slug}/admin`;
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
  }

  return (
    <main className="cagli-page public">
      <CagliHeader
        isGlobalAdmin={isGlobalAdmin}
        isLogged={Boolean(session.token)}
        onLogin={() => setLoginOpen(true)}
        onLogout={logout}
      />

      <PublicHero
        businesses={filteredBusinesses}
        city={currentCity}
        citySlug={citySlug}
        heroStats={heroStats}
        loading={loading}
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
      />

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
          src="/businesses/home/logo.png"
          alt="Cagli"
          className="cagli-logo"
        />
      </a>
      <nav>
        {isGlobalAdmin && (
          <>
            <a className="active" href="/admin">
              Console
            </a>
            <a href="/admin/cities">Citta</a>
            <a href="/admin/businesses">Business</a>
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
  city,
  citySlug,
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
  const heroTitle =
    city?.heroTitle || `${city?.name || "La tua citta"} a portata di mano.`;
  const heroDescription =
    city?.heroDescription ||
    "Locali, negozi, noleggi ed eventi del territorio. Ordina, prenota e scopri cosa succede in citta.";
  const sectionLabel = SECTION_LABELS[typeFilter] || "Tutte le attività";

  return (
    <>
      <section className="city-hero">
        <div className="city-hero-inner">
          <div className="city-hero-copy">
            <h1>{heroTitle}</h1>
            <p>{heroDescription}</p>
            {(totalActive > 0 || openNow > 0 || events > 0 || rentals > 0) && (
              <div className="city-hero-stats" aria-label="Riepilogo attività">
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
        <div className="city-search-panel">
          <label className="city-search">
            <span aria-hidden="true">
              <Icon name="search" />
            </span>
            <input
              placeholder="Cerca un locale, evento, noleggio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="city-filter-pills">
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

      <section className="city-directory-title">
        <h2>{sectionLabel}</h2>
        <span>{loading ? "Caricamento..." : `${visibleCount} risultati`}</span>
      </section>

      <section className="city-business-grid">
        {loading ? (
          <SkeletonCards />
        ) : businesses.length === 0 ? (
          <EmptyDirectory typeFilter={typeFilter} />
        ) : (
          businesses.map((business, index) => (
            <PublicBusinessCard
              business={business}
              citySlug={citySlug}
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

// ── PublicBusinessCard ────────────────────────────────────────────────────────

function PublicBusinessCard({ business, citySlug = "", index, search }) {
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
  const publicPath = citySlug ? `/${citySlug}/${slug}` : `/${slug}`;

  return (
    <a
      className={`city-business-card ${active ? "" : "disabled"}`}
      href={active ? publicPath : undefined}
      style={{ animationDelay: `${250 + index * 60}ms` }}
      aria-disabled={!active}
      aria-label={`${active ? "Apri" : "Non disponibile"} ${name}`}
    >
      <header
        className={`cagli-card-media ${coverUrl ? "has-image" : ""} ${bucket}`}
        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
      >
        <BusinessLogo business={business} />
        <span className="city-card-icon" aria-hidden="true">
          <Icon name={typeIcon} />
        </span>
      </header>
      <div>
        <div className="city-card-badges">
          <span className="cagli-type-badge">
            <Icon name={typeIcon} />
            {active ? typeLabel : "Temporaneamente chiuso"}
          </span>
          {active && (
            <span className={`city-open-badge ${isOpen ? "open" : "closed"}`}>
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

function SkeletonCards() {
  return <LoadingSkeleton variant="card" count={6} />;
}

function EmptyDirectory({ typeFilter = "all" }) {
  const description =
    EMPTY_MESSAGES[typeFilter] ||
    "Prova con un altro termine o cambia categoria.";
  return (
    <EmptyState title="Nessuna attività trovata" description={description} />
  );
}
