import { useEffect, useMemo, useState } from "react";
import {
  getPlatformBusinesses,
  getPublicBusinesses,
  loginAdmin,
} from "../lib/api";
import { money } from "../utils/format";
import Toast from "../components/Toast";

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

function businessIcon(business) {
  const type = business?.type || "";
  if (type.includes("sushi")) return "S";
  if (type.includes("bike") || type.includes("rental")) return "R";
  if (type.includes("bar")) return "B";
  if (type.includes("service")) return "A";
  if (type.includes("restaurant")) return "T";
  return "M";
}

function businessName(business) {
  return business?.branding?.publicName || business?.name || business?.slug || "App";
}

function readRouteMode(mode) {
  if (mode) return mode;
  return window.location.pathname === "/admin" ? "admin" : "home";
}

export default function PlatformHome({ mode }) {
  const routeMode = readRouteMode(mode);
  const [session, setSession] = useState(() => readAdminSession());
  const [publicBusinesses, setPublicBusinesses] = useState([]);
  const [platformBusinesses, setPlatformBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (routeMode !== "admin" || !isBusinessUser || !ownSlug) return;
    window.location.replace(`/${ownSlug}/admin`);
  }, [routeMode, isBusinessUser, ownSlug]);

  const businesses = isGlobalAdmin && platformBusinesses.length
    ? platformBusinesses
    : publicBusinesses;

  const businessTypes = useMemo(() => {
    return Array.from(new Set(businesses.map((business) => business.type).filter(Boolean)))
      .sort();
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const matchesType = typeFilter === "all" || business.type === typeFilter;
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

  async function handleLogin(event) {
    event.preventDefault();
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

      if (data.role !== "global_admin" && data.business?.slug) {
        window.location.replace(`/${data.business.slug}/admin`);
      }
    } catch (error) {
      setToast(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session");
    setSession({ token: "" });
    setPlatformBusinesses([]);
  }

  return (
    <main className="platform-home">
      <header className="platform-hero">
        <div>
          <p className="eyebrow">Cagli platform</p>
          <h1>{routeMode === "admin" ? "Console Cagli" : "Attivita Cagli"}</h1>
          <p>
            Un unico dominio per menu pubblici, banco operativo e gestione
            delle attivita locali.
          </p>
        </div>
        <div className="platform-actions">
          {session.token ? (
            <>
              {isGlobalAdmin && (
                <a className="platform-secondary" href="/admin">
                  Console globale
                </a>
              )}
              {isGlobalAdmin && (
                <a
                  className="platform-secondary"
                  href="/admin/businesses?section=businesses"
                >
                  Gestione business
                </a>
              )}
              <button type="button" onClick={logout}>
                Esci
              </button>
            </>
          ) : routeMode === "admin" ? null : (
            <a className="platform-primary" href="/admin">
              Accedi admin
            </a>
          )}
        </div>
      </header>

      {routeMode === "admin" && !session.token && (
        <section className="platform-login-panel">
          <form onSubmit={handleLogin}>
            <p className="eyebrow">Accesso piattaforma</p>
            <h2>Entra nella console</h2>
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
        </section>
      )}

      {isGlobalAdmin && (
        <section className="platform-stats-grid">
          <article>
            <span>Business</span>
            <strong>{platformStats.businesses}</strong>
          </article>
          <article>
            <span>Attivi</span>
            <strong>{platformStats.active}</strong>
          </article>
          <article>
            <span>Ordini</span>
            <strong>{platformStats.orders}</strong>
          </article>
          <article>
            <span>GMV</span>
            <strong>{money(platformStats.revenue)}</strong>
          </article>
        </section>
      )}

      <section className="platform-directory-head">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Tutte le attivita</h2>
        </div>
        <div className="platform-filters">
          <input
            placeholder="Cerca nome, slug o owner"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">Tutti i tipi</option>
            {businessTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="platform-grid" aria-busy={loading}>
        {loading ? (
          <p className="platform-muted">Caricamento attivita...</p>
        ) : filteredBusinesses.length === 0 ? (
          <p className="platform-muted">Nessuna attivita trovata.</p>
        ) : (
          filteredBusinesses.map((business) => (
            <BusinessTile
              business={business}
              isGlobalAdmin={isGlobalAdmin}
              isOwnBusiness={ownSlug === business.slug}
              key={business._id || business.slug}
            />
          ))
        )}
      </section>

      <Toast message={toast} />
    </main>
  );
}

function BusinessTile({ business, isGlobalAdmin, isOwnBusiness }) {
  const slug = business.slug || "";
  const name = businessName(business);
  const color = business.branding?.primaryColor || "#2C5F2E";
  const metrics = business.metrics || {};
  const canOpenAdmin = isGlobalAdmin || isOwnBusiness;

  return (
    <article className={`platform-app-card ${isOwnBusiness ? "own" : ""}`}>
      <div className="platform-app-top">
        <div className="platform-app-icon" style={{ background: color }}>
          <span>{businessIcon(business)}</span>
        </div>
        {isOwnBusiness && <strong className="platform-own-badge">La tua</strong>}
      </div>

      <div className="platform-app-body">
        <span>{business.type || "business"}</span>
        <h2>{name}</h2>
        <p>/{slug}</p>
      </div>

      <div className="platform-app-meta">
        <span>{business.plan || "free"}</span>
        <span>{business.subscriptionStatus || "public"}</span>
        {business.owner?.email && <span>{business.owner.email}</span>}
      </div>

      <div className="platform-app-metrics">
        <span>{metrics.orders || 0} ordini</span>
        <span>{money(metrics.revenue || 0)}</span>
        {isGlobalAdmin && <span>{metrics.products || 0} prodotti</span>}
        {isGlobalAdmin && <span>{metrics.customers || 0} clienti</span>}
      </div>

      <div className="platform-card-actions">
        <a href={`/${slug}`}>Apri menu</a>
        {canOpenAdmin && <a href={`/${slug}/admin`}>Apri admin</a>}
        {isGlobalAdmin && <a href="/admin/businesses?section=businesses">Gestisci</a>}
        {isGlobalAdmin && <a href="/admin/businesses?section=businesses">Utenti</a>}
      </div>
    </article>
  );
}
