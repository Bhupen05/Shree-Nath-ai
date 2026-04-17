import { Link } from 'react-router-dom'

function ForbiddenPage() {
  return (
    <section className="center-state">
      <h1>403</h1>
      <p>You do not have permission to access this page.</p>
      <p>
        Go back to <Link to="/dashboard">dashboard</Link> or sign in with a different account.
      </p>
    </section>
  )
}

export default ForbiddenPage
