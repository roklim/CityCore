import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { getWebSession } from "../../../lib/v2-session";
import { AdminLoginForms } from "./auth-forms";

export const metadata = {
  title: "Admin Login",
};

export default async function AdminLoginPage() {
  const session = await getWebSession();

  if (session) {
    redirect(session.auth.redirectTo || "/admin");
  }

  return (
    <AdminShell
      activeSection="global_admin"
      eyebrow="V2 auth"
      title="Autenticazione reale per la console V2"
      description="Questo ingresso parla solo con `apps/api`: bootstrap del primo global admin, login con AccessGrant e sessione web salvata via cookie `httpOnly`."
      routePath="/admin/login"
      statusLabel="Auth"
      asideTitle="Slice attivo"
      asideText="Il primo obiettivo e usare un accesso pulito e affidabile: sessioni web reali, permessi espliciti e redirect coerenti con ruolo e scope."
    >
      <section className="section-header">
        <p className="section-label">Admin Entry</p>
        <h2>La console puo autenticarsi direttamente sulla piattaforma attiva</h2>
        <p>
          Se non esiste ancora un `global_admin`, usa il bootstrap una sola volta. Altrimenti entra
          con le credenziali gia presenti nel data model V2.
        </p>
      </section>

      <AdminLoginForms />
    </AdminShell>
  );
}
