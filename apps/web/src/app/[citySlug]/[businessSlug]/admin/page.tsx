import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MODULE_DEFINITIONS } from "@platform/templates";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminSubmitButton } from "../../../../components/admin-submit-button";
import {
  fetchPlatformApi,
  type PlatformBusinessesResponse,
  type PlatformBusiness,
  type PlatformBusinessInquiriesResponse,
  type PlatformBusinessInquiry,
  type PlatformBusinessServicesResponse,
  type PlatformPickupOrdersResponse,
  PlatformApiError,
} from "../../../../lib/platform-api";
import { getWebSession } from "../../../../lib/web-session";
import { logoutAction } from "../../../admin/actions";
import {
  updateBusinessModulesAction,
  updateInquiryStatusAction,
  updatePickupOrderStatusAction,
} from "./actions";
import { CreateMenuItemForm, UpdateMenuItemForm } from "./menu-forms";

export const metadata = {
  title: "Area operatori business",
};

type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

function resolveModuleSummary(business: PlatformBusiness) {
  if (business.modules.length === 0) {
    return "Nessun modulo attivo ancora assegnato.";
  }

  return business.modules
    .map((entry) => `${entry.moduleCode}${entry.active ? "" : " (paused)"}`)
    .join(", ");
}

function formatLocation(business: PlatformBusiness) {
  return [business.addressLine1, business.city.name].filter(Boolean).join(", ");
}

async function loadBusiness(
  citySlug: string,
  businessSlug: string,
  token: string,
): Promise<PlatformBusiness | null> {
  try {
    const response = await fetchPlatformApi<PlatformBusinessesResponse>(
      `/api/v2/platform-core/businesses?citySlug=${encodeURIComponent(citySlug)}&limit=100`,
      {
        token,
        cache: "no-store",
      },
    );

    return response.items.find((item) => item.slug === businessSlug) ?? null;
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function loadPickupOrders(citySlug: string, businessSlug: string, token: string) {
  try {
    return await fetchPlatformApi<PlatformPickupOrdersResponse>(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/pickup-orders?limit=20`,
      { token, cache: "no-store" },
    );
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) return null;
    throw error;
  }
}

async function loadBusinessServices(citySlug: string, businessSlug: string, token: string) {
  try {
    return await fetchPlatformApi<PlatformBusinessServicesResponse>(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/services`,
      { token, cache: "no-store" },
    );
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) return null;
    throw error;
  }
}

async function loadBusinessInquiries(citySlug: string, businessSlug: string, token: string) {
  try {
    return await fetchPlatformApi<PlatformBusinessInquiriesResponse>(
      `/api/v2/platform-core/cities/${encodeURIComponent(citySlug)}/businesses/${encodeURIComponent(businessSlug)}/inquiries?limit=20`,
      { token, cache: "no-store" },
    );
  } catch (error) {
    if (error instanceof PlatformApiError && error.status === 404) return null;
    throw error;
  }
}

const statusLabels = {
  new: "Nuovo",
  accepted: "Accettato",
  preparing: "In preparazione",
  ready: "Pronto",
  completed: "Completato",
  cancelled: "Annullato",
} as const;

const nextStatuses = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
} as const;

const inquiryStatusLabels = {
  new: "Nuova",
  read: "Letta",
  closed: "Chiusa",
} as const;

const nextInquiryStatuses: Record<
  PlatformBusinessInquiry["status"],
  readonly PlatformBusinessInquiry["status"][]
> = {
  new: ["read", "closed"],
  read: ["closed"],
  closed: [],
};

