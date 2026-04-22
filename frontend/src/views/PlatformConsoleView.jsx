import {
  BUSINESS_TYPE_OPTIONS,
  BUSINESS_USER_ROLES,
  PLAN_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "../constants";
import Toast from "../components/Toast";
import InlineNotice from "../components/ui/InlineNotice";
import usePlatformConsoleController from "../hooks/usePlatformConsoleController";
import { businessAdminHref, businessHref, money, slugify } from "../utils/format";

const PLATFORM_NAV = [
  { id: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard" },
  { id: "cities", label: "Citta", href: "/admin/cities", icon: "city" },
  { id: "businesses", label: "Business", href: "/admin/businesses", icon: "store" },
  { id: "users", label: "Utenti", href: "/admin/users", icon: "users" },
  { id: "settings", label: "Impostazioni", href: "/admin/settings", icon: "settings" },
];

const CITY_STATUS_OPTIONS = [
  { value: "active", label: "active" },
  { value: "coming_soon", label: "coming_soon" },
  { value: "disabled", label: "disabled" },
];

function sectionFromPath() {
  const path = typeof window === "undefined" ? "/admin" : window.location.pathname;
  if (path.startsWith("/admin/cities")) return "cities";
  if (path.startsWith("/admin/businesses")) return "businesses";
  if (path.startsWith("/admin/users")) return "users";
  if (path.startsWith("/admin/settings")) return "settings";
  return "dashboard";
}

function typeLabel(type = "") {
  return BUSINESS_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Custom";
}

function assetIssuesFor(business) {
  const issues = [];
  if (!business?.branding?.logoUrl) issues.push("logo");
  if (!business?.branding?.coverImageUrl) issues.push("cover");
  return issues;
}

function businessCitySlug(business) {
  return business?.location?.citySlug || business?.city?.slug || "";
}

function businessPublicPath(business) {
  return businessHref(business?.slug || "", businessCitySlug(business));
}

function businessAdminPath(business) {
  return businessAdminHref(business?.slug || "", businessCitySlug(business));
}

function Icon({ name }) {
  const props = {
    "aria-hidden": "true",
    viewBox: "0 0 24 24",
    focusable: "false",
  };
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "dashboard") {
    return (
      <svg {...props}>
        <path {...common} d="M4 13h7V4H4v9ZM13 20h7V4h-7v16ZM4 20h7v-5H4v5Z" />
      </svg>
    );
  }
  if (name === "city") {
    return (
      <svg {...props}>
        <path {...common} d="M4 21V7l5-3 5 3v14M14 10l6-3v14M7 10h2M7 14h2M7 18h2" />
      </svg>
    );
  }
  if (name === "store") {
    return (
      <svg {...props}>
        <path {...common} d="M4 10h16l-1-5H5l-1 5ZM6 10v10h12V10M9 20v-5h6v5" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...props}>
        <path {...common} d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0M18 8a3 3 0 0 1 3 3M3 11a3 3 0 0 1 3-3" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg {...props}>
        <path {...common} d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 12h2M18 12h2M12 4v2M12 18v2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...props}>
        <path {...common} d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "open") {
    return (
      <svg {...props}>
        <path {...common} d="M7 17 17 7M9 7h8v8M5 5h7M5 5v14h14v-7" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...props}>
        <path {...common} d="M4 20h4l11-11-4-4L4 16v4ZM13 7l4 4" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...props}>
        <circle {...common} cx="11" cy="11" r="6" />
        <path {...common} d="m16 16 4 4" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path {...common} d="M5 12h14M12 5v14" />
    </svg>
  );
}

