import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminSubmitButton } from "../../../../components/admin-submit-button";
import {
  fetchPlatformApi,
  type PlatformBusiness,
  type PlatformBusinessCategoriesResponse,
  type PlatformBusinessInquiriesResponse,
  type PlatformBusinessInquiry,
  type PlatformBusinessesResponse,
  type PlatformBusinessServicesResponse,
  type PlatformOpeningHoursResponse,
  type PlatformPickupOrdersResponse,
  type PlatformPublishReadinessResponse,
  PlatformApiError,
} from "../../../../lib/platform-api";
import { readinessReasonLabel, readinessSummary } from "../../../../lib/business-admin-logic";
import { getWebSession } from "../../../../lib/web-session";
import { logoutAction } from "../../../admin/actions";
import {
  publishBusinessAction,
  unpublishBusinessAction,
  updateBusinessCategoriesAction,
  updateBusinessModulesAction,
  updateInquiryStatusAction,
  updatePickupOrderStatusAction,
} from "./actions";
import { BusinessProfileForm } from "./business-profile-form";
import { CreateMenuItemForm, UpdateMenuItemForm } from "./menu-forms";
import { OpeningHoursEditor } from "./opening-hours-editor";

export const metadata = { title: "Area operatori business" };

type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function businessApiPath(citySlug: string, businessSlug: string) {
  return `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}`;
}

