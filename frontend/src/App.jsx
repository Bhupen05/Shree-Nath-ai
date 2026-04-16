import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [state, setState] = useState({
    loading: true,
    ok: false,
    message: 'Checking backend connection...',
    databaseTime: null,
  })

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Request failed')
        }

        setState({
          loading: false,
          ok: true,
          message: data.message,
          databaseTime: data.databaseTime,
        })
      } catch (error) {
        setState({
          loading: false,
          ok: false,
          message: error.message,
          databaseTime: null,
        })
      }
    }

    fetchHealth()
  }, [])

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">Full Stack Starter</p>
        <h1>React + Express + PostgreSQL</h1>
        <p className="sub">A verified API-to-database connection check.</p>

        <div className={`status ${state.loading ? 'loading' : state.ok ? 'ok' : 'error'}`}>
          <span className="dot" aria-hidden="true" />
          <div>
            <strong>
              {state.loading
                ? 'Checking services'
                : state.ok
                  ? 'Everything is connected'
                  : 'Connection issue'}
            </strong>
            <p>{state.message}</p>
          </div>
        </div>
        {state.databaseTime && (
          <p className="db-time">
            Database time: <span>{new Date(state.databaseTime).toLocaleString()}</span>
          </p>
        )}

        <div className="actions">
          <button
            onClick={() => window.location.reload()}
            type="button"
          >
            Recheck Connection
          </button>
        </div>
        <div className="stack">
          <span>Frontend: React (Vite)</span>
          <span>Backend: Express</span>
          <span>Database: PostgreSQL</span>
        </div>
      </section>
    </main>
  )
}

export default App
