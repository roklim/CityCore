import { OPENING_DAY_OPTIONS } from "../../constants";

export default function AdminSettingsSection({
  applyOpeningPreset,
  saveSettings,
  settingsForm,
  settingsSaving,
  toggleOpeningDay,
  updateSettingsForm,
}) {
  return (
    <section className="admin-panel settings-panel">
      <div className="section-heading">
        <p className="eyebrow">Locale</p>
        <h2>Impostazioni operative</h2>
      </div>
      <form className="settings-form" onSubmit={saveSettings}>
        <div className="settings-hours-card">
          <div>
            <p className="eyebrow">Visibile sul menu cliente</p>
            <h3>Orari di apertura</h3>
            <span>
              Questo testo compare nella prima schermata del menu pubblico.
            </span>
          </div>
          <strong>{settingsForm.openingHours || "Non impostati"}</strong>
          <div className="settings-hour-presets">
            {[
              ["daily", "Tutti i giorni"],
              ["takeaway", "Mar-Dom sera"],
              ["weekend", "Weekend"],
              ["weekly", "Pranzo Lun-Sab"],
              ["closed", "Chiuso"],
            ].map(([preset, label]) => (
              <button
                type="button"
                key={preset}
                onClick={() => applyOpeningPreset(preset)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-full settings-days-editor">
          <span className="settings-field-title">Giorni di apertura</span>
          <div className="settings-day-grid">
            {OPENING_DAY_OPTIONS.map((day) => {
              const active = settingsForm.openingDays.includes(day.id);
              return (
                <button
                  type="button"
                  key={day.id}
                  className={active ? "active" : ""}
                  aria-pressed={active}
                  onClick={() => toggleOpeningDay(day.id)}
                >
                  <strong>{day.label}</strong>
                  <span>{day.fullLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
        <label>
          Ora apertura
          <input
            type="time"
            value={settingsForm.openingTimeStart}
            onChange={(event) =>
              updateSettingsForm({ openingTimeStart: event.target.value })
            }
          />
        </label>
        <label>
          Ora chiusura
          <input
            type="time"
            value={settingsForm.openingTimeEnd}
            onChange={(event) =>
              updateSettingsForm({ openingTimeEnd: event.target.value })
            }
          />
        </label>
        <label className="settings-full">
          Testo mostrato sul menu
          <input
            value={settingsForm.openingHours}
            onChange={(event) =>
              updateSettingsForm({ openingHours: event.target.value })
            }
            placeholder="Es. Mar-Dom 18:00-22:30"
          />
        </label>
        <label>
          Costo consegna
          <input
            min="0"
            step="0.1"
            type="number"
            value={settingsForm.deliveryCost}
            onChange={(event) =>
              updateSettingsForm({ deliveryCost: event.target.value })
            }
          />
        </label>
        <label>
          Ordine minimo
          <input
            min="0"
            step="0.1"
            type="number"
            value={settingsForm.minimumOrder}
            onChange={(event) =>
              updateSettingsForm({ minimumOrder: event.target.value })
            }
          />
        </label>
        <label>
          Zone servite
          <input
            value={settingsForm.serviceZones}
            onChange={(event) =>
              updateSettingsForm({ serviceZones: event.target.value })
            }
            placeholder="Centro, San Paolo, Eur"
          />
        </label>
        <label className="settings-full">
          Messaggio temporaneo
          <textarea
            value={settingsForm.customerMessage}
            onChange={(event) =>
              updateSettingsForm({ customerMessage: event.target.value })
            }
            placeholder="Siamo chiusi per ferie"
          />
        </label>
        <button type="submit" disabled={settingsSaving}>
          {settingsSaving ? "Salvataggio..." : "Salva impostazioni"}
        </button>
      </form>
    </section>
  );
}
