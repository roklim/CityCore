export type OpeningIntervalInput = {
  opensAt: string;
  closesAt: string;
};

export type OpeningDayInput = {
  weekday: number;
  isClosed: boolean;
  intervals: OpeningIntervalInput[];
};

export type PublishableBusiness = {
  name: string;
  slug: string;
  cityStatus: "active" | "coming_soon" | "disabled";
  cityActive: boolean;
  publicSubtitle: string | null;
  publicDescription: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  website: string | null;
  activeCategoryCount: number;
};

export function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function validateOpeningWeek(days: OpeningDayInput[]) {
  const errors: string[] = [];
  const weekdays = new Set<number>();

  if (days.length !== 7) {
    errors.push("Exactly seven opening days are required.");
  }

  for (const day of days) {
    if (!Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6) {
      errors.push("Weekday must be between 0 (Monday) and 6 (Sunday).");
      continue;
    }

    if (weekdays.has(day.weekday)) {
      errors.push(`Weekday ${day.weekday} is duplicated.`);
    }

    weekdays.add(day.weekday);

    if (day.isClosed && day.intervals.length > 0) {
      errors.push(`Closed weekday ${day.weekday} cannot contain intervals.`);
    }

    const normalized = day.intervals
      .map((interval) => ({
        ...interval,
        opens: timeToMinutes(interval.opensAt),
        closes: timeToMinutes(interval.closesAt),
      }))
      .sort((left, right) => (left.opens ?? -1) - (right.opens ?? -1));

    for (let index = 0; index < normalized.length; index += 1) {
      const interval = normalized[index];

      if (interval.opens == null || interval.closes == null || interval.opens >= interval.closes) {
        errors.push(`Invalid interval on weekday ${day.weekday}.`);
        continue;
      }

      const previous = normalized[index - 1];

      if (previous?.closes != null && previous.closes > interval.opens) {
        errors.push(`Overlapping intervals on weekday ${day.weekday}.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function canSetCategoryParent(
  categoryId: string,
  parentId: string | null | undefined,
  parentByCategoryId: ReadonlyMap<string, string | null>,
) {
  if (!parentId || categoryId === parentId) {
    return categoryId !== parentId;
  }

  let cursor: string | null | undefined = parentId;

  while (cursor) {
    if (cursor === categoryId) {
      return false;
    }

    cursor = parentByCategoryId.get(cursor);
  }

  return true;
}

export function buildCategoryTree<T extends { id: string; parentId: string | null }>(items: T[]) {
  const byId = new Map(items.map((item) => [item.id, { ...item, children: [] as T[] }]));
  const roots: Array<T & { children: T[] }> = [];

  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId)?.children.push(item);
    else roots.push(item);
  }

  return roots;
}

export function canTransitionInquiryStatus(
  from: "new" | "read" | "closed",
  to: "new" | "read" | "closed",
) {
  return (
    from === to ||
    (from === "new" && (to === "read" || to === "closed")) ||
    (from === "read" && to === "closed")
  );
}

export function getBusinessPublishReadiness(business: PublishableBusiness) {
  const missingRequirements: string[] = [];
  const warnings: string[] = [];

  if (!business.name.trim()) missingRequirements.push("name");
  if (!business.slug.trim()) missingRequirements.push("slug");
  if (business.cityStatus !== "active" || !business.cityActive)
    missingRequirements.push("active_city");
  if (!business.publicSubtitle?.trim() && !business.publicDescription?.trim()) {
    missingRequirements.push("description");
  }
  if (business.activeCategoryCount === 0) missingRequirements.push("active_category");
  if (!business.publicPhone && !business.publicEmail && !business.website) {
    missingRequirements.push("public_contact");
  }
  if (!business.publicPhone && !business.publicEmail) {
    warnings.push("No direct public phone or email is configured.");
  }

  return {
    canPublish: missingRequirements.length === 0,
    missingRequirements,
    warnings,
  };
}
