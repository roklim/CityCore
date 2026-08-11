const statusLabels: Record<string, string> = {
  active: "Attivo",
  draft: "Bozza",
  paused: "In pausa",
  disabled: "Disabilitato",
  published: "Pubblicato",
  coming_soon: "In preparazione",
  invited: "Invitato",
  new: "Nuova",
  read: "Letta",
  closed: "Chiusa",
};

const auditActionLabels: Record<string, string> = {
  "business.published": "Attività pubblicata",
  "business.unpublished": "Attività rimossa dalla pubblicazione",
  "business.modules.updated": "Moduli attività aggiornati",
  "platform.auth.login_succeeded": "Accesso effettuato",
  "platform.auth.login_failed": "Tentativo di accesso non riuscito",
  "platform.auth.access_switched": "Accesso operativo cambiato",
  "platform.auth.bootstrap_admin_created": "Primo amministratore creato",
  "platform.city.created": "Città creata",
  "platform.city.updated": "Città aggiornata",
  "platform.business.created": "Attività creata",
  "platform.business.updated": "Attività aggiornata",
  "platform.access_grant.created": "Accesso assegnato",
  "platform.access_grant.updated": "Accesso aggiornato",
};

export function adminStatusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

export function adminStatusTone(status: string) {
  if (["active", "published", "read"].includes(status)) return "positive";
  if (["disabled", "closed"].includes(status)) return "muted";
  if (["paused", "coming_soon", "invited"].includes(status)) return "warning";
  return "neutral";
}

export function adminRoleLabel(role: string) {
  return (
    {
      global_admin: "Amministratore piattaforma",
      city_admin: "Amministratore città",
      local_admin: "Owner attività",
      staff: "Staff attività",
    }[role] ?? role.replaceAll("_", " ")
  );
}

export function adminScopeLabel(scopeType: string) {
  return { platform: "Piattaforma", city: "Città", business: "Attività" }[scopeType] ?? scopeType;
}

export function auditActionLabel(action: string) {
  return auditActionLabels[action] ?? action.replaceAll(/[._]/gu, " ");
}