export default function PlatformConsoleView() {
  const controller = usePlatformConsoleController();
  const activeSection = sectionFromPath();
  const activeNav = PLATFORM_NAV.find((item) => item.id === activeSection) || PLATFORM_NAV[0];
  document.title = "Console piattaforma - Cagli Local";

  if (!controller.token) {
    return <PlatformLogin controller={controller} />;
  }

  if (controller.loading) {
    return (
      <PlatformShell activeSection={activeSection} controller={controller}>
        <InlineNotice
          title="Caricamento console"
          description="Sto verificando la sessione piattaforma."
        />
      </PlatformShell>
    );
  }

  if (!controller.isGlobalAdmin) {
    return (
      <PlatformShell activeSection={activeSection} controller={controller}>
        <InlineNotice
          tone="warning"
          title="Accesso piattaforma riservato"
          description="Questa console e' solo per global_admin. Gli owner, admin e staff usano il banco del proprio locale."
        />
      </PlatformShell>
    );
  }

  return (
    <PlatformShell activeSection={activeSection} controller={controller}>
      <SectionHeader
        action={
          activeSection === "businesses" ? (
            <a className="platform-primary-link" href="#business-form">
              <Icon name="plus" />
              Nuovo business
            </a>
          ) : (
            <button
              type="button"
              onClick={controller.refreshPlatformResources}
              disabled={controller.refreshing}
            >
              {controller.refreshing ? "Aggiorno..." : "Aggiorna"}
            </button>
          )
        }
        eyebrow="Console piattaforma"
        title={activeNav.label}
      />

      {activeSection === "dashboard" && <DashboardSection controller={controller} />}
      {activeSection === "cities" && <CitiesSection controller={controller} />}
      {activeSection === "businesses" && <BusinessesSection controller={controller} />}
      {activeSection === "users" && <UsersSection controller={controller} />}
      {activeSection === "settings" && <SettingsSection />}
    </PlatformShell>
  );
}

function PlatformLogin({ controller }) {
  return (
    <main className="admin-login platform-console-login">
      <form className="login-panel" onSubmit={controller.login}>
        <a href="/">Home pubblica</a>
        <p className="eyebrow">Global admin</p>
        <h1>Console piattaforma</h1>
        <input
          autoComplete="username"
          placeholder="Email o username"
          value={controller.username}
          onChange={(event) => controller.setUsername(event.target.value)}
        />
        <input
          autoComplete="current-password"
          placeholder="Password"
          type="password"
          value={controller.password}
          onChange={(event) => controller.setPassword(event.target.value)}
        />
        <button type="submit">Accedi</button>
      </form>
      <Toast message={controller.toast} />
    </main>
  );
}

