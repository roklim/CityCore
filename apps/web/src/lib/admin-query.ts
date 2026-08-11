export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function searchParam(params: AdminSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function positivePage(value: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function queryString(values: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

export function pageHref(
  pathname: string,
  values: Record<string, string | number | boolean | undefined>,
  page: number,
  pageParam = "page",
) {
  const query = queryString({ ...values, [pageParam]: page > 1 ? page : undefined });
  return query ? `${pathname}?${query}` : pathname;
}
