import type { OperatorNavigationItem } from "../components/admin-shell";
import type { AuthAccess } from "./platform-api";

export function getPlatformAdminNavigation(
  access: AuthAccess,
  currentPath: string,
  hasMultipleAccesses: boolean,
): OperatorNavigationItem[] {
  if (access.scopeType === "business") return [];

  const cityLabel = access.scopeType === "city" ? access.city?.name : null;
  const items: OperatorNavigationItem[] = [
    { href: "/admin", label: "Dashboard", meta: cityLabel ?? "Riepilogo piattaforma" },
    { href: "/admin/cities", label: "Città", meta: cityLabel ?? "Registry e gestione" },
    { href: "/admin/businesses", label: "Attività", meta: "Elenco e pubblicazione" },
    { href: "/admin/access", label: "Accessi", meta: "Ruoli e scope" },
    { href: "/admin/audit", label: "Registro attività", meta: "Azioni e tracciabilità" },
    {
      href: "/",
      label: "Home pubblica",
      meta: "Apri CityCore",
      dividerBefore: true,
    },
  ];

  if (hasMultipleAccesses) {
    items.push({
      href: "/select-access",
      label: "Cambia accesso",
      meta: "Scegli ruolo e ambito",
    });
  }

  return items.map((item) => ({ ...item, current: item.href === currentPath }));
}
