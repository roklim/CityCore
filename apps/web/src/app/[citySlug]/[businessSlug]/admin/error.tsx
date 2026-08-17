"use client";

import { OperatorErrorState } from "../../../../../components/operator-error-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <OperatorErrorState
      reset={reset}
      title="Non siamo riusciti ad aprire la gestione dell'attività"
      body="La configurazione dell'attività non è stata modificata. Riprova oppure torna alla dashboard."
    />
  );
}
