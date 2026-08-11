import { AdminCollectionError } from "../../../../../components/admin-collection-state";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import {
  businessAdminApiPath,
  getBusinessAdminContext,
  loadBusinessAdminResponse,
} from "../../../../../lib/business-admin-server";
import type { PlatformOpeningHoursResponse } from "../../../../../lib/platform-api";
import { OpeningHoursEditor } from "../opening-hours-editor";

export const metadata = { title: "Orari attività" };

const weekdayLabels = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];

export default async function BusinessHoursPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session } = await getBusinessAdminContext(citySlug, businessSlug);
  const path = businessAdminSectionPath(citySlug, businessSlug, "hours");
  const hours = await loadBusinessAdminResponse<PlatformOpeningHoursResponse>(
    `${businessAdminApiPath(citySlug, businessSlug)}/opening-hours`,
    session.token,
  );
  const canManage = session.auth.activeAccess.permissions.includes("settings.manage");

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
      <section className="data-card" aria-labelledby="hours-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Disponibilità</p>
            <h2 id="hours-title">Settimana di apertura</h2>
          </div>
        </div>
        {hours.failed ? (
          <AdminCollectionError
            message="Non è stato possibile caricare gli orari."
            retryHref={path}
          />
        ) : canManage ? (
          <OpeningHoursEditor
            businessSlug={businessSlug}
            citySlug={citySlug}
            items={hours.data.items}
          />
        ) : (
          <div className="business-hours-readonly">
            {Array.from({ length: 7 }, (_, weekday) => {
              const day = hours.data.items.find((item) => item.weekday === weekday);
              return (
                <div key={weekday}>
                  <strong>{weekdayLabels[weekday]}</strong>
                  <span>
                    {!day || day.isClosed
                      ? "Chiuso"
                      : day.intervals
                          .map((interval) => `${interval.opensAt}–${interval.closesAt}`)
                          .join(" · ")}
                  </span>
                </div>
              );
            })}
            <p className="muted-copy">Il tuo ruolo può consultare gli orari ma non modificarli.</p>
          </div>
        )}
      </section>
    </>
  );
}
