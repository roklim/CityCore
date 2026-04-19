export default function MenuStateCard({
  tone = "neutral",
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className={`menu-state-card ${tone === "error" ? "error" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
