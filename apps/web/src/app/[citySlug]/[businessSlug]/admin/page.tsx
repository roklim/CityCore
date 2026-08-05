import { notFound, redirect } from "next/navigation";
import { AdminShell } from "../../../../components/admin-shell";
import {
  fetchPlatformApi,
  type PlatformBusinessesResponse,
  type PlatformBusiness,
  type PlatformPickupOrdersResponse,
  PlatformApiError,
} from "../../../../lib/platform-api";
import { getWebSession } from "../../../../lib/web-session";
import { updatePickupOrderStatusAction } from "./actions";

export const metadata = {
  title: "Area operatori business",
};

type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
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

export default async function BusinessAdminPage({ params }: BusinessAdminPageProps) {
  const { citySlug, businessSlug } = await params;
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  const [business, pickupOrders] = await Promise.all([
    loadBusiness(citySlug, businessSlug, session.token),
    loadPickupOrders(citySlug, businessSlug, session.token),
  ]);

  if (!business) {
    notFound();
  }

  return (
    <AdminShell
      activeSection="local_admin"
      eyebrow="Area operatori"
      title={`${business.name} · area operatori`}
      description="Questa area è riservata agli operatori autorizzati del business: profilo, moduli attivi, contenuti pubblici e stato del tenant."
      routePath={`/${citySlug}/${businessSlug}/admin`}
      statusLabel={`Area operatori · ${session.auth.activeAccess.role.replaceAll("_", " ")}`}
      asideTitle="Scope attivo"
      asideText={`Utente: ${session.auth.user.email}. Scope: ${session.auth.activeAccess.scopeType}. Business: ${business.city.slug}/${business.slug}.`}
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
      </section>

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
        </article>
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
                  <form action={updatePickupOrderStatusAction} className="admin-order-status-form">
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
                    <button className="ghost-button" type="submit">
                      Aggiorna
                    </button>
                  </form>
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
