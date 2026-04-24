export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  return (
    <main className="shell">
      <section className="route-card">
        <p className="eyebrow">Customer Surface</p>
        <h1>Customer account shell</h1>
        <p>
          Qui vivranno profilo, ordini, prenotazioni, soggiorni, preferenze e
          storico del cliente autenticato.
        </p>
        <div className="route-meta">
          <code>/account</code>
        </div>
      </section>
    </main>
  );
}
