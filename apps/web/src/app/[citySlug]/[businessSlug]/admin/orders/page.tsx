import Link from "next/link";
import {
  AdminCollectionError,
  AdminEmptyState,
} from "../../../../../components/admin-collection-state";
import { AdminPagination } from "../../../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { AdminSubmitButton } from "../../../../../components/admin-submit-button";
import {
  positivePage,
  queryString,
  searchParam,
  type AdminSearchParams,
} from "../../../../../lib/admin-query";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../../lib/business-admin-server";
import type {
  PlatformPickupOrderingResponse,
  PlatformPickupOrdersResponse,
} from "../../../../../lib/platform-api";
import { updatePickupOrderingAction, updatePickupOrderStatusAction } from "../actions";

export const metadata = { title: "Ordini ritiro attività" };

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

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export default async function BusinessOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { citySlug, businessSlug } = await params;
  const query = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const page = positivePage(searchParam(query, "page"));
  const notice = searchParam(query, "notice");
  const error = searchParam(query, "error");
  const path = businessAdminSectionPath(citySlug, businessSlug, "orders");
  const apiPath = businessAdminApiPath(citySlug, businessSlug);
  const hasCatalog = business.modules.some(
    (module) => module.moduleCode === "catalog" && module.active,
  );
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");
  const canManageSettings = session.auth.activeAccess.permissions.includes("settings.manage");
  const settings = hasCatalog
    ? await loadBusinessAdminResponse<PlatformPickupOrderingResponse>(
        `${apiPath}/pickup-ordering`,
        session.token,
      )
    : null;
  const orders =
    canManage && settings?.data?.item?.enabled === true
      ? await loadBusinessAdminResponse<PlatformPickupOrdersResponse>(
          `${apiPath}/pickup-orders?${queryString({ page, limit: 20 })}`,
          session.token,
        )
      : null;
  const returnTo = page > 1 ? `${path}?page=${page}` : path;
  const pickupSettings = settings?.data?.item ?? {
    enabled: false,
    pickupLeadMinutes: 30,
    slotMinutes: 15,
    slotCapacity: 4,
    minimumOrderCents: 0,
  };

  return (
    <>
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
      <section className="data-card" aria-labelledby="pickup-settings-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Configurazione opzionale</p>
            <h2 id="pickup-settings-title">Ritiro in sede</h2>
          </div>
          {settings?.data ? (
            <AdminStatusBadge status={pickupSettings.enabled ? "active" : "disabled"} />
          ) : null}
        </div>
        {!hasCatalog ? (
          <div className="admin-state-card admin-state-inline">
            <strong>Prima attiva il catalogo.</strong>
            <p>Il ritiro usa i servizi contrassegnati come disponibili per gli ordini.</p>
            <Link
              className="admin-button ghost-button"
              href={businessAdminSectionPath(citySlug, businessSlug, "modules")}
            >
              Vai ai moduli
            </Link>
          </div>
        ) : settings?.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le impostazioni di ritiro."
            retryHref={returnTo}
          />
        ) : settings?.data ? (
          <form action={updatePickupOrderingAction} className="business-management-form">
            <input name="citySlug" type="hidden" value={citySlug} />
            <input name="businessSlug" type="hidden" value={businessSlug} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <div className="admin-state-card admin-state-inline">
              <strong>Prima di accettare ordini</strong>
              <p>
                Pubblica almeno un servizio con prezzo e ritiro attivo, poi configura gli orari di
                apertura usati per generare le fasce.
              </p>
              <div className="business-publication-actions">
                <Link
                  className="admin-button ghost-button"
                  href={businessAdminSectionPath(citySlug, businessSlug, "services")}
                >
                  Controlla servizi
                </Link>
                <Link
                  className="admin-button ghost-button"
                  href={businessAdminSectionPath(citySlug, businessSlug, "hours")}
                >
                  Controlla orari
                </Link>
              </div>
            </div>
            <label className="admin-check-field">
              <input
                defaultChecked={pickupSettings.enabled}
                disabled={!canManageSettings}
                name="enabled"
                type="checkbox"
              />
              Accetta ordini di ritiro
            </label>
            <div className="business-menu-fields">
              <label className="field">
                <span>Preavviso minimo (minuti)</span>
                <input
                  defaultValue={pickupSettings.pickupLeadMinutes}
                  disabled={!canManageSettings}
                  max={720}
                  min={0}
                  name="pickupLeadMinutes"
                  required
                  type="number"
                />
              </label>
              <label className="field">
                <span>Durata fascia (minuti)</span>
                <input
                  defaultValue={pickupSettings.slotMinutes}
                  disabled={!canManageSettings}
                  max={120}
                  min={5}
                  name="slotMinutes"
                  required
                  type="number"
                />
              </label>
              <label className="field">
                <span>Ordini per fascia</span>
                <input
                  defaultValue={pickupSettings.slotCapacity}
                  disabled={!canManageSettings}
                  max={100}
                  min={1}
                  name="slotCapacity"
                  required
                  type="number"
                />
              </label>
              <label className="field">
                <span>Ordine minimo ({business.currency})</span>
                <input
                  defaultValue={(pickupSettings.minimumOrderCents / 100)
                    .toFixed(2)
                    .replace(".", ",")}
                  disabled={!canManageSettings}
                  inputMode="decimal"
                  name="minimumOrder"
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  required
                />
              </label>
            </div>
            <p className="admin-muted-label">
              Gli orari mostrati ai clienti seguono il fuso {business.timezone}.
            </p>
            {canManageSettings ? (
              <AdminSubmitButton pendingLabel="Salvataggio…">Salva impostazioni</AdminSubmitButton>
            ) : (
              <span className="admin-muted-label">Impostazioni in sola lettura</span>
            )}
          </form>
        ) : null}
      </section>
      <section className="data-card" aria-labelledby="orders-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Estensione opzionale</p>
            <h2 id="orders-title">Ordini di ritiro</h2>
          </div>
          {orders?.data ? (
            <span className="admin-result-count">{orders.data.total} ordini</span>
          ) : null}
        </div>
        {!hasCatalog || (settings?.data && !settings.data.item?.enabled) ? (
          <AdminEmptyState
            title="Il ritiro ordini non è attivo."
            text="Questa estensione è separata dal percorso core dell’attività."
          />
        ) : settings?.data?.item?.enabled && !canManage ? (
          <div className="admin-state-card admin-state-inline">
            <strong>Inbox ordini non disponibile per questo ruolo.</strong>
            <p>Serve un accesso con gestione dell’attività per consultare i dati dei clienti.</p>
          </div>
        ) : settings?.failed || orders?.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare gli ordini di ritiro."
            retryHref={returnTo}
          />
        ) : orders?.data.items.length ? (
          <>
            <div className="business-order-list">
              {orders.data.items.map((order) => {
                const availableStatuses = nextStatuses[order.status];
                return (
                  <article className="business-order-card" key={order.id}>
                    <div className="business-order-heading">
                      <div>
                        <strong>{order.reference}</strong>
                        <span>{formatDate(order.pickupAt, business.timezone)}</span>
                      </div>
                      <AdminStatusBadge status={order.status} />
                    </div>
                    <p>
                      {order.customerName} · {order.customerEmail}
                    </p>
                    {order.customerPhone ? (
                      <p>
                        Telefono: <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
                      </p>
                    ) : null}
                    {order.notes ? (
                      <div className="admin-state-card admin-state-inline">
                        <strong>Nota cliente</strong>
                        <p>{order.notes}</p>
                      </div>
                    ) : null}
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}× {item.nameSnapshot}
                        </li>
                      ))}
                    </ul>
                    <strong>
                      {new Intl.NumberFormat("it-IT", {
                        style: "currency",
                        currency: business.currency,
                      }).format(order.totalCents / 100)}
                    </strong>
                    {canManage && availableStatuses.length ? (
                      <form
                        action={updatePickupOrderStatusAction}
                        className="business-order-action"
                      >
                        <input name="citySlug" type="hidden" value={citySlug} />
                        <input name="businessSlug" type="hidden" value={businessSlug} />
                        <input name="orderId" type="hidden" value={order.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <label className="field">
                          <span>Nuovo stato</span>
                          <select defaultValue={availableStatuses[0]} name="status">
                            {availableStatuses.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <AdminSubmitButton className="ghost-button" pendingLabel="Aggiornamento…">
                          Aggiorna stato
                        </AdminSubmitButton>
                      </form>
                    ) : canManage ? (
                      <span className="admin-muted-label">
                        Flusso concluso: nessuna altra azione.
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <AdminPagination
              page={orders.data.page}
              pathname={path}
              query={{}}
              total={orders.data.total}
              totalPages={Math.ceil(orders.data.total / orders.data.limit)}
            />
          </>
        ) : (
          <div className="admin-state-card admin-state-inline">
            <strong>Nessun ordine di ritiro ricevuto.</strong>
            <p>
              Gli ordini compariranno qui. Se il ritiro è già attivo, verifica servizi pubblicati,
              prezzi e orari.
            </p>
            <Link
              className="admin-button ghost-button"
              href={businessAdminSectionPath(citySlug, businessSlug, "services")}
            >
              Controlla servizi
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
