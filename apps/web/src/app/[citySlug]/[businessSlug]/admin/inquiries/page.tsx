import Link from "next/link";
import {
  AdminCollectionError,
  AdminEmptyState,
} from "../../../../../components/admin-collection-state";
import { AdminPagination } from "../../../../../components/admin-pagination";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { adminStatusLabel } from "../../../../../lib/admin-labels";
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
  PlatformBusinessInquiriesResponse,
  PlatformBusinessInquiry,
} from "../../../../../lib/platform-api";
import { BusinessInquiryActions } from "./inquiry-actions";

export const metadata = { title: "Richieste attività" };

type InquiryResponse = { status: "ok"; item: PlatformBusinessInquiry };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export default async function BusinessInquiriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const { citySlug, businessSlug } = await params;
  const query = await searchParams;
  const { session } = await getBusinessAdminContext(citySlug, businessSlug);
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");
  const path = businessAdminSectionPath(citySlug, businessSlug, "inquiries");
  if (!canManage) {
    return (
      <section className="data-card" aria-labelledby="inquiries-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Inbox owner</p>
            <h2 id="inquiries-title">Richieste non disponibili</h2>
          </div>
        </div>
        <div className="admin-state-card admin-state-inline">
          <strong>Questa area contiene dati di contatto dei clienti.</strong>
          <p>Serve un ruolo con gestione dell’attività per consultare e aggiornare le richieste.</p>
          <Link
            className="admin-button ghost-button"
            href={businessAdminSectionPath(citySlug, businessSlug, "")}
          >
            Torna alla panoramica
          </Link>
        </div>
      </section>
    );
  }
  const rawStatus = searchParam(query, "status");
  const status = ["new", "read", "closed"].includes(rawStatus) ? rawStatus : "";
  const page = positivePage(searchParam(query, "page"));
  const selectedId = searchParam(query, "inquiry");
  const notice = searchParam(query, "notice");
  const error = searchParam(query, "error");
  const apiPath = businessAdminApiPath(citySlug, businessSlug);
  const list = await loadBusinessAdminResponse<PlatformBusinessInquiriesResponse>(
    `${apiPath}/inquiries?${queryString({ status, page, limit: 20 })}`,
    session.token,
  );
  const detail = selectedId
    ? await loadBusinessAdminResponse<InquiryResponse>(
        `${apiPath}/inquiries/${encodeURIComponent(selectedId)}`,
        session.token,
      )
    : null;
  const returnQuery = queryString({
    status,
    page: page > 1 ? page : undefined,
    inquiry: selectedId,
  });
  const returnTo = returnQuery ? `${path}?${returnQuery}` : path;
  const listQuery = queryString({ status, page: page > 1 ? page : undefined });
  const listHref = listQuery ? `${path}?${listQuery}` : path;

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
      <nav className="business-filter-tabs" aria-label="Filtra richieste per stato">
        {[
          ["", "Tutte"],
          ["new", "Nuove"],
          ["read", "Lette"],
          ["closed", "Chiuse"],
        ].map(([value, label]) => (
          <Link
            aria-current={status === value ? "page" : undefined}
            className={status === value ? "active" : undefined}
            href={value ? `${path}?status=${value}` : path}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="data-card" aria-labelledby="inquiries-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Inbox owner</p>
            <h2 id="inquiries-title">Richieste ricevute</h2>
          </div>
          {list.data ? (
            <span className="admin-result-count">{list.data.total} richieste</span>
          ) : null}
        </div>
        {list.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare le richieste."
            retryHref={returnTo}
          />
        ) : list.data.items.length ? (
          <>
            <div className="table-wrap" role="region" aria-label="Richieste ricevute" tabIndex={0}>
              <table className="data-table admin-wide-table">
                <caption className="visually-hidden">Richieste ricevute dall’attività</caption>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contatto</th>
                    <th>Data</th>
                    <th>Stato</th>
                    <th>Anteprima messaggio</th>
                    <th>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <strong>{inquiry.name}</strong>
                      </td>
                      <td>
                        {inquiry.email}
                        {inquiry.phone ? <span>{inquiry.phone}</span> : null}
                      </td>
                      <td>{formatDate(inquiry.createdAt)}</td>
                      <td>
                        <AdminStatusBadge status={inquiry.status} />
                      </td>
                      <td className="business-message-preview">{inquiry.message}</td>
                      <td>
                        <Link
                          className="table-link"
                          href={`${path}?${queryString({ status, page: page > 1 ? page : undefined, inquiry: inquiry.id })}#inquiry-detail`}
                        >
                          Apri
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={list.data.page}
              pathname={path}
              query={{ status }}
              total={list.data.total}
              totalPages={Math.ceil(list.data.total / list.data.limit)}
            />
          </>
        ) : (
          <AdminEmptyState
            title={status ? "Nessuna richiesta con questo stato." : "Nessuna richiesta ricevuta."}
            text={
              status
                ? "Cambia filtro per consultare gli altri stati."
                : "Le richieste inviate dalla scheda pubblica compariranno qui."
            }
          />
        )}
      </section>

      {selectedId ? (
        <section className="data-card" id="inquiry-detail" aria-labelledby="inquiry-detail-title">
          {detail?.failed ? (
            <>
              <AdminCollectionError
                message="Non è stato possibile aprire la richiesta selezionata."
                retryHref={returnTo}
              />
              <Link className="admin-button ghost-button" href={listHref}>
                Torna all’elenco
              </Link>
            </>
          ) : detail?.data ? (
            <>
              <div className="card-heading">
                <div>
                  <p className="section-label">Dettaglio richiesta</p>
                  <h2 id="inquiry-detail-title">{detail.data.item.name}</h2>
                </div>
                <div className="business-publication-actions">
                  <AdminStatusBadge status={detail.data.item.status} />
                  <Link className="admin-button ghost-button" href={listHref}>
                    Torna all’elenco
                  </Link>
                </div>
              </div>
              <dl className="business-inquiry-details">
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${detail.data.item.email}`}>{detail.data.item.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Telefono</dt>
                  <dd>
                    {detail.data.item.phone ? (
                      <a href={`tel:${detail.data.item.phone}`}>{detail.data.item.phone}</a>
                    ) : (
                      "Non indicato"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{formatDate(detail.data.item.createdAt)}</dd>
                </div>
                <div>
                  <dt>Stato</dt>
                  <dd>{adminStatusLabel(detail.data.item.status)}</dd>
                </div>
                <div className="is-message">
                  <dt>Messaggio</dt>
                  <dd>{detail.data.item.message}</dd>
                </div>
              </dl>
              {canManage ? (
                <BusinessInquiryActions
                  businessSlug={businessSlug}
                  citySlug={citySlug}
                  inquiry={detail.data.item}
                  returnTo={returnTo}
                />
              ) : (
                <div className="admin-state-card admin-state-inline">
                  <strong>Nota interna</strong>
                  <p>{detail.data.item.internalNote ?? "Nessuna nota salvata."}</p>
                  <p>Il tuo ruolo può consultare la richiesta ma non modificarla.</p>
                </div>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
