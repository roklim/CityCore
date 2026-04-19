import { MENU_CATEGORY_OPTIONS } from "../../constants";
import InlineNotice from "../ui/InlineNotice";

export default function AdminAvailabilitySection({
  adminMenu,
  changeMenuAvailability,
  unavailableItems,
}) {
  return (
    <section className="admin-dashboard-grid">
      <div className="admin-panel wide">
        <div className="section-heading">
          <p className="eyebrow">Disponibilita prodotti</p>
          <h2>Esauriti o nascosti</h2>
        </div>
        <div className="availability-list">
          {adminMenu.length === 0 ? (
            <InlineNotice
              title="Menu non ancora caricato"
              description="Aggiungi prodotti al menu per gestire la disponibilita."
            />
          ) : (
            adminMenu.map((item) => (
              <article className={item.available ? "" : "off"} key={item._id}>
                <div>
                  <strong>
                    {item.emoji || "\u{1F355}"} {item.name}
                  </strong>
                  <span>
                    {item.available
                      ? "Visibile ai clienti"
                      : "Nascosto / esaurito"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => changeMenuAvailability(item._id)}
                >
                  {item.available ? "Segna esaurito" : "Rendi ordinabile"}
                </button>
              </article>
            ))
          )}
        </div>
      </div>
      <div className="admin-panel">
        <div className="section-heading">
          <p className="eyebrow">Riepilogo</p>
          <h2>Stato menu</h2>
        </div>
        <div className="top-products">
          <span>
            <strong>Prodotti attivi</strong>
            <b>{adminMenu.length - unavailableItems.length}</b>
          </span>
          <span>
            <strong>Non ordinabili</strong>
            <b>{unavailableItems.length}</b>
          </span>
          <span>
            <strong>Categorie</strong>
            <b>{MENU_CATEGORY_OPTIONS.length}</b>
          </span>
        </div>
      </div>
    </section>
  );
}
