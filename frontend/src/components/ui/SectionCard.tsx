import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className
}: SectionCardProps) {
  return (
    <section className={`section-card ${className ?? ""}`}>
      <div className="section-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
