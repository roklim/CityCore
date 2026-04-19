export default function InlineNotice({ tone = "neutral", title, description }) {
  return (
    <div className={`ui-inline-notice ${tone}`}>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  );
}
