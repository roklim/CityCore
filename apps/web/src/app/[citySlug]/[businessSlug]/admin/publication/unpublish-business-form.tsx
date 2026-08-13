"use client";

import { AdminSubmitButton } from "../../../../../components/admin-submit-button";
import { unpublishBusinessAction } from "../actions";

export function UnpublishBusinessForm({
  citySlug,
  businessSlug,
  returnTo,
}: {
  citySlug: string;
  businessSlug: string;
  returnTo: string;
}) {
  return (
    <form
      action={unpublishBusinessAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Rimuovere l’attività dalla pubblicazione? La pagina pubblica non sarà più disponibile.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="citySlug" type="hidden" value={citySlug} />
      <input name="businessSlug" type="hidden" value={businessSlug} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <AdminSubmitButton className="ghost-button danger-button" pendingLabel="Rimozione…">
        Rimuovi dalla pubblicazione
      </AdminSubmitButton>
    </form>
  );
}
