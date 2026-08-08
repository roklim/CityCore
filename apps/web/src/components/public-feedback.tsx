import Link from "next/link";

type PublicFeedbackProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };
  live?: boolean;
  headingLevel?: 1 | 2;
};

export function PublicFeedback({
  title,
  body,
  action,
  live = false,
  headingLevel = 1,
}: PublicFeedbackProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";

  return (
    <section
      className="public-feedback"
      aria-live={live ? "polite" : undefined}
      role={live ? "status" : undefined}
    >
      <p className="section-label">CityCore</p>
      <Heading>{title}</Heading>
      <p>{body}</p>
      {action ? (
        <Link className="cta-button" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
