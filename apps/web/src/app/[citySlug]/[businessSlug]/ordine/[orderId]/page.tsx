import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "../../../../../components/public-shell";
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

function formatPickup(value: string | null) {
  if (!value) {
    return "Da confermare";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const statusLabels: Record<string, string> = {
  pending: "In attesa",
  confirmed: "Confermato",
  preparing: "In preparazione",
  ready: "Pronto",
  completed: "Completato",
  cancelled: "Annullato",
};

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

  return (
    <PublicShell
      toneLabel="Tracking ordine"
      title={`${business.name}: stato ordine sempre leggibile`}
      description="Il tracking pubblico e gia agganciato alla nuova API ordering V2. Il cliente non ha piu bisogno del vecchio flusso legacy per seguire il proprio ordine."
      citySlug={city.slug}
      businessName={business.name}
      accentNote={`Ordine ${order.id.slice(-6).toUpperCase()}. Stato ${statusLabels[order.status] ?? order.status}.`}
    >
      <section className="public-stack">
        <section className="spotlight-card spotlight-primary">
          <p className="section-label">Stato attuale</p>
          <h2>{statusLabels[order.status] ?? order.status}</h2>
          <p>
            Ritiro previsto: <strong>{formatPickup(order.pickupAt)}</strong>. Totale{" "}
            <strong>{formatMoney(order.grandTotal)}</strong>.
          </p>

          <div className="pill-row">
            <span className="pill">Fonte {order.source}</span>
            <span className="pill">Pagamento {order.paymentStatus}</span>
            <span className="pill">Cliente {order.customerName}</span>
          </div>
        </section>

        <section className="public-list-grid">
          {order.items.map((item) => (
            <article className="public-card" key={item.id}>
              <div className="card-copy">
                <h3>
                  {item.qty}x {item.name}
                </h3>
                <p>{item.notes ?? "Nessuna nota per questo articolo."}</p>
              </div>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </article>
          ))}
        </section>

        <section className="split-callout">
          <div className="split-callout-copy">
            <p className="section-label">Azioni rapide</p>
            <h2>Tracking V2, non piu route legacy</h2>
            <p>
              Puoi aggiornare la pagina per vedere eventuali cambi di stato o tornare al menu del
              business.
            </p>
          </div>

          <div className="split-callout-actions">
            <Link className="cta-button" href={`/${citySlug}/${businessSlug}`}>
              Torna al menu
            </Link>
            <Link className="text-link" href={`/${citySlug}/${businessSlug}/ordine/${orderId}`}>
              Aggiorna stato
            </Link>
          </div>
        </section>
      </section>
    </PublicShell>
  );
}
