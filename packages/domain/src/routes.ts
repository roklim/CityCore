export type BusinessRouteParams = {
  citySlug: string;
  businessSlug: string;
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildCityPath(citySlug: string) {
  return `/${citySlug}`;
}

export function buildBusinessPath({ citySlug, businessSlug }: BusinessRouteParams) {
  return `${buildCityPath(citySlug)}/${businessSlug}`;
}

export function buildBusinessAdminPath(route: BusinessRouteParams) {
  return `${buildBusinessPath(route)}/admin`;
}
