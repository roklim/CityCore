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
  { id: "pizzeria", label: "Pizzeria", icon: "slice" },
  { id: "sushi", label: "Sushi", icon: "roll" },
  { id: "bar", label: "Bar", icon: "cup" },
  { id: "other", label: "Altro", icon: "tag" },
];

const QUICK_ACTIONS = [
  { label: "Gestisci menu", icon: "M", href: "menu" },
  { label: "Vedi ordini", icon: "O", href: "orders" },
  { label: "Configura fasce", icon: "D", href: "availability" },
  { label: "Vedi clienti", icon: "C", href: "customers" },
];

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
  return business?.branding?.publicName || business?.name || business?.slug || "App";
}

function businessInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function businessTypeLabel(type = "") {
  const labels = {
    pizzeria: "Pizzeria",
    sushi: "Sushi",
    restaurant: "Ristorante",
    bar: "Bar",
    bike_rental: "Noleggio",
    service: "Servizi",
    custom: "Altro",
  };
  return labels[type] || "Altro";
}

function businessTypeIcon(type = "") {
  if (type === "pizzeria") return "slice";
  if (type === "sushi") return "roll";
  if (type === "bar") return "cup";
  return "tag";
}

function typeBucket(type = "") {
  if (["pizzeria", "sushi", "bar"].includes(type)) return type;
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
  const metrics = business.metrics;
  return Boolean(
    metrics.products ||
      metrics.availableProducts ||
      metrics.menuItems ||
      metrics.activeProducts,
  );
}

function readRouteMode(mode) {
  if (mode) return mode;
  return window.location.pathname === "/admin" ? "admin" : "home";
}

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

function BusinessLogo({ business, size = "md" }) {
  const name = businessName(business);
  const logoUrl = business.branding?.logoUrl;
  const color = business.branding?.primaryColor || "var(--cagli-basil)";

  return (
    <span className={`cagli-business-logo ${size}`} style={{ background: color }}>
      {logoUrl ? <img src={logoUrl} alt="" loading="lazy" /> : businessInitials(name)}
    </span>
  );
}

function Icon({ name }) {
  const common = {
    "aria-hidden": "true",
    viewBox: "0 0 24 24",
    focusable: "false",
  };

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "slice") {
    return (
      <svg {...common}>
        <path d="M5 20 19 4l-3 16H5Z" />
        <path d="M9 16h.01M13 11h.01" />
      </svg>
    );
  }

  if (name === "roll") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "cup") {
    return (
      <svg {...common}>
        <path d="M7 8h9v6a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4V8Z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2M7 5h9" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg {...common}>
        <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 7h14M7 12h10M9 17h6" />
    </svg>
  );
}

