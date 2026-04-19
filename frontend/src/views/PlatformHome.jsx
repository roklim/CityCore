import { useEffect, useMemo, useState } from "react";
import { getPlatformBusinesses } from "../lib/api";
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
  return "M";
}

function businessInitials(name = "") {
  const clean = name.trim();
  if (!clean) return "App";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function PlatformHome() {
  const [session, setSession] = useState(() => readAdminSession());
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(Boolean(session.token));
  const [toast, setToast] = useState("");
  const isGlobalAdmin = session.role === "global_admin";

  useEffect(() => {
    let cancelled = false;

    async function loadBusinesses() {
      if (!session.token || !isGlobalAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextBusinesses = await getPlatformBusinesses(session.token);
        if (!cancelled) setBusinesses(nextBusinesses);
      } catch (error) {
        if (!cancelled) setToast(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [session.token, isGlobalAdmin]);

  const ownerBusiness = useMemo(() => {
    if (isGlobalAdmin || !session.business) return null;
    return session.business;
  }, [isGlobalAdmin, session.business]);

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_session");
    setSession({ token: "" });
    setBusinesses([]);
  }

  return (
    <main className="platform-home">
      <header className="platform-hero">
        <div>
          <p className="eyebrow">Cagli platform</p>
          <h1>Le tue app locali</h1>
          <p>
            Apri menu, banco admin e gestione business da un unico dominio.
          </p>
        </div>
        <div className="platform-actions">
          {session.token ? (
            <>
              <a className="platform-secondary" href="/admin">
                Admin globale
              </a>
              <button type="button" onClick={logout}>
                Esci
              </button>
            </>
          ) : (
            <a className="platform-primary" href="/admin">
              Accedi admin
            </a>
          )}
        </div>
      </header>

      {!session.token && (
        <section className="platform-empty">
          <strong>Accesso richiesto</strong>
          <span>
            Entra come global admin per vedere tutte le app configurate.
          </span>
        </section>
      )}

      {session.token && !isGlobalAdmin && ownerBusiness && (
        <section className="platform-grid">
          <BusinessTile business={ownerBusiness} />
        </section>
      )}

      {session.token && isGlobalAdmin && (
        <section className="platform-grid" aria-busy={loading}>
          {loading ? (
            <p className="platform-muted">Caricamento app...</p>
          ) : businesses.length === 0 ? (
            <p className="platform-muted">Nessun business creato.</p>
          ) : (
            businesses.map((business) => (
              <BusinessTile business={business} key={business._id || business.slug} />
            ))
          )}
        </section>
      )}

      <Toast message={toast} />
    </main>
  );
}

function BusinessTile({ business }) {
  const slug = business.slug || "";
  const name = business.name || business.branding?.publicName || slug;
  const color = business.branding?.primaryColor || "#2C5F2E";
  const metrics = business.metrics || {};

  return (
    <article className="platform-app-card">
      <div className="platform-app-icon" style={{ background: color }}>
        <span>{businessIcon(business) || businessInitials(name)}</span>
      </div>
      <div className="platform-app-body">
        <span>{business.type || "business"}</span>
        <h2>{name}</h2>
        <p>/{slug}</p>
      </div>
      <div className="platform-app-metrics">
        <span>{metrics.orders || 0} ordini</span>
        <span>{money(metrics.revenue || 0)}</span>
      </div>
      <div className="platform-card-actions">
        <a href={`/${slug}`}>App cliente</a>
        <a href={`/${slug}/admin`}>Banco admin</a>
      </div>
    </article>
  );
}
