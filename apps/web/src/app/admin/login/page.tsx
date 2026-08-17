import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPlatformApi } from "../../../lib/platform-api";
import { getWebSession } from "../../../lib/web-session";
import { AdminLoginForms } from "./auth-forms";

export const metadata = {
  title: "Accesso area operatori",
};

export default async function AdminLoginPage() {
  const session = await getWebSession();

  if (session) {
    redirect(session.auth.redirectTo || "/admin");
  }

  const bootstrapStatus = await fetchPlatformApi<{
    status: "ok";
    required: boolean;
    available: boolean;
    secretRequired?: boolean;
  }>("/api/v2/auth/bootstrap-status").catch(() => null);

  return (
    <div className="operator-auth-stage">
      <header className="operator-auth-header">
        <Link className="operator-auth-brand" href="/" aria-label="CityCore, torna alla home">
          <span>
            CityCore<span aria-hidden="true">.</span>
          </span>
          <small>Operator workspace</small>
        </Link>
        <Link className="operator-auth-public-link" href="/">
          Torna alla rete pubblica
        </Link>
      </header>

      <main className="operator-auth-layout" id="main-content" tabIndex={-1}>
        <section className="operator-auth-story" aria-labelledby="operator-auth-story-title">
          <div className="operator-auth-story-mark" aria-hidden="true">
            CC
          </div>
          <div className="operator-auth-story-copy">
            <p className="section-label">CityCore control center</p>
            <h1 id="operator-auth-story-title">La città, sotto controllo.</h1>
            <p>
              Gestisci territori, attività e operatività da uno spazio unico, costruito per
              mantenere chiari ruoli e prossimi passi.
            </p>
          </div>
          <dl className="operator-auth-facts">
            <div>
              <dt>Contesto</dt>
              <dd>City-first</dd>
            </div>
            <div>
              <dt>Accesso</dt>
              <dd>Role-based</dd>
            </div>
            <div>
              <dt>Esperienza</dt>
              <dd>Mobile-ready</dd>
            </div>
          </dl>
        </section>

        <section className="operator-auth-panel" aria-labelledby="operator-login-title">
          <div className="operator-auth-panel-heading">
            <p className="section-label">Accesso riservato</p>
            <h2 id="operator-login-title">Accedi a CityCore</h2>
            <p>
              Usa le credenziali ricevute. Dopo l'accesso apriremo automaticamente l'area corretta
              per il tuo ruolo.
            </p>
          </div>
          <AdminLoginForms bootstrapStatus={bootstrapStatus} />
          <p className="operator-auth-security-note">
            Le aree disponibili dipendono esclusivamente dagli accessi assegnati al tuo account.
          </p>
        </section>
      </main>
    </div>
  );
}
