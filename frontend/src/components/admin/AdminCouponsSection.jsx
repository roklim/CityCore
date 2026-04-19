import { money } from "../../utils/format";
import InlineNotice from "../ui/InlineNotice";

export default function AdminCouponsSection({
  changeCouponStatus,
  couponForm,
  couponSaving,
  coupons,
  editCoupon,
  editingCouponId,
  removeCoupon,
  resetCouponForm,
  saveCoupon,
  updateCouponForm,
}) {
  return (
    <section className="admin-menu-manager">
      <form className="menu-editor-panel" onSubmit={saveCoupon}>
        <div className="section-heading">
          <p className="eyebrow">Coupon e offerte</p>
          <h2>{editingCouponId ? "Modifica coupon" : "Nuovo coupon"}</h2>
        </div>
        <div className="menu-editor-grid">
          <label>
            Codice
            <input
              value={couponForm.code}
              onChange={(event) => updateCouponForm("code", event.target.value)}
              placeholder="PIZZA10"
            />
          </label>
          <label>
            Tipo
            <select
              value={couponForm.type}
              onChange={(event) => updateCouponForm("type", event.target.value)}
            >
              <option value="percent">Percentuale</option>
              <option value="fixed">Importo fisso</option>
            </select>
          </label>
          <label>
            Valore
            <input
              min="0"
              step="0.1"
              type="number"
              value={couponForm.value}
              onChange={(event) => updateCouponForm("value", event.target.value)}
            />
          </label>
          <label>
            Scadenza
            <input
              type="date"
              value={couponForm.expiresAt}
              onChange={(event) =>
                updateCouponForm("expiresAt", event.target.value)
              }
            />
          </label>
          <label>
            Limite utilizzi
            <input
              min="0"
              step="1"
              type="number"
              value={couponForm.usageLimit}
              onChange={(event) =>
                updateCouponForm("usageLimit", event.target.value)
              }
              placeholder="0 = illimitato"
            />
          </label>
        </div>
        <label className="menu-featured-check">
          <input
            checked={couponForm.active}
            type="checkbox"
            onChange={(event) =>
              updateCouponForm("active", event.target.checked)
            }
          />
          Coupon attivo
        </label>
        <div className="menu-editor-actions">
          <button type="submit" disabled={couponSaving}>
            {couponSaving
              ? "Salvataggio..."
              : editingCouponId
                ? "Salva coupon"
                : "Crea coupon"}
          </button>
          {editingCouponId && (
            <button type="button" onClick={resetCouponForm}>
              Annulla
            </button>
          )}
        </div>
      </form>

      <div className="menu-admin-list">
        <div className="section-heading">
          <p className="eyebrow">Offerte attive</p>
          <h2>Codici sconto</h2>
        </div>
        {coupons.length === 0 ? (
          <InlineNotice
            title="Nessun coupon creato"
            description="Crea un codice sconto quando vuoi attivare una promozione."
          />
        ) : (
          <div className="menu-admin-items">
            {coupons.map((coupon) => (
              <article
                className={`menu-admin-item ${coupon.active ? "" : "off"}`}
                key={coupon._id}
              >
                <div>
                  <strong>{coupon.code}</strong>
                  <span>
                    {coupon.type === "percent"
                      ? `${coupon.value}%`
                      : money(coupon.value)}
                    {coupon.expiresAt
                      ? ` - fino al ${coupon.expiresAt}`
                      : " - senza scadenza"}
                  </span>
                  <small>
                    {coupon.usedCount || 0}/{coupon.usageLimit || "illimitato"}{" "}
                    utilizzi
                  </small>
                </div>
                <div className="menu-admin-actions">
                  <button type="button" onClick={() => editCoupon(coupon)}>
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => changeCouponStatus(coupon._id)}
                  >
                    {coupon.active ? "Disattiva" : "Attiva"}
                  </button>
                  <button
                    className="danger"
                    type="button"
                    onClick={() => removeCoupon(coupon._id)}
                  >
                    Elimina
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