function PlatformShell({ activeSection, children, controller }) {
  return (
    <main className="platform-console-shell">
      <aside className="platform-console-sidebar">
        <div className="platform-console-brand">
          <span>CL</span>
          <div>
            <p className="eyebrow">Cagli Local</p>
            <strong>Platform</strong>
          </div>
        </div>
        <nav aria-label="Navigazione piattaforma">
          {PLATFORM_NAV.map((item) => (
            <a
              className={activeSection === item.id ? "active" : ""}
              href={item.href}
              key={item.id}
            >
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="platform-console-sidebar-actions">
          <a href="/">Home pubblica</a>
          <button type="button" onClick={controller.logout}>
            Esci
          </button>
        </div>
      </aside>
      <section className="platform-console-main">{children}</section>
      <Toast message={controller.toast} />
    </main>
  );
}

function SectionHeader({ action, eyebrow, title }) {
  return (
    <header className="platform-console-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="platform-console-actions">{action}</div>
    </header>
  );
}

function DashboardSection({ controller }) {
  const operations = [
    {
      label: "Business senza owner",
      value: controller.platformStats.missingOwner,
      href: "/admin/users",
    },
    {
      label: "Business con asset mancanti",
      value: controller.platformStats.assetIssues,
      href: "/admin/businesses",
    },
    {
      label: "Citta coming soon",
      value: controller.cityStats.comingSoon,
      href: "/admin/cities",
    },
    {
      label: "Citta disabilitate",
      value: controller.cityStats.disabled,
      href: "/admin/cities",
    },
  ];

  return (
    <>
      <section className="platform-console-metrics">
        <MetricCard label="Business" value={controller.platformStats.businesses} />
        <MetricCard label="Citta attivate" value={controller.cityStats.total} />
        <MetricCard label="Ordini" value={controller.platformStats.orders} />
        <MetricCard label="GMV" value={money(controller.platformStats.revenue)} />
        <MetricCard label="Asset da sistemare" value={controller.platformStats.assetIssues} tone="warning" />
      </section>

      <section className="platform-dashboard-grid">
        <article className="platform-console-panel">
          <div className="section-heading">
            <p className="eyebrow">Operazioni</p>
            <h2>Priorita piattaforma</h2>
          </div>
          <div className="platform-ops-list">
            {operations.map((item) => (
              <a href={item.href} key={item.label}>
                <span>{item.value}</span>
                <strong>{item.label}</strong>
              </a>
            ))}
          </div>
        </article>

        <article className="platform-console-panel">
          <div className="section-heading">
            <p className="eyebrow">Azioni rapide</p>
            <h2>Gestione</h2>
          </div>
          <div className="platform-quick-grid">
            <a href="/admin/cities">
              <Icon name="city" />
              <span>Attiva citta</span>
            </a>
            <a href="/admin/businesses">
              <Icon name="store" />
              <span>Crea business</span>
            </a>
            <a href="/admin/users">
              <Icon name="users" />
              <span>Assegna utenti</span>
            </a>
          </div>
        </article>
      </section>

      <section className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">Tenants</p>
          <h2>Ultimi business</h2>
        </div>
        <div className="platform-recent-businesses">
          {controller.platformBusinesses.slice(0, 5).map((business) => (
            <BusinessRow
              business={business}
              key={business._id || business.slug}
            />
          ))}
          {controller.platformBusinesses.length === 0 && (
            <InlineNotice
              title="Nessun business"
              description="Crea il primo tenant da /admin/businesses."
            />
          )}
        </div>
      </section>
    </>
  );
}

function CitiesSection({ controller }) {
  return (
    <div className="platform-cities-layout">
      <section className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">Registro nazionale</p>
          <h2>Cerca comune verificato</h2>
        </div>
        <label className="platform-search-field">
          <Icon name="search" />
          <input
            value={controller.cityRegistryQuery}
            onChange={(event) => controller.setCityRegistryQuery(event.target.value)}
            placeholder="Nome, provincia, regione o codice ISTAT"
          />
        </label>
        <div className="platform-registry-results">
          {controller.cityRegistryLoading ? (
            <InlineNotice
              title="Ricerca in corso"
              description="Controllo il registro comuni della piattaforma."
            />
          ) : controller.cityRegistryResults.length === 0 ? (
            <InlineNotice
              title="Nessun comune trovato"
              description="Importa il dataset ISTAT completo o prova con un altro termine."
            />
          ) : (
            controller.cityRegistryResults.map((city) => (
              <article className="platform-registry-card" key={city._id}>
                <div>
                  <strong>{city.name}</strong>
                  <span>
                    {[city.provinceCode, city.regionName, city.istatCode]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                </div>
                {city.activeCity ? (
                  <span className={`platform-status ${city.activeCity.status || "active"}`}>
                    /{city.activeCity.slug}
                  </span>
                ) : (
                  <div>
                    <button
                      type="button"
                      disabled={controller.cityActivationSaving === city._id}
                      onClick={() => controller.activateCityFromRegistry(city, "active")}
                    >
                      Attiva
                    </button>
                    <button
                      type="button"
                      disabled={controller.cityActivationSaving === city._id}
                      onClick={() => controller.activateCityFromRegistry(city, "coming_soon")}
                    >
                      Soon
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">Mercati</p>
          <h2>Citta attivate</h2>
        </div>
        <div className="platform-city-list">
          {controller.platformCities.length === 0 ? (
            <InlineNotice
              title="Nessuna citta attivata"
              description="Cerca un comune verificato e abilitalo come mercato."
            />
          ) : (
            controller.platformCities.map((city) => (
              <article className="platform-city-card" key={city._id || city.slug}>
                <div>
                  <strong>{city.name}</strong>
                  <span>
                    /{city.slug} {city.province ? `- ${city.province}` : ""}
                  </span>
                </div>
                <select
                  value={city.status || "active"}
                  disabled={controller.cityStatusSaving === city._id}
                  onChange={(event) => controller.changeCityStatus(city, event.target.value)}
                >
                  {CITY_STATUS_OPTIONS.map((status) => (
                    <option value={status.value} key={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <a href={`/${city.slug}`}>Apri</a>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function BusinessesSection({ controller }) {
  return (
    <>
      <section className="platform-business-layout">
        <BusinessForm controller={controller} />
        <div className="platform-business-list-area">
          <BusinessFilters controller={controller} />
          <div className="platform-business-grid">
            {controller.filteredBusinesses.length === 0 ? (
              <InlineNotice
                title="Nessun business trovato"
                description="Modifica i filtri o crea un nuovo business."
              />
            ) : (
              controller.filteredBusinesses.map((business) => (
                <BusinessCard
                  business={business}
                  key={business._id || business.slug}
                  onEdit={controller.editBusiness}
                  onUsers={controller.openBusinessUsers}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {controller.selectedBusinessForUsers && (
        <UsersPanel controller={controller} compact />
      )}
    </>
  );
}

function BusinessFilters({ controller }) {
  return (
    <section className="platform-console-panel platform-business-filters">
      <label className="platform-search-field">
        <Icon name="search" />
        <input
          value={controller.businessQuery}
          onChange={(event) => controller.setBusinessQuery(event.target.value)}
          placeholder="Cerca nome, slug o owner"
        />
      </label>
      <select
        value={controller.businessCityFilter}
        onChange={(event) => controller.setBusinessCityFilter(event.target.value)}
        aria-label="Filtro citta"
      >
        <option value="all">Tutte le citta</option>
        {controller.platformCities.map((city) => (
          <option value={city.slug} key={city._id || city.slug}>
            {city.name}
          </option>
        ))}
      </select>
      <select
        value={controller.businessStatusFilter}
        onChange={(event) => controller.setBusinessStatusFilter(event.target.value)}
        aria-label="Filtro stato"
      >
        <option value="all">Tutti gli stati</option>
        {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
          <option value={status} key={status}>
            {status}
          </option>
        ))}
      </select>
      <select
        value={controller.businessTypeFilter}
        onChange={(event) => controller.setBusinessTypeFilter(event.target.value)}
        aria-label="Filtro tipo"
      >
        <option value="all">Tutti i tipi</option>
        {BUSINESS_TYPE_OPTIONS.map((type) => (
          <option value={type.value} key={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </section>
  );
}

function BusinessForm({ controller }) {
  const form = controller.businessForm;
  const selectedCity = controller.platformCities.find(
    (city) => city._id === form.cityId || city.slug === form.citySlug,
  );
  const cityChoices =
    selectedCity &&
    !controller.assignableCities.some((city) => city._id === selectedCity._id)
      ? [selectedCity, ...controller.assignableCities]
      : controller.assignableCities;

  return (
    <form
      className="platform-console-panel platform-business-form"
      id="business-form"
      onSubmit={controller.saveBusiness}
    >
      <div className="section-heading">
        <p className="eyebrow">Tenant</p>
        <h2>{controller.editingBusinessId ? "Modifica business" : "Nuovo business"}</h2>
      </div>

      <div className="platform-form-grid">
        <label>
          Nome attivita
          <input
            value={form.name}
            onChange={(event) => controller.updateBusinessForm("name", event.target.value)}
            placeholder="Mucho Gusto"
          />
        </label>
        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => controller.updateBusinessForm("slug", event.target.value)}
            placeholder="mucho-gusto"
          />
        </label>
        <label>
          Citta
          <select
            value={form.cityId || form.citySlug}
            onChange={(event) => controller.chooseBusinessCity(event.target.value)}
          >
            <option value="">Seleziona citta</option>
            {cityChoices.map((city) => (
              <option value={city._id || city.slug} key={city._id || city.slug}>
                {city.name}
                {city.province ? ` (${city.province})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            value={form.type}
            onChange={(event) => controller.updateBusinessForm("type", event.target.value)}
          >
            {BUSINESS_TYPE_OPTIONS.map((type) => (
              <option value={type.value} key={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Piano
          <select
            value={form.plan}
            onChange={(event) => controller.updateBusinessForm("plan", event.target.value)}
          >
            {PLAN_OPTIONS.map((plan) => (
              <option value={plan} key={plan}>
                {plan}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stato
          <select
            value={form.subscriptionStatus}
            onChange={(event) =>
              controller.updateBusinessForm("subscriptionStatus", event.target.value)
            }
          >
            {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Indirizzo
          <input
            value={form.address}
            onChange={(event) => controller.updateBusinessForm("address", event.target.value)}
          />
        </label>
        <label>
          Nome pubblico
          <input
            value={form.publicName}
            onChange={(event) => controller.updateBusinessForm("publicName", event.target.value)}
          />
        </label>
        <label>
          Logo URL
          <input
            value={form.logoUrl}
            onChange={(event) => controller.updateBusinessForm("logoUrl", event.target.value)}
          />
        </label>
        <label>
          Cover URL
          <input
            value={form.coverImageUrl}
            onChange={(event) =>
              controller.updateBusinessForm("coverImageUrl", event.target.value)
            }
          />
        </label>
        <label>
          Owner nome
          <input
            value={form.ownerName}
            onChange={(event) => controller.updateBusinessForm("ownerName", event.target.value)}
          />
        </label>
        <label>
          Owner email
          <input
            value={form.ownerEmail}
            onChange={(event) => controller.updateBusinessForm("ownerEmail", event.target.value)}
          />
        </label>
        <label>
          Password temporanea
          <input
            type="password"
            value={form.ownerPassword}
            onChange={(event) =>
              controller.updateBusinessForm("ownerPassword", event.target.value)
            }
            placeholder={controller.editingBusinessId ? "Lascia vuota" : "Minimo 8 caratteri"}
          />
        </label>
        <label>
          URL pubblico
          <input
            value={form.publicUrl}
            onChange={(event) => controller.updateBusinessForm("publicUrl", event.target.value)}
          />
        </label>
        <label>
          Vercel project
          <input
            value={form.vercelProjectName}
            onChange={(event) =>
              controller.updateBusinessForm("vercelProjectName", event.target.value)
            }
          />
        </label>
        <label>
          API base URL
          <input
            value={form.apiBaseUrl}
            onChange={(event) => controller.updateBusinessForm("apiBaseUrl", event.target.value)}
          />
        </label>
      </div>

      <div className="platform-color-grid">
        <label>
          Colore primario
          <input
            type="color"
            value={form.primaryColor}
            onChange={(event) =>
              controller.updateBusinessForm("primaryColor", event.target.value)
            }
          />
        </label>
        <label>
          Colore accento
          <input
            type="color"
            value={form.accentColor}
            onChange={(event) =>
              controller.updateBusinessForm("accentColor", event.target.value)
            }
          />
        </label>
      </div>

      <label>
        Messaggio pubblico
        <textarea
          value={form.publicMessage}
          onChange={(event) =>
            controller.updateBusinessForm("publicMessage", event.target.value)
          }
        />
      </label>

      <div className="platform-feature-grid">
        {[
          ["ordering", "Ordini"],
          ["seedTemplate", "Menu demo"],
          ["customPizza", "Pizza su misura"],
          ["coupons", "Coupon"],
          ["booking", "Booking"],
          ["rental", "Rental"],
        ].map(([field, label]) => (
          <label className="platform-check" key={field}>
            <input
              type="checkbox"
              checked={Boolean(form[field])}
              onChange={(event) => controller.updateBusinessForm(field, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="platform-env-preview">
        <span>Env business</span>
        <code>VITE_BUSINESS_SLUG={slugify(form.slug || form.name) || "nome-business"}</code>
      </div>

      <div className="platform-form-actions">
        <button type="submit" disabled={controller.businessSaving}>
          {controller.businessSaving
            ? "Salvataggio..."
            : controller.editingBusinessId
              ? "Salva business"
              : "Crea business"}
        </button>
        {controller.editingBusinessId && (
          <button type="button" onClick={controller.resetBusinessForm}>
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}

function BusinessCard({ business, onEdit, onUsers }) {
  const issues = assetIssuesFor(business);
  const metrics = business.metrics || {};
  return (
    <article className="platform-business-card">
      <header>
        <span style={{ background: business.branding?.primaryColor || "#2C5F2E" }}>
          {(business.name || business.slug || "B").slice(0, 2).toUpperCase()}
        </span>
        <div>
          <strong>{business.name}</strong>
          <small>
            /{businessCitySlug(business)}/{business.slug}
          </small>
        </div>
        <b className={`platform-status ${business.subscriptionStatus || "trialing"}`}>
          {business.subscriptionStatus || "trialing"}
        </b>
      </header>
      <div className="platform-business-facts">
        <span>
          <small>Citta</small>
          <b>{business.location?.cityName || business.city?.name || "N/D"}</b>
        </span>
        <span>
          <small>Owner</small>
          <b>{business.owner?.email || "mancante"}</b>
        </span>
        <span>
          <small>Piano</small>
          <b>{business.plan || "free"}</b>
        </span>
        <span>
          <small>Tipo</small>
          <b>{typeLabel(business.type)}</b>
        </span>
      </div>
      <div className="platform-business-metrics">
        <span>
          <small>Ordini</small>
          <b>{metrics.orders || 0}</b>
        </span>
        <span>
          <small>GMV</small>
          <b>{money(metrics.revenue || 0)}</b>
        </span>
        <span>
          <small>Clienti</small>
          <b>{metrics.customers || 0}</b>
        </span>
        <span className={issues.length ? "warning" : ""}>
          <small>Problemi asset</small>
          <b>{issues.length ? issues.join(", ") : "ok"}</b>
        </span>
      </div>
      <div className="platform-business-actions">
        <button type="button" onClick={() => onEdit(business)}>
          <Icon name="edit" />
          Modifica
        </button>
        <button type="button" onClick={() => onUsers(business)}>
          <Icon name="users" />
          Utenti
        </button>
        <a href={businessPublicPath(business)}>
          <Icon name="open" />
          Apri pubblico
        </a>
        <a href={businessAdminPath(business)}>
          <Icon name="dashboard" />
          Apri banco
        </a>
      </div>
    </article>
  );
}

function BusinessRow({ business }) {
  const issues = assetIssuesFor(business);
  return (
    <article className="platform-business-row">
      <div>
        <strong>{business.name}</strong>
        <span>
          {business.location?.cityName || "N/D"} - {business.owner?.email || "owner mancante"}
        </span>
      </div>
      <span className={`platform-status ${business.subscriptionStatus || "trialing"}`}>
        {business.subscriptionStatus || "trialing"}
      </span>
      <small>{issues.length ? `${issues.length} asset` : "asset ok"}</small>
      <button type="button" onClick={() => { window.location.href = "/admin/businesses"; }}>
        Modifica
      </button>
      <button type="button" onClick={() => { window.location.href = "/admin/users"; }}>
        Utenti
      </button>
    </article>
  );
}

function UsersSection({ controller }) {
  return (
    <section className="platform-users-layout">
      <article className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">Business</p>
          <h2>Seleziona tenant</h2>
        </div>
        <div className="platform-user-business-list">
          {controller.platformBusinesses.map((business) => (
            <button
              className={
                controller.selectedBusinessForUsers?._id === business._id ? "active" : ""
              }
              key={business._id || business.slug}
              type="button"
              onClick={() => controller.openBusinessUsers(business)}
            >
              <strong>{business.name}</strong>
              <span>{business.owner?.email || "owner mancante"}</span>
            </button>
          ))}
        </div>
      </article>
      <UsersPanel controller={controller} />
    </section>
  );
}

function UsersPanel({ controller, compact = false }) {
  const business = controller.selectedBusinessForUsers;
  return (
    <section className={`platform-console-panel platform-users-panel ${compact ? "compact" : ""}`}>
      <div className="section-heading">
        <p className="eyebrow">Owner / admin / staff</p>
        <h2>{business ? `Utenti ${business.name}` : "Utenti business"}</h2>
      </div>

      {!business ? (
        <InlineNotice
          title="Nessun business selezionato"
          description="Scegli un tenant per vedere o creare owner, admin e staff."
        />
      ) : (
        <>
          <form className="platform-user-form" onSubmit={controller.saveBusinessUser}>
            <label>
              Nome
              <input
                value={controller.businessUserForm.name}
                onChange={(event) =>
                  controller.setBusinessUserForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Email
              <input
                value={controller.businessUserForm.email}
                onChange={(event) =>
                  controller.setBusinessUserForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Ruolo
              <select
                value={controller.businessUserForm.role}
                onChange={(event) =>
                  controller.setBusinessUserForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                {BUSINESS_USER_ROLES.map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Password temporanea
              <input
                type="password"
                value={controller.businessUserForm.password}
                onChange={(event) =>
                  controller.setBusinessUserForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={controller.editingBusinessUserId ? "Lascia vuota" : "Minimo 8 caratteri"}
              />
            </label>
            <label className="platform-check">
              <input
                checked={controller.businessUserForm.active}
                type="checkbox"
                onChange={(event) =>
                  controller.setBusinessUserForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              Attivo
            </label>
            <div className="platform-form-actions">
              <button type="submit" disabled={controller.businessUserSaving}>
                {controller.businessUserSaving
                  ? "Salvataggio..."
                  : controller.editingBusinessUserId
                    ? "Salva utente"
                    : "Crea utente"}
              </button>
              {controller.editingBusinessUserId && (
                <button type="button" onClick={controller.resetBusinessUserForm}>
                  Annulla
                </button>
              )}
            </div>
          </form>

          <div className="platform-users-list">
            {controller.businessUsersLoading ? (
              <InlineNotice title="Caricamento utenti" />
            ) : controller.businessUsers.length === 0 ? (
              <InlineNotice
                title="Nessun utente"
                description="Crea almeno owner o admin per dare accesso al locale."
              />
            ) : (
              controller.businessUsers.map((user) => (
                <article key={user._id}>
                  <div>
                    <strong>{user.name || user.email}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span className="platform-role-pill">{user.role}</span>
                  <span className={`platform-status ${user.active === false ? "disabled" : "active"}`}>
                    {user.active === false ? "disabled" : "active"}
                  </span>
                  <button type="button" onClick={() => controller.editBusinessUser(user)}>
                    Modifica
                  </button>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SettingsSection() {
  return (
    <section className="platform-settings-grid">
      <article className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">Routing</p>
          <h2>Superfici separate</h2>
        </div>
        <dl className="platform-route-list">
          <div>
            <dt>/admin</dt>
            <dd>Dashboard piattaforma.</dd>
          </div>
          <div>
            <dt>/admin/cities</dt>
            <dd>Registro comuni e mercati attivati.</dd>
          </div>
          <div>
            <dt>/admin/businesses</dt>
            <dd>Tenant, piani, owner e asset.</dd>
          </div>
          <div>
            <dt>/:citySlug/:businessSlug/admin</dt>
            <dd>Banco operativo del locale.</dd>
          </div>
        </dl>
      </article>
      <article className="platform-console-panel">
        <div className="section-heading">
          <p className="eyebrow">City registry</p>
          <h2>Import comuni</h2>
        </div>
        <div className="platform-env-preview">
          <span>Comando backend</span>
          <code>npm --prefix backend run cities:import -- --file comuni.csv</code>
        </div>
      </article>
    </section>
  );
}

function MetricCard({ label, tone = "default", value }) {
  return (
    <article className={tone}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
