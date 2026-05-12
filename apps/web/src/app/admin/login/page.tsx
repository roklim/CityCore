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
      asideText="Il primo obiettivo non e costruire il banco definitivo, ma togliere la dipendenza strutturale dal login legacy e agganciare il web V2 a sessioni e permessi reali."
    >
      <section className="section-header">
        <p className="section-label">Admin Entry</p>
        <h2>La V2 ora puo autenticarsi senza passare da Express o Mongo</h2>
        <p>
          Se non esiste ancora un `global_admin`, usa il bootstrap una sola volta. Altrimenti entra
          con le credenziali gia presenti nel data model V2.
        </p>
      </section>

      <AdminLoginForms />
    </AdminShell>
  );
}
