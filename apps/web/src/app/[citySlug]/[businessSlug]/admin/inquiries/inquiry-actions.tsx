"use client";

import { useFormStatus } from "react-dom";
import type { PlatformBusinessInquiry } from "../../../../../lib/platform-api";
import { updateInquiryStatusAction } from "../actions";

function InquiryActionButtons({ status }: { status: PlatformBusinessInquiry["status"] }) {
  const { pending } = useFormStatus();
  return (
    <div className="business-inquiry-actions">
      <button className="admin-button form-button" disabled={pending} type="submit">
        {pending ? "Salvataggio…" : "Salva nota"}
      </button>
      {status === "new" ? (
        <button
          className="admin-button ghost-button"
          disabled={pending}
          name="status"
          type="submit"
          value="read"
        >
          Segna come letta
        </button>
      ) : null}
      {status !== "closed" ? (
        <button
          className="admin-button ghost-button danger-button"
          disabled={pending}
          name="status"
          onClick={(event) => {
            if (
              !window.confirm("Chiudere questa richiesta? Potrai ancora consultarla tra le chiuse.")
            ) {
              event.preventDefault();
            }
          }}
          type="submit"
          value="closed"
        >
          Chiudi richiesta
        </button>
      ) : null}
    </div>
  );
}

export function BusinessInquiryActions({
  citySlug,
  businessSlug,
  inquiry,
  returnTo,
}: {
  citySlug: string;
  businessSlug: string;
  inquiry: PlatformBusinessInquiry;
  returnTo: string;
}) {
  return (
    <form action={updateInquiryStatusAction} className="business-inquiry-detail-form">
      <input name="citySlug" type="hidden" value={citySlug} />
      <input name="businessSlug" type="hidden" value={businessSlug} />
      <input name="inquiryId" type="hidden" value={inquiry.id} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="field">
        <span>Nota interna</span>
        <textarea defaultValue={inquiry.internalNote ?? ""} maxLength={2000} name="internalNote" />
        <small>Visibile solo agli operatori autorizzati, mai al cliente.</small>
      </label>
      <p className="admin-form-note">
        Salva la nota senza cambiare stato oppure usa una delle azioni per aggiornare anche il
        flusso della richiesta.
      </p>
      <InquiryActionButtons status={inquiry.status} />
    </form>
  );
}
