import { redirect } from "next/navigation";
import { AdminShell } from "../../../../components/admin-shell";
import {
  type AdminOrderingMenuResponse,
  fetchV2Api,
  type AdminOrderingCouponsResponse,
  type AdminOrderingCustomersResponse,
  type AdminOrderingOrdersResponse,
  type AdminOrderingSettingsResponse,
  type AdminOrderingStatsResponse,
  type PlatformBusiness,
} from "../../../../lib/v2-api";
import { getWebSession } from "../../../../lib/v2-session";
import {
  createOrderingMenuCategoryAction,
  deleteOrderingMenuItemAction,
  createOrderingCouponAction,
  deleteOrderingCouponAction,
  saveOrderingSettingsAction,
  saveOrderingMenuItemAction,
  toggleOrderingMenuItemAvailabilityAction,
  toggleOrderingCouponAction,
  updateOrderingStatusAction,
} from "./actions";

type BusinessAdminPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams?: Promise<{
    orderingError?: string;
    orderingSuccess?: string;
    settingsError?: string;
    settingsSuccess?: string;
    couponError?: string;
    couponSuccess?: string;
    customerQuery?: string;
    menuError?: string;
    menuSuccess?: string;
    editItemId?: string;
  }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const orderStatusLabels: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermato",
  preparing: "In preparazione",
  ready: "Pronto",
  completed: "Completato",
  cancelled: "Annullato",
};

