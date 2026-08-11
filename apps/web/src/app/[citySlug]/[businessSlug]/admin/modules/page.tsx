import { MODULE_DEFINITIONS } from "@platform/templates";
import { AdminSubmitButton } from "../../../../../components/admin-submit-button";
import { businessAdminSectionPath } from "../../../../../lib/business-admin-navigation";
import { getBusinessAdminContext } from "../../../../../lib/business-admin-server";
import { updateBusinessModulesAction } from "../actions";

export const metadata = { title: "Moduli attività" };

export default async function BusinessModulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string; businessSlug: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { citySlug, businessSlug } = await params;
  const feedback = await searchParams;
  const { session, business } = await getBusinessAdminContext(citySlug, businessSlug);
  const path = businessAdminSectionPath(citySlug, businessSlug, "modules");
  const primaryModule = business.template.primaryModule;
  const activeCodes = new Set(
    business.modules.filter((module) => module.active).map((module) => module.moduleCode),
  );
  const canManage = session.auth.activeAccess.permissions.includes("modules.manage");

  return (
    <>
      {feedback.notice ? (
        <p className="surface-success" role="status">
          {feedback.notice}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="surface-error" role="alert">
          {feedback.error}
        </p>
      ) : null}
      <section className="data-card" aria-labelledby="modules-title">
        <div className="card-heading">
          <div>
            <p className="section-label">Funzioni attività</p>
            <h2 id="modules-title">Modulo principale e moduli opzionali</h2>
          </div>
        </div>
        <form action={updateBusinessModulesAction} className="business-management-form">
          <input name="citySlug" type="hidden" value={citySlug} />
          <input name="businessSlug" type="hidden" value={businessSlug} />
          <input name="returnTo" type="hidden" value={path} />
          <input name="moduleCodes" type="hidden" value={primaryModule} />
          <div className="business-module-grid">
            {MODULE_DEFINITIONS.map((definition) => {
              const isPrimary = definition.code === primaryModule;
              return (
                <label
                  className={`business-module-card${isPrimary ? " is-primary" : ""}`}
                  key={definition.code}
                >
                  <input
                    defaultChecked={isPrimary || activeCodes.has(definition.code)}
                    disabled={isPrimary || !canManage}
                    name={isPrimary ? undefined : "moduleCodes"}
                    type="checkbox"
                    value={definition.code}
                  />
                  <span>
                    <strong>{definition.label}</strong>
                    <small>{definition.summary}</small>
                    {isPrimary ? <em>Obbligatorio</em> : <em>Opzionale</em>}
                  </span>
                </label>
              );
            })}
          </div>
          {canManage ? (
            <AdminSubmitButton pendingLabel="Salvataggio…">Salva moduli</AdminSubmitButton>
          ) : (
            <p className="muted-copy">Il tuo ruolo può consultare i moduli ma non modificarli.</p>
          )}
        </form>
      </section>
    </>
  );
}
