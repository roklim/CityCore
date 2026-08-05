import { redirect } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getWebSession } from "../../lib/web-session";
import { AccessSelector } from "./access-selector";

export const metadata = {
  title: "Scelta accesso operatori",
};

export default async function SelectAccessPage() {
  const session = await getWebSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.auth.accesses.length <= 1) {
    redirect(session.auth.redirectTo || "/admin");
  }

  return (
    <AdminShell
      activeSection="global_admin"
      eyebrow="Area operatori"
      title="Scegli la superficie da aprire"
      description="Il tuo account dispone di più scope operativi. Seleziona il permesso con cui proseguire."
      routePath="/select-access"
      statusLabel="Area operatori"
      asideTitle="Sessione corrente"
      asideText="Questa schermata evita scorciatoie implicite: l'utente sceglie un grant reale e la piattaforma decide il redirect finale coerente con ruolo e scope."
    >
      <section className="section-header">
        <p className="section-label">Multi-accesso</p>
        <h2>{session.auth.user.name ?? session.auth.user.email}</h2>
        <p>
          Sono disponibili {session.auth.accesses.length} accessi attivi. Seleziona il grant da
          usare per questa sessione.
        </p>
      </section>

      <AccessSelector accesses={session.auth.accesses} />
    </AdminShell>
  );
}
