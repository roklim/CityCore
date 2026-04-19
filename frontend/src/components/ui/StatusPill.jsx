export default function StatusPill({ tone = "neutral", children }) {
  return <span className={`ui-status-pill ${tone}`}>{children}</span>;
}
