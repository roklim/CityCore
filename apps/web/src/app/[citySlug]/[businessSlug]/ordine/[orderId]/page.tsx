import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "../../../../../components/public-shell";
import { buildTrackingPageContent } from "../../../../../lib/public-content";
import {
  fetchV2Api,
  type PublicOrderingOrderResponse,
  V2ApiError,
} from "../../../../../lib/v2-api";
import { getPublicBusinessSurfaceData } from "../../../../../lib/public-runtime";

type TrackingPageProps = {
  params: Promise<{ citySlug: string; businessSlug: string; orderId: string }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatPickup(value: string | null, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { citySlug, businessSlug, orderId } = await params;
  const businessSurface = await getPublicBusinessSurfaceData(citySlug, businessSlug);

  if (!businessSurface) {
    notFound();
  }

  let response: PublicOrderingOrderResponse;

  try {
    response = await fetchV2Api<PublicOrderingOrderResponse>(
      `/api/v2/ordering/public/${citySlug}/${businessSlug}/orders/${orderId}`,
    );
  } catch (error) {
    if (error instanceof V2ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const { business, city } = businessSurface;
  const { order } = response;
  const copy = buildTrackingPageContent(business.name);
  const statusLabels: Record<string, string> = {
    pending: copy.pending,
    confirmed: copy.confirmed,
    preparing: copy.preparing,
    ready: copy.ready,
    completed: copy.completed,
    cancelled: copy.cancelled,
  };

  return (
    <PublicShell
      toneLabel={copy.toneLabel}
      title={copy.title}
      description={copy.description}
      citySlug={city.slug}
      businessName={business.name}
      accentNote={`Ordine ${order.id.slice(-6).toUpperCase()}. Stato ${statusLabels[order.status] ?? order.status}.`}
    >
      <section className="public-stack">
        <section className="spotlight-card spotlight-primary">
          <p className="section-label">{copy.statusNow}</p>
          <h2>{statusLabels[order.status] ?? order.status}</h2>
          <p>
            {copy.pickupLabel}: <strong>{formatPickup(order.pickupAt, copy.unknownPickup)}</strong>.{" "}
            {copy.totalLabel} <strong>{formatMoney(order.grandTotal)}</strong>.
          </p>

          <div className="pill-row">
            <span className="pill">
              {copy.source} {order.source}
            </span>
            <span className="pill">
              {copy.payment} {order.paymentStatus}
            </span>
            <span className="pill">
              {copy.customer} {order.customerName}
            </span>
          </div>
        </section>

        <section className="public-list-grid">
          {order.items.map((item) => (
            <article className="public-card" key={item.id}>
              <div className="card-copy">
                <h3>
                  {item.qty}x {item.name}
                </h3>
                <p>{item.notes ?? copy.noNotes}</p>
              </div>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </article>
          ))}
        </section>

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">{copy.quickActions}</p>
            <h2>{copy.quickTitle}</h2>
            <p>{copy.quickBody}</p>
          </div>

          <div className="split-callout-actions">
            <Link className="cta-button" href={`/${citySlug}/${businessSlug}`}>
              {copy.backToMenu}
            </Link>
            <Link className="text-link" href={`/${citySlug}/${businessSlug}/ordine/${orderId}`}>
              {copy.refreshStatus}
            </Link>
          </div>
        </section>
      </section>
    </PublicShell>
  );
}
