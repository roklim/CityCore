import { MENU_CATEGORY_OPTIONS, MENU_UNIT_OPTIONS } from "../../constants";
import { money } from "../../utils/format";

export default function AdminMenuSection({
  adminMenu,
  changeMenuAvailability,
  editMenuItem,
  editingMenuId,
  groupedMenu,
  menuForm,
  menuSaving,
  removeMenuItem,
  resetMenuForm,
  saveMenuItem,
  unavailableItems,
  updateMenuForm,
}) {
  return (
    <section className="admin-menu-manager">
      <div className="admin-menu-overview">
        <article>
          <span>Prodotti totali</span>
          <strong>{adminMenu.length}</strong>
        </article>
        <article>
          <span>Visibili</span>
          <strong>{adminMenu.length - unavailableItems.length}</strong>
        </article>
        <article>
          <span>Nascosti</span>
          <strong>{unavailableItems.length}</strong>
        </article>
        <article>
          <span>Categorie</span>
          <strong>{Object.keys(groupedMenu).length}</strong>
        </article>
      </div>
      <form className="menu-editor-panel" onSubmit={saveMenuItem}>
        <div className="section-heading">
          <p className="eyebrow">Gestione menu</p>
          <h2>{editingMenuId ? "Modifica prodotto" : "Aggiungi prodotto"}</h2>
        </div>
        <div className="menu-live-preview">
          <span>Anteprima cliente</span>
          <article>
            <b>{menuForm.emoji || "•"}</b>
            <div>
              <strong>{menuForm.name || "Nome prodotto"}</strong>
              <p>
                {menuForm.description ||
                  "Descrizione breve visibile nel menu pubblico."}
              </p>
            </div>
            <em>
              {money(Number(menuForm.price) || 0)} / {menuForm.unit || "pezzo"}
            </em>
          </article>
        </div>

        <div className="menu-editor-grid">
          <label>
            Nome prodotto
            <input
              value={menuForm.name}
              onChange={(event) => updateMenuForm("name", event.target.value)}
              placeholder="Es. Margherita"
            />
          </label>
          <label>
            Prezzo
            <input
              min="0"
              step="0.1"
              type="number"
              value={menuForm.price}
              onChange={(event) => updateMenuForm("price", event.target.value)}
              placeholder="6.00"
            />
          </label>
          <label>
            Categoria
            <select
              value={menuForm.category}
              onChange={(event) =>
                updateMenuForm("category", event.target.value)
              }
            >
              {MENU_CATEGORY_OPTIONS.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Unita
            <select
              value={menuForm.unit}
              onChange={(event) => updateMenuForm("unit", event.target.value)}
            >
              {MENU_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label>
            Emoji
            <input
              value={menuForm.emoji}
              onChange={(event) => updateMenuForm("emoji", event.target.value)}
              placeholder={"\u{1F355}"}
            />
          </label>
          <label>
            Ordine
            <input
              min="0"
              step="1"
              type="number"
              value={menuForm.sortOrder}
              onChange={(event) =>
                updateMenuForm("sortOrder", event.target.value)
              }
              placeholder="10"
            />
          </label>
        </div>

        <label>
          Immagine prodotto
          <input
            value={menuForm.imageUrl}
            onChange={(event) => updateMenuForm("imageUrl", event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Descrizione ingredienti
          <textarea
            value={menuForm.description}
            onChange={(event) =>
              updateMenuForm("description", event.target.value)
            }
            placeholder="Pomodoro, mozzarella, basilico"
          />
        </label>

        <div className="menu-editor-grid">
          <label>
            Tag
            <input
              value={menuForm.tags}
              onChange={(event) => updateMenuForm("tags", event.target.value)}
              placeholder="vegetariana, classica"
            />
          </label>
          <label>
            Allergeni
            <input
              value={menuForm.allergens}
              onChange={(event) =>
                updateMenuForm("allergens", event.target.value)
              }
              placeholder="glutine, latte"
            />
          </label>
        </div>

        <label className="menu-featured-check">
          <input
            checked={menuForm.featured}
            type="checkbox"
            onChange={(event) =>
              updateMenuForm("featured", event.target.checked)
            }
          />
          Segna come piu richiesta / novita
        </label>

        <div className="menu-editor-actions">
          <button type="submit" disabled={menuSaving}>
            {menuSaving
              ? "Salvataggio..."
              : editingMenuId
                ? "Salva modifiche"
                : "Aggiungi al menu"}
          </button>
          {editingMenuId && (
            <button type="button" onClick={resetMenuForm}>
              Annulla modifica
            </button>
          )}
        </div>
      </form>

      <div className="menu-admin-list">
        <div className="section-heading">
          <p className="eyebrow">Prodotti pubblicati</p>
          <h2>Menu della pizzeria</h2>
        </div>
        {MENU_CATEGORY_OPTIONS.map((category) => {
          const items = groupedMenu[category.value] || [];
          if (items.length === 0) return null;

          return (
            <section className="menu-admin-category" key={category.value}>
              <h3>{category.label}</h3>
              <div className="menu-admin-items">
                {items.map((item) => (
                  <article
                    className={`menu-admin-item ${item.available ? "" : "off"}`}
                    key={item._id}
                  >
                    <div>
                      <strong>
                        {item.emoji || "\u{1F355}"} {item.name}
                      </strong>
                      {item.imageUrl && (
                        <img
                          className="menu-admin-thumb"
                          src={item.imageUrl}
                          alt=""
                        />
                      )}
                      <span>{item.description || "Senza descrizione"}</span>
                      <small>
                        {money(item.price)} - {item.unit || "pezzo"} - ordine{" "}
                        {item.sortOrder || 0}
                      </small>
                    </div>
                    <div className="menu-admin-actions">
                      <button type="button" onClick={() => editMenuItem(item)}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => changeMenuAvailability(item._id)}
                      >
                        {item.available ? "Nascondi" : "Mostra"}
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => removeMenuItem(item._id)}
                      >
                        Elimina
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
