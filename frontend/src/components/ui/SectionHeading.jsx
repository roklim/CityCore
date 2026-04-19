export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="ui-section-heading">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
      {action && <div className="ui-section-heading-action">{action}</div>}
    </div>
  );
}
