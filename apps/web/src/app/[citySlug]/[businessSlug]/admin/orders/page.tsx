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
import { updatePickupOrderStatusAction } from "../actions";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
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
  const settings = hasCatalog
    ? await loadBusinessAdminResponse<PlatformPickupOrderingResponse>(
        `${apiPath}/pickup-ordering`,
        session.token,
      )
    : null;
  const orders =
    settings?.data?.item?.enabled === true
      ? await loadBusinessAdminResponse<PlatformPickupOrdersResponse>(
          `${apiPath}/pickup-orders?${queryString({ page, limit: 20 })}`,
          session.token,
        )
      : null;
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");
  const returnTo = page > 1 ? `${path}?page=${page}` : path;

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
                        <span>{formatDate(order.pickupAt)}</span>
                      </div>
                      <AdminStatusBadge status={order.status} />
                    </div>
                    <p>
                      {order.customerName} · {order.customerEmail}
                    </p>
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
          <AdminEmptyState title="Nessun ordine di ritiro ricevuto." />
        )}
      </section>
    </>
  );
}