async function loadBusiness(
  citySlug: string,
  businessSlug: string,
  token: string,
): Promise<PlatformBusiness | null> {
  try {
    const response = await fetchPlatformApi<PlatformBusinessesResponse>(
      `/api/v2/platform-core/businesses?citySlug=${encodeURIComponent(citySlug)}&limit=100`,
      { token, cache: "no-store" },
    );
    return response.items.find((item) => item.slug === businessSlug) ?? null;
  } catch (error) {
    if (error instanceof PlatformApiError && (error.status === 403 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

async function loadOptional<T>(path: string, token: string): Promise<T | null> {
  try {
    return await fetchPlatformApi<T>(path, { token, cache: "no-store" });
  } catch (error) {
    if (error instanceof PlatformApiError && (error.status === 403 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

const pickupStatusLabels = {
  new: "Nuovo",
  accepted: "Accettato",
  preparing: "In preparazione",
  ready: "Pronto",
  completed: "Completato",
  cancelled: "Annullato",
} as const;

const nextPickupStatuses = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
} as const;

const inquiryStatusLabels = { new: "Nuova", read: "Letta", closed: "Chiusa" } as const;
const serviceStatusLabels = {
  draft: "Bozza",
  in_review: "In revisione",
  published: "Pubblicato",
  archived: "Archiviato",
} as const;
const nextInquiryStatuses: Record<
  PlatformBusinessInquiry["status"],
  readonly PlatformBusinessInquiry["status"][]
> = { new: ["read", "closed"], read: ["closed"], closed: [] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

export default async function BusinessAdminPage({ params, searchParams }: BusinessAdminPageProps) {
  const { citySlug, businessSlug } = await params;
  const { notice, error } = await searchParams;
  const session = await getWebSession();
  if (!session) redirect("/admin/login");

  const basePath = businessApiPath(citySlug, businessSlug);
  const [business, categories, services, openingHours, readiness, inquiries, pickupOrders] =
    await Promise.all([
      loadBusiness(citySlug, businessSlug, session.token),
      loadOptional<PlatformBusinessCategoriesResponse>(`${basePath}/categories`, session.token),
      loadOptional<PlatformBusinessServicesResponse>(`${basePath}/services`, session.token),
      loadOptional<PlatformOpeningHoursResponse>(`${basePath}/opening-hours`, session.token),
      loadOptional<PlatformPublishReadinessResponse>(
        `${basePath}/publish-readiness`,
        session.token,
      ),
      loadOptional<PlatformBusinessInquiriesResponse>(
        `${basePath}/inquiries?limit=20`,
        session.token,
      ),
      loadOptional<PlatformPickupOrdersResponse>(
        `${basePath}/pickup-orders?limit=20`,
        session.token,
      ),
    ]);
  if (!business) notFound();

  const permissions = new Set(session.auth.activeAccess.permissions);
  const canManageBusiness = permissions.has("businesses.manage");
  const canManageCatalog = permissions.has("catalog.manage");
  const canManageSettings = permissions.has("settings.manage");
  const canManageModules = permissions.has("modules.manage");
  const assignedCategoryIds = new Set(categories?.items.map((item) => item.id) ?? []);
  const categoriesById = new Map(
    categories?.availableCategories.map((category) => [category.id, category]) ?? [],
  );
  const activeModuleCodes = new Set(
    business.modules.filter((module) => module.active).map((module) => module.moduleCode),
  );
  const publicPath = `/${citySlug}/${business.slug}`;
  const anchorItems = [
    ["overview", "Panoramica"],
    ["profile", "Profilo"],
    ["categories", "Categorie"],
    ["services", "Servizi"],
    ["opening-hours", "Orari"],
    ["publication", "Pubblicazione"],
    ["inquiries", "Richieste"],
    ["modules", "Moduli"],
    ["pickup-orders", "Ordini ritiro"],
  ] as const;

  return (
    <AdminShell
      eyebrow="Area operatori"
      title={`${business.name} · area operatori`}
      description="Gestisci il percorso completo dell'attività: profilo, categorie, servizi, orari, pubblicazione e richieste."
      routePath={`/${citySlug}/${businessSlug}/admin`}
      navigationItems={[
        { href: "/", label: "Home pubblica", meta: "Scegli una città" },
        { href: `/${citySlug}`, label: business.city.name, meta: "Directory pubblica" },
        ...(business.status === "active"
          ? [{ href: publicPath, label: "Scheda pubblica", meta: business.name }]
          : []),
        {
          href: `/${citySlug}/${businessSlug}/admin`,
          label: "Gestione attività",
          meta: "Profilo e pubblicazione",
          current: true,
        },
        ...(session.auth.accesses.length > 1
          ? [{ href: "/select-access", label: "Cambia accesso", meta: "Scegli un altro scope" }]
          : []),
      ]}
      statusLabel={`Area operatori · ${session.auth.activeAccess.role.replaceAll("_", " ")}`}
      asideTitle="Scope attivo"
      asideText={`Utente: ${session.auth.user.email}. Ambito: ${session.auth.activeAccess.scopeType}. Attività: ${business.city.slug}/${business.slug}.`}
      headerActions={
        <>
          {session.auth.accesses.length > 1 ? (
            <Link className="ghost-button" href="/select-access">
              Cambia accesso
            </Link>
          ) : null}
          <form action={logoutAction} className="operator-session-form">
            <AdminSubmitButton className="ghost-button" pendingLabel="Uscita…">
              Esci
            </AdminSubmitButton>
          </form>
        </>
      }
    >
      <nav className="business-admin-anchor-nav" aria-label="Sezioni gestione attività">
        {anchorItems.map(([id, label]) => (
          <a href={`#${id}`} key={id}>
            {label}
          </a>
        ))}
      </nav>

      {notice ? (
        <p className="surface-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="surface-error" role="alert">
          {error}
        </p>
      ) : null}

      <section id="overview" aria-labelledby="overview-title">
        <div className="section-header">
          <p className="section-label">Panoramica</p>
          <h2 id="overview-title">Stato dell'attività</h2>
        </div>
        <div className="stats-grid">
          <article className="metric-card">
            <span>Stato</span>
            <strong>{business.status === "active" ? "Pubblicata" : "Bozza"}</strong>
            <p>Piano {business.plan}</p>
          </article>
          <article className="metric-card">
            <span>Readiness</span>
            <strong>{readiness ? readinessSummary(readiness.item) : "Non disponibile"}</strong>
            <p>{readiness?.item.missingRequirements.length ?? 0} requisiti mancanti</p>
          </article>
          <article className="metric-card">
            <span>Servizi</span>
            <strong>{services?.items.length ?? 0}</strong>
            <p>Voci configurate</p>
          </article>
          <article className="metric-card">
            <span>Richieste</span>
            <strong>{inquiries?.total ?? 0}</strong>
            <p>Messaggi ricevuti</p>
          </article>
        </div>
      </section>

      <section className="data-card" id="profile" aria-labelledby="profile-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Profilo</p>
            <h2 id="profile-title">Profilo pubblico</h2>
          </div>
          <code>businesses.manage</code>
        </div>
        {canManageBusiness ? (
          <BusinessProfileForm business={business} />
        ) : (
          <p className="muted-copy">Il tuo ruolo può visualizzare il profilo ma non modificarlo.</p>
        )}
      </section>

      <section className="data-card" id="categories" aria-labelledby="categories-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Categorie</p>
            <h2 id="categories-title">Categorie della città</h2>
          </div>
          <code>businesses.manage</code>
        </div>
        {categories ? (
          <form action={updateBusinessCategoriesAction} className="business-management-form">
            <input type="hidden" name="citySlug" value={citySlug} />
            <input type="hidden" name="businessSlug" value={business.slug} />
            <fieldset className="business-form-fieldset" disabled={!canManageBusiness}>
              <legend>Assegnazioni correnti</legend>
              <div className="business-category-grid">
                {categories.availableCategories.map((category) => {
                  const parent = category.parentId ? categoriesById.get(category.parentId) : null;
                  return (
                    <label
                      className={`business-check-option${category.parentId ? " business-category-child" : ""}`}
                      key={category.id}
                    >
                      <input
                        defaultChecked={assignedCategoryIds.has(category.id)}
                        disabled={!category.active}
                        name="categoryIds"
                        type="checkbox"
                        value={category.id}
                      />
                      <span>
                        <strong>{category.name}</strong>
                        <small>
                          {parent ? `Sotto-categoria di ${parent.name} · ` : ""}
                          {category.active ? "Attiva" : "Inattiva, non selezionabile"}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {canManageBusiness ? (
              <AdminSubmitButton pendingLabel="Salvataggio categorie…">
                Salva categorie
              </AdminSubmitButton>
            ) : null}
          </form>
        ) : (
          <p className="muted-copy">Categorie non disponibili per questo scope.</p>
        )}
      </section>

      <section className="data-card" id="services" aria-labelledby="services-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Servizi</p>
            <h2 id="services-title">Catalogo pubblico</h2>
          </div>
          <code>catalog.manage</code>
        </div>
        {canManageCatalog ? (
          <CreateMenuItemForm
            businessSlug={business.slug}
            citySlug={citySlug}
            currency={business.currency}
          />
        ) : (
          <p className="muted-copy">Il tuo ruolo può visualizzare i servizi ma non modificarli.</p>
        )}
        {services?.items.length ? (
          <div className="business-menu-list">
            {services.items.map((service) =>
              canManageCatalog ? (
                <UpdateMenuItemForm
                  businessSlug={business.slug}
                  citySlug={citySlug}
                  currency={business.currency}
                  key={service.id}
                  service={service}
                />
              ) : (
                <article className="business-menu-row" key={service.id}>
                  <strong>{service.name}</strong>
                  <span>{serviceStatusLabels[service.status]}</span>
                </article>
              ),
            )}
          </div>
        ) : (
          <p className="muted-copy">Nessun servizio configurato.</p>
        )}
      </section>

      <section className="data-card" id="opening-hours" aria-labelledby="opening-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Orari</p>
            <h2 id="opening-title">Orari di apertura</h2>
          </div>
          <code>settings.manage</code>
        </div>
        {canManageSettings ? (
          <OpeningHoursEditor
            businessSlug={business.slug}
            citySlug={citySlug}
            items={openingHours?.items ?? []}
          />
        ) : (
          <p className="muted-copy">Il tuo ruolo può visualizzare gli orari ma non modificarli.</p>
        )}
      </section>

      <section className="data-card" id="publication" aria-labelledby="publication-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Pubblicazione</p>
            <h2 id="publication-title">
              {readiness ? readinessSummary(readiness.item) : "Readiness non disponibile"}
            </h2>
          </div>
          <code>businesses.manage</code>
        </div>
        {readiness?.item.missingRequirements.length ? (
          <ul className="detail-list">
            {readiness.item.missingRequirements.map((reason) => (
              <li key={reason}>{readinessReasonLabel(reason)}</li>
            ))}
          </ul>
        ) : null}
        {readiness?.item.warnings.length ? (
          <ul className="detail-list">
            {readiness.item.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <div className="business-publication-actions">
          {canManageBusiness && business.status === "draft" ? (
            <form action={publishBusinessAction}>
              <input type="hidden" name="citySlug" value={citySlug} />
              <input type="hidden" name="businessSlug" value={business.slug} />
              {readiness?.item.canPublish ? (
                <AdminSubmitButton pendingLabel="Pubblicazione…">
                  Pubblica attività
                </AdminSubmitButton>
              ) : (
                <button className="form-button" disabled type="submit">
                  Pubblica attività
                </button>
              )}
            </form>
          ) : null}
          {canManageBusiness && business.status === "active" ? (
            <form action={unpublishBusinessAction}>
              <input type="hidden" name="citySlug" value={citySlug} />
              <input type="hidden" name="businessSlug" value={business.slug} />
              <AdminSubmitButton className="ghost-button" pendingLabel="Rimozione…">
                Rimuovi dalla pubblicazione
              </AdminSubmitButton>
            </form>
          ) : null}
          {business.status === "active" ? (
            <Link className="text-link" href={publicPath}>
              Apri la scheda pubblica
            </Link>
          ) : (
            <p className="muted-copy">La scheda sarà disponibile dopo la pubblicazione.</p>
          )}
        </div>
      </section>

      <section className="data-card" id="inquiries" aria-labelledby="inquiries-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Richieste</p>
            <h2 id="inquiries-title">Messaggi ricevuti</h2>
          </div>
          <code>businesses.manage</code>
        </div>
        {inquiries?.items.length ? (
          <div className="admin-inquiry-list">
            {inquiries.items.map((inquiry) => {
              const availableStatuses = [inquiry.status, ...nextInquiryStatuses[inquiry.status]];
              return (
                <article className="admin-inquiry-row" key={inquiry.id}>
                  <div className="admin-inquiry-copy">
                    <div className="admin-inquiry-heading">
                      <strong>{inquiry.name}</strong>
                      <span className="pill">{inquiryStatusLabels[inquiry.status]}</span>
                    </div>
                    <p>{inquiry.message}</p>
                    <div className="admin-inquiry-contacts">
                      <a className="table-link" href={`mailto:${inquiry.email}`}>
                        {inquiry.email}
                      </a>
                      {inquiry.phone ? <span>{inquiry.phone}</span> : null}
                      <span>{formatDate(inquiry.createdAt)}</span>
                    </div>
                  </div>
                  {canManageBusiness ? (
                    <form action={updateInquiryStatusAction} className="admin-inquiry-form">
                      <input type="hidden" name="citySlug" value={citySlug} />
                      <input type="hidden" name="businessSlug" value={business.slug} />
                      <input type="hidden" name="inquiryId" value={inquiry.id} />
                      <label className="field">
                        <span>Stato</span>
                        <select defaultValue={inquiry.status} name="status">
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {inquiryStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Nota interna</span>
                        <textarea
                          defaultValue={inquiry.internalNote ?? ""}
                          maxLength={2000}
                          name="internalNote"
                        />
                      </label>
                      <AdminSubmitButton className="ghost-button" pendingLabel="Aggiornamento…">
                        Salva richiesta
                      </AdminSubmitButton>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted-copy">Nessuna richiesta ricevuta.</p>
        )}
      </section>

      <section className="data-card" id="modules" aria-labelledby="modules-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Moduli</p>
            <h2 id="modules-title">Funzioni del business</h2>
          </div>
          <code>modules.manage</code>
        </div>
        <p className="muted-copy">
          Il modulo principale resta sempre attivo; gli altri moduli sono configurabili.
        </p>
        {canManageModules ? (
          <form action={updateBusinessModulesAction} className="business-management-form">
            <input type="hidden" name="citySlug" value={citySlug} />
            <input type="hidden" name="businessSlug" value={business.slug} />
            <input type="hidden" name="moduleCodes" value={business.template.primaryModule} />
            <fieldset className="business-module-fieldset">
              <legend>Moduli disponibili</legend>
              <div className="business-module-grid">
                {MODULE_DEFINITIONS.map((module) => {
                  const isPrimary = module.code === business.template.primaryModule;
                  return (
                    <label className="business-module-option" key={module.code}>
                      <input
                        defaultChecked={isPrimary || activeModuleCodes.has(module.code)}
                        disabled={isPrimary}
                        name="moduleCodes"
                        type="checkbox"
                        value={module.code}
                      />
                      <span>
                        <strong>{module.label}</strong>
                        <small>{module.operationalFocus}</small>
                      </span>
                      {isPrimary ? <em>Principale</em> : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <AdminSubmitButton pendingLabel="Salvataggio moduli…">Salva moduli</AdminSubmitButton>
          </form>
        ) : (
          <p className="muted-copy">Il tuo ruolo può visualizzare i moduli ma non modificarli.</p>
        )}
      </section>

      <section className="data-card" id="pickup-orders" aria-labelledby="pickup-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Estensione opzionale</p>
            <h2 id="pickup-title">Ordini ritiro</h2>
          </div>
          <code>pickup-ordering</code>
        </div>
        <p className="muted-copy">
          Estensione dimostrativa opzionale: non è necessaria per readiness, pubblicazione o
          percorso core della tesi.
        </p>
        {pickupOrders?.items.length ? (
          <div className="admin-order-list">
            {pickupOrders.items.map((order) => {
              const availableStatuses = [order.status, ...nextPickupStatuses[order.status]];
              return (
                <article className="admin-order-row" key={order.id}>
                  <div>
                    <strong>{order.reference}</strong>
                    <p>
                      {order.customerName} · ritiro {formatDate(order.pickupAt)}
                    </p>
                    <p>
                      {order.items
                        .map((item) => `${item.quantity}× ${item.nameSnapshot}`)
                        .join(", ")}
                    </p>
                    <p>{formatMoney(order.totalCents, business.currency)}</p>
                  </div>
                  {canManageBusiness && availableStatuses.length > 1 ? (
                    <form
                      action={updatePickupOrderStatusAction}
                      className="admin-order-status-form"
                    >
                      <input type="hidden" name="citySlug" value={citySlug} />
                      <input type="hidden" name="businessSlug" value={business.slug} />
                      <input type="hidden" name="orderId" value={order.id} />
                      <label>
                        Stato
                        <select defaultValue={order.status} name="status">
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {pickupStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <AdminSubmitButton className="ghost-button" pendingLabel="Aggiornamento…">
                        Aggiorna
                      </AdminSubmitButton>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted-copy">Nessun ordine di ritiro ricevuto.</p>
        )}
      </section>
    </AdminShell>
  );
}
