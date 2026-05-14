import { PublicShell } from "../../components/public-shell";
import { buildAccountPageContent } from "../../lib/public-content";

export const metadata = {
  title: "Account",
};

export default function AccountPage() {
  const content = buildAccountPageContent();

  return (
    <PublicShell
      toneLabel={content.toneLabel}
      title={content.title}
      description={content.description}
      accentNote={content.accentNote}
    >
      <section className="route-grid">
        {content.cards.map((card) => (
          <article className="route-card" key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
          </article>
        ))}
      </section>
    </PublicShell>
  );
}
