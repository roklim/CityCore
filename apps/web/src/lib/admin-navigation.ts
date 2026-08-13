import type { OperatorNavigationItem } from "../components/admin-shell";
import type { AuthAccess } from "./platform-api";

export function getPlatformAdminNavigation(
  access: AuthAccess,
  currentPath: string,
  _hasMultipleAccesses: boolean,
): OperatorNavigationItem[] {
  if (access.scopeType === "business") return [];

  const cityLabel = access.scopeType === "city" ? access.city?.name : null;
  const items: OperatorNavigationItem[] = [
    { href: "/admin", label: "Dashboard", meta: cityLabel ?? "Riepilogo generale" },
    { href: "/admin/cities", label: "Città", meta: cityLabel ?? "Configurazione e visibilità" },
    { href: "/admin/businesses", label: "Attività", meta: "Elenco e pubblicazione" },
    { href: "/admin/access", label: "Accessi", meta: "Persone, ruoli e ambiti" },
    { href: "/admin/audit", label: "Registro attività", meta: "Storico delle operazioni" },
    {
      href: "/",
      label: "Home pubblica",
      meta: "Apri CityCore",
      dividerBefore: true,
    },
  ];

  return items.map((item) => ({ ...item, current: item.href === currentPath }));
}
