"use client";

import { useEffect, useState } from "react";

import {
  getBusinessOpeningStatus,
  type BusinessOpeningStatus as OpeningStatus,
} from "../../lib/business-opening-hours";
import type { PublicOpeningDay } from "../../lib/platform-api";

const refreshIntervalMs = 30_000;

export function BusinessOpeningStatus({
  days,
  timezone,
  initialStatus,
}: {
  days: PublicOpeningDay[];
  timezone: string;
  initialStatus: OpeningStatus;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const refresh = () => setStatus(getBusinessOpeningStatus(days, timezone, new Date()));
    refresh();
    const intervalId = window.setInterval(refresh, refreshIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [days, timezone]);

  return (
    <p className="public-business-opening-status" role="status" aria-live="polite">
      <strong>{status.label}</strong>
      {status.detail ? <span> · {status.detail}</span> : null}
    </p>
  );
}
