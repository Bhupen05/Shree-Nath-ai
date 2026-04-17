import Button from './Button'

function StatusView({ mode, title, message, onRetry }) {
  return (
    <section className={`status-view status-${mode}`}>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {mode === 'error' && onRetry && (
        <Button variant="secondary" onClick={onRetry}>Try again</Button>
      )}
    </section>
  )
}

export default StatusView
