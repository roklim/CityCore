import { useEffect, useState } from "react";
import { getPublicCities, loginAdmin, searchPublicCities } from "../lib/api";
import Toast from "../components/Toast";
import EmptyState from "../components/ui/EmptyState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";

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

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export default function PlatformLanding({ loadingRoute = false }) {
  const [session, setSession] = useState(() => readAdminSession());
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.title = "Cagli Local - Cerca la tua citta";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = search.trim()
          ? await searchPublicCities(search)
          : await getPublicCities();
        if (!cancelled) setCities(results);
      } catch (error) {
        if (!cancelled) setToast(error.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search.trim() ? 220 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
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
      setSession({
        token: data.token,
        role: data.role,
        user: data.user,
        business: data.business,
      });
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
      <header className="cagli-header">
        <a className="cagli-brand" href="/">
          <img src="/businesses/home/logo.png" alt="Cagli" className="cagli-logo" />
        </a>
        <nav>
          {session.token ? (
            <>
              {session.role === "global_admin" && <a href="/admin">Console</a>}
              <button className="cagli-text-button" type="button" onClick={logout}>
                Esci
              </button>
            </>
          ) : (
            <button
              className="cagli-manager-button"
              type="button"
              onClick={() => setLoginOpen(true)}
              aria-label="Area gestori"
              title="Area gestori"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
            </button>
          )}
        </nav>
      </header>

      {loadingRoute ? (
        <section className="city-picker-home">
          <div className="city-picker-copy">
            <p>Caricamento</p>
            <h1>Sto preparando la pagina...</h1>
          </div>
        </section>
      ) : (
        <section className="city-picker-home">
          <div className="city-picker-copy">
            <p>Cagli Local</p>
            <h1>Trova la tua citta.</h1>
            <span>
              Cerca nel registro delle citta verificate e scegli il territorio
              per vedere attivita, servizi, eventi e segnalazioni disponibili.
            </span>
            <label className="city-search city-picker-search">
              <SearchIcon />
              <input
                placeholder="Cerca Cagli, Roma, Milano..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="city-picker-grid">
            {loading ? (
              <LoadingSkeleton count={3} />
            ) : cities.length === 0 ? (
              <EmptyState
                title="Citta non trovata nel registro"
                description="La ricerca usa solo citta verificate. Prova nome, provincia o regione."
              />
            ) : (
              cities.map((city) => (
                <a className="city-picker-card" href={`/${city.slug}`} key={city.slug}>
                  <span>{city.province || city.country || "IT"}</span>
                  <strong>{city.name}</strong>
                  <small>
                    {[city.region, city.country].filter(Boolean).join(" - ")}
                  </small>
                </a>
              ))
            )}
          </div>
        </section>
      )}

      <footer className="cagli-footer">
        <span>Cagli Local - 2026</span>
        <button type="button" onClick={() => setLoginOpen(true)}>
          Area gestori
        </button>
      </footer>

      {loginOpen && (
        <div className="cagli-login-overlay" onMouseDown={() => setLoginOpen(false)}>
          <section
            className="cagli-login-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="cagli-modal-close"
              type="button"
              onClick={() => setLoginOpen(false)}
            >
              x
            </button>
            <div className="cagli-login-logo">C</div>
            <h2>Area gestori</h2>
            <p>Area riservata a gestori e amministratori</p>
            <form onSubmit={handleLogin}>
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
                  <button type="button" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </label>
              {loginError && <strong className="cagli-login-error">{loginError}</strong>}
              <button type="submit" disabled={loginLoading}>
                {loginLoading ? "Accesso..." : "Accedi"}
              </button>
            </form>
          </section>
        </div>
      )}

      <Toast message={toast} />
    </main>
  );
}