export default function PlatformHome({ mode }) {
  const routeMode = readRouteMode(mode);
  const [session, setSession] = useState(() => readAdminSession());
  const [publicBusinesses, setPublicBusinesses] = useState([]);
  const [platformBusinesses, setPlatformBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(routeMode === "admin" && !session.token);
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

  const businesses = isGlobalAdmin && platformBusinesses.length
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
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [businesses, search, typeFilter]);

  const platformStats = useMemo(() => {
    return platformBusinesses.reduce(
      (totals, business) => {
        totals.businesses += 1;
        totals.orders += business.metrics?.orders || 0;
        totals.revenue += business.metrics?.revenue || 0;
        if (business.subscriptionStatus === "active") totals.active += 1;
        return totals;
      },
      { businesses: 0, active: 0, orders: 0, revenue: 0 },
    );
  }, [platformBusinesses]);

  const ownerBusiness = useMemo(() => {
    if (!isBusinessUser || !ownSlug) return null;
    return businesses.find((business) => business.slug === ownSlug) || session.business;
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
          platformStats={platformStats}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      )}

      {isBusinessUser && ownerBusiness && (
        <OwnerHome
          business={ownerBusiness}
          user={session.user}
        />
      )}

      {isBusinessUser && (
        <PublicHero
          businesses={filteredBusinesses}
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

function CagliHeader({ isGlobalAdmin, isLogged, onLogin, onLogout }) {
  return (
    <header className={`cagli-header ${isGlobalAdmin ? "admin" : ""}`}>
      <a className="cagli-brand" href="/">
        <strong>Cagli Local</strong>
        <span>Scopri le attività locali di Cagli</span>
      </a>
      <nav>
        {isGlobalAdmin && (
          <>
            <a className="active" href="/admin">Console globale</a>
            <a href="/admin/businesses?section=businesses">Gestione business</a>
            <span className="cagli-notification">0</span>
          </>
        )}
        {isLogged ? (
          <button className="cagli-text-button" type="button" onClick={onLogout}>
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

function PublicHero({
  businesses,
  loading,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  const visibleCount = businesses.length;

  return (
    <>
      <section className="cagli-public-hero">
        <div className="cagli-hero-copy">
          <span className="cagli-hero-kicker">Cagli Local</span>
          <h1>Scegli un locale, ordina e ritira a Cagli.</h1>
          <p>
            Trova pizzerie, sushi bar e attività del quartiere. Apri il locale,
            scegli dal menu e prepara il ritiro senza installare app.
          </p>
          <div className="cagli-hero-stats" aria-label="Riepilogo attività">
            <span>
              <strong>{visibleCount}</strong>
              locali
            </span>
            <span>
              <strong>24/7</strong>
              menu online
            </span>
            <span>
              <strong>0</strong>
              download
            </span>
          </div>
        </div>

        <div className="cagli-hero-search-card">
          <label className="cagli-search">
            <span aria-hidden="true">
              <Icon name="search" />
            </span>
            <input
              placeholder="Cerca pizzeria, sushi, bar..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
        <div>
          <p>Locali</p>
          <h2>Scegli un locale</h2>
        </div>
        <span>{loading ? "Caricamento..." : `${visibleCount} risultati`}</span>
      </section>

      <section className="cagli-public-grid">
        {loading ? (
          <SkeletonCards />
        ) : businesses.length === 0 ? (
          <EmptyDirectory />
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

function GlobalAdminView({
  businesses,
  loading,
  platformStats,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  return (
    <section className="cagli-admin-console">
      <div className="cagli-admin-title">
        <p>CONSOLE PIATTAFORMA</p>
        <h1>Console globale</h1>
        <span>Gestione attivita locali</span>
      </div>

      <section className="cagli-admin-metrics">
        <MetricCard icon="B" label="Business" value={platformStats.businesses} />
        <MetricCard icon="A" label="Attivi" value={platformStats.active} />
        <MetricCard icon="O" label="Ordini" value={platformStats.orders} />
        <MetricCard icon="EUR" label="GMV" value={money(platformStats.revenue)} />
      </section>

      <section className="cagli-admin-directory-head">
        <div>
          <p>DIRECTORY</p>
          <h2>Tutte le attivita</h2>
        </div>
        <div className="cagli-admin-tools">
          <input
            placeholder="Cerca nome, slug o owner"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            {PUBLIC_TYPE_FILTERS.map((filter) => (
              <option value={filter.id} key={filter.id}>
                {filter.label}
              </option>
            ))}
          </select>
          <a href="/admin/businesses?section=businesses">+ Aggiungi business</a>
        </div>
      </section>

      <section className="cagli-admin-grid">
        {loading ? (
          <SkeletonCards admin />
        ) : businesses.length === 0 ? (
          <EmptyDirectory admin />
        ) : (
          businesses.map((business) => (
            <AdminBusinessCard business={business} key={business._id || business.slug} />
          ))
        )}
      </section>
    </section>
  );
}

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
          <a className="active" href={`/${slug}/admin`}>Il mio banco</a>
          <a href={`/${slug}/admin?section=menu`}>Menu</a>
          <a href={`/${slug}/admin?section=orders`}>Ordini</a>
          <a href={`/${slug}/admin?section=settings`}>Impostazioni</a>
        </nav>
        <a className="cagli-outline-link" href={`/${slug}`}>Apri menu pubblico</a>
      </header>

      <article className="cagli-owner-hero-card">
        <BusinessLogo business={business} size="xl" />
        <div>
          <span className="cagli-type-badge">{businessTypeLabel(business.type)}</span>
          <h2>{name}</h2>
          <p>/{slug}</p>
          <strong>{statusLabel(business.subscriptionStatus)}</strong>
        </div>
        <div className="cagli-owner-inline-metrics">
          <span><b>{metrics.orders || 0}</b>Ordini oggi</span>
          <span><b>{money(metrics.revenue || 0)}</b>Incasso</span>
          <span><b>{metrics.availableProducts || 0}</b>Prodotti attivi</span>
          <span><b>{metrics.customers || 0}</b>Clienti</span>
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

function MetricCard({ icon, label, value }) {
  return (
    <article>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function PublicBusinessCard({ business, index, search }) {
  const slug = business.slug || "";
  const name = businessName(business);
  const active = isBusinessActive(business);
  const typeLabel = businessTypeLabel(business.type);
  const typeIcon = businessTypeIcon(business.type);
  const menuReady = hasMenuReady(business);
  const description =
    business.settings?.publicMessage ||
    (menuReady ? business.settings?.openingHours : "Menu in preparazione") ||
    "Scopri il menu e ordina dal locale.";
  const openingHours = business.settings?.openingHours || "Orari da verificare";

  return (
    <a
      className={`cagli-public-card ${active ? "" : "disabled"}`}
      href={active ? `/${slug}` : undefined}
      style={{ animationDelay: `${250 + index * 60}ms` }}
      aria-disabled={!active}
      aria-label={`${active ? "Apri" : "Non disponibile"} ${name}`}
    >
      <header>
        <BusinessLogo business={business} />
        <span className="cagli-open-arrow" aria-hidden="true">-&gt;</span>
      </header>
      <div>
        <span className="cagli-type-badge">
          <Icon name={typeIcon} />
          {active ? typeLabel : "Temporaneamente chiuso"}
        </span>
        <h2><Highlight text={name} search={search} /></h2>
        <p>{description}</p>
        <small>
          <Icon name="clock" />
          {openingHours}
        </small>
      </div>
      <strong className={menuReady ? "ready" : "soon"}>
        {menuReady ? "Menu disponibile" : "Disponibile a breve"}
      </strong>
    </a>
  );
}

function AdminBusinessCard({ business }) {
  const slug = business.slug || "";
  const name = businessName(business);
  const metrics = business.metrics || {};
  const status = statusLabel(business.subscriptionStatus);

  return (
    <article className="cagli-admin-card">
      <header>
        <BusinessLogo business={business} />
        <div>
          <span className="cagli-type-badge">{businessTypeLabel(business.type)}</span>
          <h2>{name}</h2>
          <p>/{slug}</p>
        </div>
        <strong className={`cagli-status ${business.subscriptionStatus || "public"}`}>
          {status}
        </strong>
      </header>

      <div className="cagli-admin-card-metrics">
        <span><small>Ordini</small><b>{metrics.orders || 0}</b></span>
        <span><small>GMV</small><b>{money(metrics.revenue || 0)}</b></span>
        <span><small>Prodotti</small><b>{metrics.products || 0}</b></span>
        <span><small>Clienti</small><b>{metrics.customers || 0}</b></span>
      </div>

      <div className="cagli-admin-tags">
        <span>{business.plan || "free"}</span>
        <span>{business.subscriptionStatus || "public"}</span>
        {business.owner?.email && <small>{business.owner.email}</small>}
      </div>

      <div className="cagli-admin-card-actions">
        <a href={`/${slug}`}>Apri menu</a>
        <a href={`/${slug}/admin`}>Apri admin</a>
        <a href="/admin/businesses?section=businesses">Gestisci</a>
        <a href="/admin/businesses?section=businesses">Utenti</a>
      </div>
    </article>
  );
}

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
      <section className="cagli-login-modal" onMouseDown={(event) => event.stopPropagation()}>
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
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <div className="cagli-password-row">
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
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

function SkeletonCards({ admin = false }) {
  return <LoadingSkeleton variant="card" count={admin ? 8 : 6} />;
}

function EmptyDirectory() {
  return (
    <EmptyState
      title="Nessuna attivita trovata"
      description="Prova con un altro termine o cambia categoria."
    />
  );
}
