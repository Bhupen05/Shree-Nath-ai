type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="metric-card">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  );
}
