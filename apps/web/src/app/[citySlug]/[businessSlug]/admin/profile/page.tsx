import Link from "next/link";
import { AdminStatusBadge } from "../../../../../components/admin-status-badge";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import { getBusinessAdminContext } from "../../../../../lib/business-admin-server";
import { BusinessProfileForm } from "../business-profile-form";

export const metadata = { title: "Profilo attività" };

export default async function BusinessProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const canManage = session.auth.activeAccess.permissions.includes("businesses.manage");
  const publicationPath = businessAdminSectionPath(citySlug, businessSlug, "publication");

  return (
    <>
      {feedback.notice ? (
        <p className="surface-success" role="status">
          {feedback.notice}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="surface-error" role="alert">
          {feedback.error}
        </p>
      ) : null}
      <div className="action-bar">
        <div>
          <strong>
            {canManage ? "Prima completa i dati essenziali" : "Profilo in sola lettura"}
          </strong>
          <p className="muted-copy">
            Nome, una presentazione e almeno un contatto pubblico servono per superare la readiness.
          </p>
        </div>
        <Link className="admin-button ghost-button" href={publicationPath}>
          Controlla pubblicazione
        </Link>
      </div>
      <section className="data-card" aria-labelledby="profile-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Dati attività</p>
            <h2 id="profile-title">Profilo pubblico e impostazioni</h2>
          </div>
          <AdminStatusBadge status={business.status} />
        </div>
        {canManage ? (
          <BusinessProfileForm business={business} />
        ) : (
          <div className="business-readonly-grid">
            <div>
              <span>Nome</span>
              <strong>{business.name}</strong>
            </div>
            <div>
              <span>Contatto</span>
              <strong>
                {business.publicEmail ??
                  business.publicPhone ??
                  business.website ??
                  "Non configurato"}
              </strong>
            </div>
            <div>
              <span>Località</span>
              <strong>{business.locality ?? business.city.name}</strong>
            </div>
            <p className="muted-copy">Il tuo ruolo può consultare il profilo ma non modificarlo.</p>
          </div>
        )}
      </section>
    </>
  );
}