export default async function BusinessAdminPage({ params, searchParams }: BusinessAdminPageProps) {
  const [{ citySlug, businessSlug }, session, resolvedSearchParams] = await Promise.all([
    params,
    getWebSession(),
    searchParams ??
      Promise.resolve({
        orderingError: undefined,
        orderingSuccess: undefined,
        settingsError: undefined,
        settingsSuccess: undefined,
        couponError: undefined,
        couponSuccess: undefined,
        customerQuery: undefined,
        menuError: undefined,
        menuSuccess: undefined,
        editItemId: undefined,
      }),
  ]);

  if (!session) {
    redirect("/admin/login");
  }

  if (session.auth.activeAccess.scopeType !== "business") {
    redirect("/admin");
  }

  if (
    session.auth.activeAccess.city?.slug !== citySlug ||
    session.auth.activeAccess.business?.slug !== businessSlug
  ) {
    redirect(session.auth.redirectTo || "/admin");
  }

  const response = await fetchV2Api<{ status: string; items: PlatformBusiness[] }>(
    "/api/v2/platform-core/businesses?limit=8",
    {
      token: session.token,
      cache: "no-store",
    },
  );
  const business =
    response.items.find((item) => item.slug === businessSlug && item.city.slug === citySlug) ??
    response.items[0];

  if (!business) {
    redirect("/admin");
  }

  const usesOrdering =
    business.template.primaryModule === "ordering" ||
    business.modules.some((entry) => entry.moduleCode === "ordering" && entry.active);

  const orderingData = usesOrdering
    ? await Promise.all([
        fetchV2Api<AdminOrderingStatsResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/orders/stats`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
        fetchV2Api<AdminOrderingOrdersResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/orders?limit=6`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
        fetchV2Api<AdminOrderingCustomersResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/customers?limit=8${resolvedSearchParams.customerQuery ? `&q=${encodeURIComponent(resolvedSearchParams.customerQuery)}` : ""}`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
        fetchV2Api<AdminOrderingCouponsResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/coupons?limit=12`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
        fetchV2Api<AdminOrderingSettingsResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/settings`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
        fetchV2Api<AdminOrderingMenuResponse>(
          `/api/v2/ordering/businesses/${citySlug}/${businessSlug}/menu`,
          {
            token: session.token,
            cache: "no-store",
          },
        ),
      ])
    : null;

  const orderingStats = orderingData?.[0].summary ?? null;
  const recentOrders = orderingData?.[1].items ?? [];
  const customers = orderingData?.[2].items ?? [];
  const coupons = orderingData?.[3].items ?? [];
  const settings = orderingData?.[4].settings ?? null;
  const menu = orderingData?.[5].categories ?? [];
  const routePath = `/${citySlug}/${businessSlug}/admin`;
  const orderingError = resolvedSearchParams.orderingError ?? null;
  const orderingSuccess = resolvedSearchParams.orderingSuccess === "1";
  const settingsError = resolvedSearchParams.settingsError ?? null;
  const settingsSuccess = resolvedSearchParams.settingsSuccess === "1";
  const couponError = resolvedSearchParams.couponError ?? null;
  const couponSuccess = resolvedSearchParams.couponSuccess === "1";
  const menuError = resolvedSearchParams.menuError ?? null;
  const menuSuccess = resolvedSearchParams.menuSuccess ?? null;
  const closedDatesValue = settings?.closedDates.join(", ") ?? "";
  const specialDatesValue =
    settings?.specialDates
      .map((entry) =>
        entry.closed
          ? `${entry.date}|closed`
          : [
              entry.date,
              entry.openingTimeStart ?? "",
              entry.openingTimeEnd ?? "",
              entry.slotMinutes != null ? String(entry.slotMinutes) : "",
              entry.maxOrdersPerSlot != null ? String(entry.maxOrdersPerSlot) : "",
              entry.minPreparationMinutes != null ? String(entry.minPreparationMinutes) : "",
            ].join("|"),
      )
      .join("\n") ?? "";
  const flatMenuItems = menu.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      categorySlug: category.slug,
      categoryName: category.name,
    })),
  );
  const editingItem =
    flatMenuItems.find((item) => item.id === resolvedSearchParams.editItemId) ?? null;
  const visibleMenuItems = flatMenuItems.filter((item) => item.available);
  const hiddenMenuItems = flatMenuItems.filter((item) => !item.available);

  return (
    <AdminShell
      activeSection="local_admin"
      eyebrow="Local admin surface"
      title={`${business.name}: priorita operative chiare fin dal primo viewport`}
      description="Il banco locale non deve sembrare una dashboard desktop compressa: ordina subito le azioni che servono davvero a chi lavora nel business."
      routePath={routePath}
      statusLabel={session.auth.activeAccess.role.replaceAll("_", " ")}
      asideTitle="Business scope"
      asideText={`Scope attivo su ${business.city.slug}/${business.slug}. Template ${business.template.code}. Stato ${business.status}.`}
    >
      {orderingError ? <p className="form-error">{orderingError}</p> : null}
      {orderingSuccess ? (
        <p className="surface-success">Stato ordine aggiornato correttamente nella V2.</p>
      ) : null}
      {settingsError ? <p className="form-error">{settingsError}</p> : null}
      {settingsSuccess ? (
        <p className="surface-success">Impostazioni operative salvate nella V2.</p>
      ) : null}
      {couponError ? <p className="form-error">{couponError}</p> : null}
      {couponSuccess ? (
        <p className="surface-success">Operazione coupon completata nella V2.</p>
      ) : null}
      {menuError ? <p className="form-error">{menuError}</p> : null}
      {menuSuccess ? <p className="surface-success">Menu V2 aggiornato correttamente.</p> : null}

      <section className="stats-grid">
        <article className="metric-card">
          <span>Stato locale</span>
          <strong>{business.status}</strong>
          <p>Disponibilita e stato operativo devono essere visibili subito nel modulo attivo.</p>
        </article>

        <article className="metric-card">
          <span>Modulo attivo</span>
          <strong>{business.template.primaryModule}</strong>
          <p>
            {business.modules.length} moduli registrati, ma uno solo deve guidare la vista mobile.
          </p>
        </article>

        <article className="metric-card">
          <span>Owner</span>
          <strong>{business.owner?.name ?? business.owner?.email ?? "Da assegnare"}</strong>
          <p>{business.owner?.status ?? "nessun owner attivo"}</p>
        </article>

        {orderingStats ? (
          <>
            <article className="metric-card">
              <span>Ordini aperti</span>
              <strong>{orderingStats.open}</strong>
              <p>La coda operativa e gia visibile in modo diretto nel banco locale.</p>
            </article>

            <article className="metric-card">
              <span>Ordini totali</span>
              <strong>{orderingStats.total}</strong>
              <p>
                Somma di pending, preparazione, completati e cancellati nel business scope attivo.
              </p>
            </article>

            <article className="metric-card">
              <span>Incasso lordo</span>
              <strong>{formatMoney(orderingStats.revenue)}</strong>
              <p>Primo indicatore economico letto direttamente dalla nuova API ordering.</p>
            </article>
          </>
        ) : null}
      </section>

      {orderingStats ? (
        <section className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Ordering V2</p>
              <h2>Ordini recenti visibili nel local admin</h2>
            </div>
            <span className="meta-chip">{recentOrders.length} ordini caricati</span>
          </div>

          {recentOrders.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ordine</th>
                    <th>Cliente</th>
                    <th>Stato</th>
                    <th>Ritiro</th>
                    <th>Totale</th>
                    <th>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.id.slice(-6).toUpperCase()}</strong>
                        <span>{order.items.length} righe</span>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        <span>{order.customerPhone ?? "telefono non indicato"}</span>
                      </td>
                      <td>
                        <strong>{orderStatusLabels[order.status] ?? order.status}</strong>
                        <span>{order.source}</span>
                      </td>
                      <td>
                        <strong>
                          {order.pickupAt
                            ? new Intl.DateTimeFormat("it-IT", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(order.pickupAt))
                            : "da confermare"}
                        </strong>
                        <span>{new Date(order.createdAt).toLocaleString("it-IT")}</span>
                      </td>
                      <td>
                        <strong>{formatMoney(order.grandTotal)}</strong>
                        <span>{order.paymentStatus}</span>
                      </td>
                      <td>
                        <form action={updateOrderingStatusAction} className="inline-form">
                          <input name="citySlug" type="hidden" value={citySlug} />
                          <input name="businessSlug" type="hidden" value={businessSlug} />
                          <input name="orderId" type="hidden" value={order.id} />
                          <input name="routePath" type="hidden" value={routePath} />
                          <label className="field compact-field">
                            <span>Stato</span>
                            <select defaultValue={order.status} name="status">
                              <option value="pending">In attesa</option>
                              <option value="confirmed">Confermato</option>
                              <option value="preparing">In preparazione</option>
                              <option value="ready">Pronto</option>
                              <option value="completed">Completato</option>
                              <option value="cancelled">Annullato</option>
                            </select>
                          </label>
                          <button className="ghost-button" type="submit">
                            Aggiorna
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-copy">
              Nessun ordine ancora creato in V2 per questo business. Il flusso e pronto ma non ha
              ancora dati storici migrati.
            </p>
          )}
        </section>
      ) : null}

      {settings ? (
        <section className="data-grid">
          <section className="data-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Clienti</p>
                <h2>Lookup e storico base gia disponibili nel banco locale</h2>
              </div>
              <span className="meta-chip">{customers.length} profili</span>
            </div>

            <form action={routePath} className="inline-form" method="get">
              <label className="field">
                <span>Cerca cliente</span>
                <input
                  defaultValue={resolvedSearchParams.customerQuery ?? ""}
                  name="customerQuery"
                  placeholder="Nome o telefono"
                />
              </label>
              <button className="ghost-button" type="submit">
                Filtra
              </button>
            </form>

            {customers.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Ordini</th>
                      <th>Punti</th>
                      <th>Spesa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.name ?? "Cliente senza nome"}</strong>
                          <span>
                            {customer.phone ?? customer.email ?? "recapito non disponibile"}
                          </span>
                        </td>
                        <td>
                          <strong>{customer.totalOrders}</strong>
                          <span>{customer.completedOrders} completati</span>
                        </td>
                        <td>
                          <strong>{customer.points}</strong>
                          <span>
                            {customer.lastOrderAt
                              ? new Date(customer.lastOrderAt).toLocaleString("it-IT")
                              : "nessun ordine recente"}
                          </span>
                        </td>
                        <td>
                          <strong>{formatMoney(customer.totalSpent)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-copy">Nessun profilo cliente trovato per i filtri correnti.</p>
            )}
          </section>

          <section className="data-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Coupon</p>
                <h2>Promozioni gestite dalla nuova API</h2>
              </div>
              <span className="meta-chip">{coupons.length} coupon</span>
            </div>

            <form action={createOrderingCouponAction} className="auth-form">
              <input name="citySlug" type="hidden" value={citySlug} />
              <input name="businessSlug" type="hidden" value={businessSlug} />
              <input name="routePath" type="hidden" value={routePath} />
              <div className="data-grid compact-grid">
                <label className="field">
                  <span>Codice</span>
                  <input name="code" placeholder="BENVENUTO10" />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <select defaultValue="percent" name="type">
                    <option value="percent">Percentuale</option>
                    <option value="fixed">Importo fisso</option>
                  </select>
                </label>
                <label className="field">
                  <span>Valore</span>
                  <input min="0" name="value" step="0.01" type="number" />
                </label>
                <label className="field">
                  <span>Scadenza</span>
                  <input name="expiresAt" type="datetime-local" />
                </label>
                <label className="field">
                  <span>Limite utilizzi</span>
                  <input defaultValue="0" min="0" name="usageLimit" step="1" type="number" />
                </label>
                <label className="field checkbox-field">
                  <span>Attivo</span>
                  <input defaultChecked name="active" type="checkbox" />
                </label>
              </div>
              <button className="form-button" type="submit">
                Crea coupon
              </button>
            </form>

            {coupons.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Codice</th>
                      <th>Valore</th>
                      <th>Utilizzi</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td>
                          <strong>{coupon.code}</strong>
                          <span>
                            {coupon.expiresAt
                              ? new Date(coupon.expiresAt).toLocaleString("it-IT")
                              : "senza scadenza"}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {coupon.type === "percent"
                              ? `${coupon.value ?? 0}%`
                              : formatMoney(coupon.value ?? 0)}
                          </strong>
                          <span>{coupon.active ? "attivo" : "disattivo"}</span>
                        </td>
                        <td>
                          <strong>{coupon.usedCount}</strong>
                          <span>
                            {coupon.usageLimit > 0 ? `limite ${coupon.usageLimit}` : "illimitato"}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <form action={toggleOrderingCouponAction}>
                              <input name="citySlug" type="hidden" value={citySlug} />
                              <input name="businessSlug" type="hidden" value={businessSlug} />
                              <input name="routePath" type="hidden" value={routePath} />
                              <input name="couponId" type="hidden" value={coupon.id} />
                              <input name="active" type="hidden" value={String(coupon.active)} />
                              <button className="ghost-button" type="submit">
                                {coupon.active ? "Disattiva" : "Attiva"}
                              </button>
                            </form>
                            <form action={deleteOrderingCouponAction}>
                              <input name="citySlug" type="hidden" value={citySlug} />
                              <input name="businessSlug" type="hidden" value={businessSlug} />
                              <input name="routePath" type="hidden" value={routePath} />
                              <input name="couponId" type="hidden" value={coupon.id} />
                              <button className="ghost-button danger-button" type="submit">
                                Elimina
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-copy">Nessun coupon creato in V2 per questo business.</p>
            )}
          </section>
        </section>
      ) : null}

      {settings ? (
        <section className="data-card">
          <div className="card-heading">
            <div>
              <p className="section-label">Impostazioni operative</p>
              <h2>Messaggi, minimi e zone servite</h2>
            </div>
            <span className="meta-chip">settings.manage</span>
          </div>

          <form action={saveOrderingSettingsAction} className="auth-form">
            <input name="citySlug" type="hidden" value={citySlug} />
            <input name="businessSlug" type="hidden" value={businessSlug} />
            <input name="routePath" type="hidden" value={routePath} />

            <div className="data-grid compact-grid">
              <label className="field">
                <span>Orari visibili</span>
                <input defaultValue={settings.openingHours ?? ""} name="openingHours" />
              </label>
              <label className="field">
                <span>Apertura</span>
                <input
                  defaultValue={settings.openingTimeStart ?? ""}
                  name="openingTimeStart"
                  type="time"
                />
              </label>
              <label className="field">
                <span>Chiusura</span>
                <input
                  defaultValue={settings.openingTimeEnd ?? ""}
                  name="openingTimeEnd"
                  type="time"
                />
              </label>
              <label className="field">
                <span>Consegna</span>
                <input
                  defaultValue={String(settings.deliveryCost)}
                  min="0"
                  name="deliveryCost"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Ordine minimo</span>
                <input
                  defaultValue={String(settings.minimumOrder)}
                  min="0"
                  name="minimumOrder"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Durata slot</span>
                <input
                  defaultValue={String(settings.slotMinutes)}
                  min="5"
                  name="slotMinutes"
                  step="5"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Capienza slot</span>
                <input
                  defaultValue={String(settings.maxOrdersPerSlot)}
                  min="1"
                  name="maxOrdersPerSlot"
                  step="1"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Lead time</span>
                <input
                  defaultValue={String(settings.minPreparationMinutes)}
                  min="0"
                  name="minPreparationMinutes"
                  step="5"
                  type="number"
                />
              </label>
              <label className="field">
                <span>Zone servite</span>
                <input
                  defaultValue={settings.serviceZones.join(", ")}
                  name="serviceZones"
                  placeholder="Centro, Stazione, Porto"
                />
              </label>
            </div>

            <div className="checkbox-row">
              {[
                ["lun", "Lun"],
                ["mar", "Mar"],
                ["mer", "Mer"],
                ["gio", "Gio"],
                ["ven", "Ven"],
                ["sab", "Sab"],
                ["dom", "Dom"],
              ].map(([code, label]) => (
                <label className="checkbox-chip" key={code}>
                  <input
                    defaultChecked={settings.openingDays.includes(code)}
                    name="openingDays"
                    type="checkbox"
                    value={code}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <label className="field">
              <span>Messaggio cliente</span>
              <input
                defaultValue={settings.customerMessage ?? ""}
                name="customerMessage"
                placeholder="Es. ritiro piu veloce dalle 19:30"
              />
            </label>

            <label className="field">
              <span>Chiusure straordinarie</span>
              <textarea
                defaultValue={closedDatesValue}
                name="closedDates"
                placeholder="2026-08-15, 2026-12-25"
                rows={3}
              />
            </label>
            <p className="muted-copy">
              Date singole chiuse, separate da virgola o a capo. Esempio: `2026-08-15`.
            </p>

            <label className="field">
              <span>Override calendario</span>
              <textarea
                defaultValue={specialDatesValue}
                name="specialDates"
                placeholder={"2026-08-14|17:30|23:30|10|6|20\n2026-08-16|closed"}
                rows={5}
              />
            </label>
            <p className="muted-copy">
              Un override per riga: `data|apertura|chiusura|slot|min capienza|lead time` oppure
              `data|closed`.
            </p>

            <button className="form-button" type="submit">
              Salva impostazioni
            </button>
          </form>
        </section>
      ) : null}

      {usesOrdering ? (
        <section className="data-grid" id="menu-manager">
          <section className="data-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Menu manager</p>
                <h2>Categorie e voci gestite nello stesso spazio operativo</h2>
              </div>
              <span className="meta-chip">{flatMenuItems.length} voci</span>
            </div>

            <section className="stats-grid">
              <article className="metric-card">
                <span>Totale voci</span>
                <strong>{flatMenuItems.length}</strong>
                <p>Conteggio complessivo nel catalogo V2 del business attivo.</p>
              </article>
              <article className="metric-card">
                <span>Visibili</span>
                <strong>{visibleMenuItems.length}</strong>
                <p>Prodotti attualmente esposti nel menu pubblico ordering.</p>
              </article>
              <article className="metric-card">
                <span>Nascoste</span>
                <strong>{hiddenMenuItems.length}</strong>
                <p>Prodotti fuori catalogo o temporaneamente esauriti.</p>
              </article>
              <article className="metric-card">
                <span>Categorie</span>
                <strong>{menu.length}</strong>
                <p>Raggruppamenti usati dal pubblico e dal banco locale.</p>
              </article>
            </section>

            <form action={createOrderingMenuCategoryAction} className="auth-form">
              <input name="citySlug" type="hidden" value={citySlug} />
              <input name="businessSlug" type="hidden" value={businessSlug} />
              <input name="routePath" type="hidden" value={routePath} />

              <div className="card-heading">
                <div>
                  <p className="section-label">Categorie</p>
                  <h2>Crea una nuova categoria menu</h2>
                </div>
              </div>

              <div className="data-grid compact-grid">
                <label className="field">
                  <span>Nome categoria</span>
                  <input name="name" placeholder="Es. Pizze classiche" />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input name="slug" placeholder="pizze-classiche" />
                </label>
                <label className="field">
                  <span>Ordine</span>
                  <input defaultValue="0" min="0" name="sortOrder" step="1" type="number" />
                </label>
                <label className="field checkbox-field">
                  <span>Attiva</span>
                  <input defaultChecked name="active" type="checkbox" />
                </label>
              </div>

              <button className="form-button" type="submit">
                Aggiungi categoria
              </button>
            </form>
          </section>

          <section className="data-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Voci menu</p>
                <h2>{editingItem ? "Modifica voce esistente" : "Aggiungi una nuova voce"}</h2>
              </div>
            </div>

            <form action={saveOrderingMenuItemAction} className="auth-form">
              <input name="citySlug" type="hidden" value={citySlug} />
              <input name="businessSlug" type="hidden" value={businessSlug} />
              <input name="routePath" type="hidden" value={routePath} />
              <input name="itemId" type="hidden" value={editingItem?.id ?? ""} />

              <div className="data-grid compact-grid">
                <label className="field">
                  <span>Nome</span>
                  <input
                    defaultValue={editingItem?.name ?? ""}
                    name="name"
                    placeholder="Es. Margherita"
                  />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input
                    defaultValue={editingItem?.slug ?? ""}
                    name="slug"
                    placeholder="margherita"
                  />
                </label>
                <label className="field">
                  <span>Categoria</span>
                  <select defaultValue={editingItem?.categorySlug ?? ""} name="categorySlug">
                    <option value="">Senza categoria</option>
                    {menu.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Prezzo</span>
                  <input
                    defaultValue={editingItem?.price != null ? String(editingItem.price) : ""}
                    min="0"
                    name="price"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="field">
                  <span>Prezzo barrato</span>
                  <input
                    defaultValue={
                      editingItem?.compareAtPrice != null ? String(editingItem.compareAtPrice) : ""
                    }
                    min="0"
                    name="compareAtPrice"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="field">
                  <span>Emoji</span>
                  <input defaultValue={editingItem?.emoji ?? ""} name="emoji" placeholder="🍕" />
                </label>
                <label className="field">
                  <span>Unita</span>
                  <input defaultValue={editingItem?.unit ?? ""} name="unit" placeholder="pezzo" />
                </label>
                <label className="field">
                  <span>Ordine</span>
                  <input
                    defaultValue={String(editingItem?.sortOrder ?? 0)}
                    min="0"
                    name="sortOrder"
                    step="1"
                    type="number"
                  />
                </label>
                <label className="field">
                  <span>Immagine</span>
                  <input
                    defaultValue={editingItem?.imageUrl ?? ""}
                    name="imageUrl"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="field">
                <span>Descrizione</span>
                <textarea
                  defaultValue={editingItem?.description ?? ""}
                  name="description"
                  placeholder="Descrizione breve visibile nel menu pubblico"
                  rows={3}
                />
              </label>

              <div className="data-grid compact-grid">
                <label className="field">
                  <span>Tag</span>
                  <input
                    defaultValue={editingItem?.tags.join(", ") ?? ""}
                    name="tags"
                    placeholder="classica, vegetariana"
                  />
                </label>
                <label className="field">
                  <span>Allergeni</span>
                  <input
                    defaultValue={editingItem?.allergens.join(", ") ?? ""}
                    name="allergens"
                    placeholder="glutine, latte"
                  />
                </label>
                <label className="field checkbox-field">
                  <span>Visibile</span>
                  <input
                    defaultChecked={editingItem?.available ?? true}
                    name="available"
                    type="checkbox"
                  />
                </label>
                <label className="field checkbox-field">
                  <span>In evidenza</span>
                  <input
                    defaultChecked={editingItem?.featured ?? false}
                    name="featured"
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="row-actions">
                <button className="form-button" type="submit">
                  {editingItem ? "Salva voce" : "Aggiungi voce"}
                </button>
                {editingItem ? (
                  <a className="ghost-button" href={`${routePath}#menu-manager`}>
                    Annulla modifica
                  </a>
                ) : null}
              </div>
            </form>
          </section>
        </section>
      ) : null}

      {usesOrdering ? (
        <section className="data-card">
          <div className="card-heading">
              <div>
                <p className="section-label">Catalogo operativo</p>
                <h2>Voci menu gestibili senza uscire dal flusso operativo</h2>
            </div>
            <span className="meta-chip">{menu.length} categorie</span>
          </div>

          {menu.length > 0 ? (
            <div className="public-list-grid">
              {menu.map((category) => (
                <article className="public-card" key={category.id}>
                  <div className="card-copy">
                    <h3>{category.name}</h3>
                    <p>
                      {category.items.length} voci, ordine {category.sortOrder}, stato{" "}
                      {category.active ? "attiva" : "nascosta"}.
                    </p>
                  </div>

                  <div className="order-cart-list">
                    {category.items.map((item) => (
                      <div className="order-cart-row" key={item.id}>
                        <div>
                          <strong>{item.emoji ? `${item.emoji} ${item.name}` : item.name}</strong>
                          <span>
                            {item.description ?? "Nessuna descrizione"} ·{" "}
                            {item.price != null ? formatMoney(item.price) : "Prezzo assente"}
                          </span>
                        </div>
                        <div className="row-actions">
                          <a
                            className="ghost-button"
                            href={`${routePath}?editItemId=${item.id}#menu-manager`}
                          >
                            Modifica
                          </a>
                          <form action={toggleOrderingMenuItemAvailabilityAction}>
                            <input name="citySlug" type="hidden" value={citySlug} />
                            <input name="businessSlug" type="hidden" value={businessSlug} />
                            <input name="routePath" type="hidden" value={routePath} />
                            <input name="itemId" type="hidden" value={item.id} />
                            <button className="ghost-button" type="submit">
                              {item.available ? "Nascondi" : "Mostra"}
                            </button>
                          </form>
                          <form action={deleteOrderingMenuItemAction}>
                            <input name="citySlug" type="hidden" value={citySlug} />
                            <input name="businessSlug" type="hidden" value={businessSlug} />
                            <input name="routePath" type="hidden" value={routePath} />
                            <input name="itemId" type="hidden" value={item.id} />
                            <button className="ghost-button danger-button" type="submit">
                              Elimina
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">
              Nessuna categoria o voce ancora creata. La surface admin e pronta ad accogliere il
              catalogo appena viene popolato.
            </p>
          )}
        </section>
      ) : null}

      <section className="route-grid">
        <article className="route-card">
          <strong>Azioni rapide</strong>
          <p>
            Apri ordini correnti, disponibilita e contatti operativi senza passare da menu profondi.
          </p>
          <div className="pill-row">
            <span className="pill">Ordini aperti</span>
            <span className="pill">Disponibilita</span>
            <span className="pill">Contatti</span>
          </div>
        </article>

        <article className="route-card">
          <strong>Business identity</strong>
          <p>
            {business.city.name} / {business.name}
          </p>
          <code>
            {business.city.slug}/{business.slug}
          </code>
        </article>

        <article className="route-card">
          <strong>Contatti pubblici</strong>
          <p>{business.publicEmail ?? "email non impostata"}</p>
          <p>{business.publicPhone ?? "telefono non impostato"}</p>
        </article>

        <article className="route-card">
          <strong>Stato tenant</strong>
          <p>
            Piano {business.plan}, subscription {business.subscriptionStatus}, locale{" "}
            {business.locale}.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}
