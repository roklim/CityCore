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
  { id: "all", label: "Tutti" },
  { id: "pizzeria", label: "Pizzeria" },
  { id: "sushi", label: "Sushi" },
  { id: "bar", label: "Bar" },
  { id: "other", label: "Altro" },
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
        <strong>Cagli</strong>
        <span>Scopri le attivita locali di Cagli</span>
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
          <button className="cagli-outline-button" type="button" onClick={onLogin}>
            Accedi
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
  return (
    <>
      <section className="cagli-public-hero">
        <h1>Le attivita di Cagli, tutte in un posto</h1>
        <p>
          Sfoglia menu, scopri novita e ordina direttamente dai locali del
          centro.
        </p>
        <label className="cagli-search">
          <span aria-hidden="true">⌕</span>
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
              {filter.label}
            </button>
          ))}
        </div>
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
        <p>CAGLI PLATFORM</p>
        <h1>Console globale</h1>
        <span>Platform / Tutte le attivita</span>
      </div>

      <section className="cagli-admin-metrics">
        <MetricCard icon="B" label="Business" value={platformStats.businesses} />
        <MetricCard icon="A" label="Attivi" value={platformStats.active} />
        <MetricCard icon="O" label="Ordini" value={platformStats.orders} />
        <MetricCard icon="€" label="GMV" value={money(platformStats.revenue)} />
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
        <a href={`/${slug}/admin`}>Vai all'admin</a>
      </article>

      <section className="cagli-owner-quick-grid">
        {QUICK_ACTIONS.map((action) => (
          <a href={`/${slug}/admin?section=${action.href}`} key={action.href}>
            <span>{action.icon}</span>
            <strong>{action.label}</strong>
            <i>→</i>
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
  const description =
    business.settings?.publicMessage ||
    business.settings?.openingHours ||
    "Scopri il menu e ordina dal locale.";

  return (
    <a
      className={`cagli-public-card ${active ? "" : "disabled"}`}
      href={active ? `/${slug}` : undefined}
      style={{ animationDelay: `${250 + index * 60}ms` }}
      aria-disabled={!active}
    >
      <BusinessLogo business={business} />
      <div>
        <span className="cagli-type-badge">
          {active ? businessTypeLabel(business.type) : "Temporaneamente chiuso"}
        </span>
        <h2><Highlight text={name} search={search} /></h2>
        <p>{description}</p>
      </div>
      <strong>{active ? "Apri menu →" : "Non disponibile"}</strong>
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
          ×
        </button>
        <div className="cagli-login-logo">C</div>
        <h2>Accedi</h2>
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
          <a href="/admin">Password dimenticata?</a>
        </form>
      </section>
    </div>
  );
}

function CagliFooter({ onLogin }) {
  return (
    <footer className="cagli-footer">
      <span>Cagli Platform · © 2025</span>
      <button type="button" onClick={onLogin}>Accedi come gestore</button>
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
