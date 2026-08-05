import Link from "next/link";

type PublicFeedbackProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };
  live?: boolean;
};

export function PublicFeedback({ title, body, action, live = false }: PublicFeedbackProps) {
  return (
    <section
      className="public-feedback"
      aria-live={live ? "polite" : undefined}
      role={live ? "status" : undefined}
    >
      <p className="section-label">CityCore</p>
      <h1>{title}</h1>
      <p>{body}</p>
      {action ? (
        <Link className="cta-button" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