function formatOrderTotal(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatPickupAt(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function formatInquiryDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default async function BusinessAdminPage({ params, searchParams }: BusinessAdminPageProps) {
  const { citySlug, businessSlug } = await params;
  const { notice, error } = await searchParams;
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  const [business, pickupOrders, services, inquiries] = await Promise.all([
    loadBusiness(citySlug, businessSlug, session.token),
    loadPickupOrders(citySlug, businessSlug, session.token),
    loadBusinessServices(citySlug, businessSlug, session.token),
    loadBusinessInquiries(citySlug, businessSlug, session.token),
  ]);

  if (!business) {
    notFound();
  }

  const canManageCatalog = session.auth.activeAccess.permissions.includes("catalog.manage");
  const canManageModules = session.auth.activeAccess.permissions.includes("modules.manage");
  const canManageBusiness = session.auth.activeAccess.permissions.includes("businesses.manage");
  const activeModuleCodes = new Set(
    business.modules.filter((module) => module.active).map((module) => module.moduleCode),
  );

  return (
    <AdminShell
      eyebrow="Area operatori"
      title={`${business.name} · area operatori`}
      description="Questa area è riservata agli operatori autorizzati del business: profilo, moduli attivi, contenuti pubblici e stato del tenant."
      routePath={`/${citySlug}/${businessSlug}/admin`}
      navigationItems={[
        { href: "/", label: "Home pubblica", meta: "Scegli una città" },
        {
          href: `/${citySlug}`,
          label: business.city.name,
          meta: "Directory pubblica",
        },
        {
          href: `/${citySlug}/${businessSlug}`,
          label: "Scheda pubblica",
          meta: business.name,
        },
        {
          href: `/${citySlug}/${businessSlug}/admin`,
          label: "Gestione attività",
          meta: "Menu, moduli e richieste",
          current: true,
        },
        ...(session.auth.accesses.length > 1
          ? [
              {
                href: "/select-access",
                label: "Cambia accesso",
                meta: "Scegli un'altra attività",
              },
            ]
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
      <section className="stats-grid">
        <article className="metric-card">
          <span>Template</span>
          <strong>{business.template.name}</strong>
          <p>{business.template.code}</p>
        </article>

        <article className="metric-card">
          <span>Modulo principale</span>
          <strong>{business.template.primaryModule}</strong>
          <p>Definito dal template assegnato al business.</p>
        </article>

        <article className="metric-card">
          <span>Moduli attivi</span>
          <strong>{business.modules.filter((entry) => entry.active).length}</strong>
          <p>{resolveModuleSummary(business)}</p>
        </article>

        <article className="metric-card">
          <span>Stato tenant</span>
          <strong>{business.status}</strong>
          <p>
            Piano {business.plan}, subscription {business.subscriptionStatus}.
          </p>
        </article>

        <article className="metric-card">
          <span>Ordini ritiro</span>
          <strong>{pickupOrders?.total ?? 0}</strong>
          <p>Gestiti senza tracking pubblico.</p>
        </article>

        <article className="metric-card">
          <span>Richieste</span>
          <strong>{inquiries?.total ?? 0}</strong>
          <p>Messaggi inviati dalla scheda pubblica.</p>
        </article>
      </section>

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

      <section className="data-grid">
        <article className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Profilo</p>
              <h2>Profilo pubblico del business</h2>
            </div>
            <code>/api/v2/platform-core/businesses</code>
          </div>

          <dl className="mini-facts">
            <div>
              <dt>Business</dt>
              <dd>{business.name}</dd>
            </div>
            <div>
              <dt>Slug</dt>
              <dd>{business.slug}</dd>
            </div>
            <div>
              <dt>Citta</dt>
              <dd>{business.city.name}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{business.category ?? business.template.category}</dd>
            </div>
            <div>
              <dt>Posizione</dt>
              <dd>{formatLocation(business) || "n/d"}</dd>
            </div>
            <div>
              <dt>Contatto</dt>
              <dd>{business.publicPhone ?? business.publicEmail ?? business.website ?? "n/d"}</dd>
            </div>
          </dl>
        </article>

        <article className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Superficie pubblica</p>
              <h2>Cosa vede l'utente finale</h2>
            </div>
            <code>
              /{citySlug}/{businessSlug}
            </code>
          </div>

          <p className="muted-copy">Titolo pubblico: {business.publicTitle ?? "non impostato"}.</p>
          <p className="muted-copy">Sottotitolo: {business.publicSubtitle ?? "non impostato"}.</p>
          <p className="muted-copy">
            Descrizione: {business.publicDescription ?? "non impostata"}.
          </p>
          <p className="muted-copy">
            CTA default: {business.template.defaultCtaLabel ?? "non impostata"}.
          </p>
          <Link className="text-link admin-public-link" href={`/${citySlug}/${businessSlug}`}>
            Apri la scheda pubblica
          </Link>
        </article>
      </section>

      <section className="data-card" id="inquiries">
        <div className="card-heading">
          <div>
            <p className="section-label">Richieste</p>
            <h2>Messaggi ricevuti dalla scheda pubblica</h2>
          </div>
          <code>inquiries</code>
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
                      <span>{formatInquiryDate(inquiry.createdAt)}</span>
                    </div>
                  </div>
                  {canManageBusiness && availableStatuses.length > 1 ? (
                    <form action={updateInquiryStatusAction} className="admin-order-status-form">
                      <input type="hidden" name="citySlug" value={citySlug} />
                      <input type="hidden" name="businessSlug" value={businessSlug} />
                      <input type="hidden" name="inquiryId" value={inquiry.id} />
                      <label>
                        Stato
                        <select name="status" defaultValue={inquiry.status}>
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {inquiryStatusLabels[status]}
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
          <p className="muted-copy">
            {inquiries
              ? "Nessuna richiesta ricevuta al momento."
              : "Le richieste non sono disponibili per questo ambito."}
          </p>
        )}
      </section>

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Configurazione</p>
            <h2>Stato del business dentro il core city-first</h2>
          </div>
          <code>{business.template.code}</code>
        </div>

        <ul className="detail-list">
          <li>Il business eredita un template ufficiale del catalogo piattaforma.</li>
          <li>I moduli attivi restano standardizzati e non sono logiche custom per tenant.</li>
          <li>
            Contenuti, contatti, CTA e identita pubblica vivono dentro una shell coerente con la
            citta.
          </li>
          <li>Questa console e lo scaffold da cui far crescere contenuti, moduli e permessi.</li>
        </ul>
      </section>

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Moduli</p>
            <h2>Scegli le funzioni del locale</h2>
          </div>
          <code>modules.manage</code>
        </div>
        <p className="muted-copy">
          Il modulo principale del template resta sempre attivo. Le altre funzioni si possono
          attivare o mettere in pausa senza perdere la relativa configurazione.
        </p>
        {canManageModules ? (
          <form action={updateBusinessModulesAction} className="business-management-form">
            <input type="hidden" name="citySlug" value={citySlug} />
            <input type="hidden" name="businessSlug" value={businessSlug} />
            <input type="hidden" name="moduleCodes" value={business.template.primaryModule} />
            <fieldset className="business-module-fieldset">
              <legend>Moduli disponibili</legend>
              <div className="business-module-grid">
                {MODULE_DEFINITIONS.map((module) => {
                  const isPrimary = module.code === business.template.primaryModule;
                  return (
                    <label className="business-module-option" key={module.code}>
                      <input
                        type="checkbox"
                        name="moduleCodes"
                        value={module.code}
                        defaultChecked={isPrimary || activeModuleCodes.has(module.code)}
                        disabled={isPrimary}
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

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Menu e prezzi</p>
            <h2>Voci disponibili al pubblico</h2>
          </div>
          <code>catalog.manage</code>
        </div>
        <p className="muted-copy">
          Le voci pubblicate con un prezzo entrano nel menu per il ritiro quando l'ordinazione è
          attiva per questo locale.
        </p>
        {canManageCatalog ? (
          <CreateMenuItemForm
            businessSlug={businessSlug}
            citySlug={citySlug}
            currency={business.currency}
          />
        ) : (
          <p className="muted-copy">Il tuo ruolo può visualizzare il menu ma non modificarlo.</p>
        )}

        {services?.items.length ? (
          <div className="business-menu-list">
            {services.items.map((service) =>
              canManageCatalog ? (
                <UpdateMenuItemForm
                  businessSlug={businessSlug}
                  citySlug={citySlug}
                  currency={business.currency}
                  key={service.id}
                  service={service}
                />
              ) : (
                <article className="business-menu-row" key={service.id}>
                  <strong>{service.name}</strong>
                  <span className="muted-copy">
                    {service.priceCents === null
                      ? "Prezzo non disponibile"
                      : new Intl.NumberFormat("it-IT", {
                          style: "currency",
                          currency: business.currency,
                        }).format(service.priceCents / 100)}
                  </span>
                </article>
              ),
            )}
          </div>
        ) : (
          <p className="muted-copy">Il menu non contiene ancora voci.</p>
        )}
      </section>

      <section className="data-card">
        <div className="card-heading">
          <div>
            <p className="section-label">Ordini ritiro</p>
            <h2>Ordini ricevuti</h2>
          </div>
          <code>pickup-ordering</code>
        </div>
        {pickupOrders?.items.length ? (
          <div className="admin-order-list">
            {pickupOrders.items.map((order) => {
              const availableStatuses = [order.status, ...nextStatuses[order.status]];
              return (
                <article className="admin-order-row" key={order.id}>
                  <div>
                    <strong>{order.reference}</strong>
                    <p>
                      {order.customerName} · ritiro {formatPickupAt(order.pickupAt)}
                    </p>
                    <p>
                      {order.items
                        .map((item) => `${item.quantity}× ${item.nameSnapshot}`)
                        .join(", ")}
                    </p>
                    <p>{formatOrderTotal(order.totalCents)}</p>
                  </div>
                  {canManageBusiness && availableStatuses.length > 1 ? (
                    <form
                      action={updatePickupOrderStatusAction}
                      className="admin-order-status-form"
                    >
                      <input type="hidden" name="citySlug" value={citySlug} />
                      <input type="hidden" name="businessSlug" value={businessSlug} />
                      <input type="hidden" name="orderId" value={order.id} />
                      <label>
                        Stato
                        <select name="status" defaultValue={order.status}>
                          {availableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
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
          <p className="muted-copy">Nessun ordine di ritiro ricevuto al momento.</p>
        )}
      </section>
    </AdminShell>
  );
}
