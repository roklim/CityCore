"use client";

import { OperatorErrorState } from "../../components/operator-error-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <OperatorErrorState reset={reset} />;
}
