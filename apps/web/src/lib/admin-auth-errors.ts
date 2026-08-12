import { PlatformApiError } from "./platform-api";

export function getAdminAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof PlatformApiError)) {
    return fallback;
  }

  if (error.status === 401) {
    return "Email o password non corrette.";
  }

  if (error.status === 403) {
    if (error.message === "Account is not active") {
      return "L'account non è ancora attivo. Chiedi a un amministratore una password temporanea.";
    }

    if (error.message === "No active access grants found") {
      return "L'account non dispone di accessi attivi. Contatta un amministratore.";
    }

    return "Non puoi completare questo accesso con le credenziali correnti.";
  }

  if (error.status === 409) {
    return "La piattaforma è già inizializzata. Usa il modulo di accesso.";
  }

  if (error.status === 429) {
    return "Troppi tentativi ravvicinati. Attendi qualche minuto e riprova.";
  }

  if (error.status >= 500) {
    return "Il servizio di accesso non è disponibile. Riprova tra qualche istante.";
  }

  return fallback;
}
