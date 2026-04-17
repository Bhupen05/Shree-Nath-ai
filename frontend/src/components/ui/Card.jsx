function Card({ title, subtitle, actions, children }) {
  return (
    <article className="panel-card">
      {(title || subtitle || actions) && (
        <header className="panel-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </article>
  )
}

export default Card
