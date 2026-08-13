import Link from "next/link";
import {
  AdminCollectionError,
  AdminEmptyState,
} from "../../../../../components/admin-collection-state";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../../lib/business-admin-server";
import type { PlatformBusinessServicesResponse } from "../../../../../lib/platform-api";
import { CreateMenuItemForm, UpdateMenuItemForm } from "../menu-forms";

export const metadata = { title: "Servizi attività" };

function formatPrice(cents: number | null, currency: string, label: string | null) {
  if (label) return label;
  return cents === null
    ? "—"
    : new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

export default async function BusinessServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ edit?: string; notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const query = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const path = businessAdminSectionPath(citySlug, businessSlug, "services");
  const services = await loadBusinessAdminResponse<PlatformBusinessServicesResponse>(
    `${businessAdminApiPath(citySlug, businessSlug)}/services`,
    session.token,
  );
  const canManage = session.auth.activeAccess.permissions.includes("catalog.manage");
  const selectedService = services.data?.items.find((service) => service.id === query.edit);
  const publishedCount =
    services.data?.items.filter((service) => service.status === "published").length ?? 0;
  const pickupCount =
    services.data?.items.filter(
      (service) =>
        service.status === "published" && service.pickupEnabled && service.priceCents !== null,
    ).length ?? 0;

  return (
    <>
      {query.notice ? (
        <p className="surface-success" role="status">
          {query.notice}
        </p>
      ) : null}
      {query.error ? (
        <p className="surface-error" role="alert">
          {query.error}
        </p>
      ) : null}
      {query.edit && services.data && !selectedService ? (
        <p className="surface-error" role="alert">
          Il servizio selezionato non è più disponibile.
        </p>
      ) : null}

      {canManage ? (
        <details className="admin-create-panel business-service-create">
          <summary>Nuovo servizio</summary>
          <CreateMenuItemForm
            businessSlug={businessSlug}
            citySlug={citySlug}
            currency={business.currency}
          />
        </details>
      ) : null}

      <section className="data-card" aria-labelledby="services-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Catalogo</p>
            <h2 id="services-title">Servizi configurati</h2>
          </div>
          {services.data ? (
            <span className="admin-result-count">
              {services.data.items.length} totali · {publishedCount} pubblicati
            </span>
          ) : null}
        </div>
        {services.data ? (
          <div className="admin-state-card admin-state-inline">
            <strong>Visibilità del catalogo</strong>
            <p>
              Solo i servizi pubblicati compaiono nella scheda. Per il ritiro servono anche un
              prezzo numerico e l’opzione dedicata: {pickupCount} servizi sono idonei al menu di
              ritiro.
            </p>
          </div>
        ) : null}
        {services.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare i servizi."
            retryHref={path}
          />
        ) : services.data.items.length ? (
          <div className="table-wrap" role="region" aria-label="Servizi configurati" tabIndex={0}>
            <table className="data-table admin-wide-table">
              <caption className="visually-hidden">Servizi configurati per {business.name}</caption>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Stato</th>
                  <th>Prezzo</th>
                  <th>Ritiro</th>
                  <th>Durata</th>
                  <th>Ordine</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {services.data.items.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <strong>{service.name}</strong>
                      <span>{service.slug}</span>
                    </td>
                    <td>
                      <AdminStatusBadge status={service.status} />
                    </td>
                    <td>
                      {formatPrice(service.priceCents, business.currency, service.priceLabel)}
                    </td>
                    <td>{service.pickupEnabled ? "Attivo" : "Non attivo"}</td>
                    <td>{service.durationMinutes ? `${service.durationMinutes} min` : "—"}</td>
                    <td>{service.sortOrder}</td>
                    <td>
                      {canManage ? (
                        <Link
                          className="table-link"
                          href={`${path}?edit=${encodeURIComponent(service.id)}#edit-service`}
                        >
                          Modifica
                        </Link>
                      ) : (
                        <span className="admin-muted-label">Sola lettura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="Nessun servizio configurato."
            text={canManage ? "Usa “Nuovo servizio” per creare la prima voce." : undefined}
          />
        )}
      </section>

      {selectedService && canManage ? (
        <section className="data-card" id="edit-service" aria-labelledby="edit-service-title">
          <div className="card-heading">
            <div>
              <p className="section-label">Modifica</p>
              <h2 id="edit-service-title">{selectedService.name}</h2>
            </div>
            <Link className="admin-button ghost-button" href={path}>
              Chiudi modifica
            </Link>
          </div>
          <UpdateMenuItemForm
            businessSlug={businessSlug}
            citySlug={citySlug}
            currency={business.currency}
            service={selectedService}
          />
        </section>
      ) : null}
    </>
  );
}
