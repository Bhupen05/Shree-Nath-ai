import { useEffect, useState } from 'react'
import { fetchDashboardKpis } from '../../auth'
import Card from '../../components/ui/Card'
import StatusView from '../../components/ui/StatusView'
import { useAuth } from '../../context/AuthContext'

function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kpis, setKpis] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    
    try {
      const data = await fetchDashboardKpis()
      setKpis(data.kpis)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      load()
    }
  }, [isAuthenticated])

  if (loading) {
    return <StatusView mode="loading" title="Loading dashboard" message="Calculating latest KPIs..." />
  }

  if (error) {
    return <StatusView mode="error" title="Unable to load dashboard" message={error} onRetry={load} />
  }

  if (!kpis) {
    return <StatusView mode="empty" title="No KPI data" message="Start creating records to populate metrics." />
  }

  return (
    <section className="stack">
      <header className="page-head">
        <p className="eyebrow">Overview</p>
        <h1>Operations Dashboard</h1>
      </header>

      <div className="kpi-grid">
        <Card title="Users">
          <p className="kpi-value">{kpis.users_count}</p>
        </Card>
        <Card title="Parts">
          <p className="kpi-value">{kpis.parts_count}</p>
        </Card>
        <Card title="Bills">
          <p className="kpi-value">{kpis.bills_count}</p>
        </Card>
        <Card title="Customers">
          <p className="kpi-value">{kpis.customers_count}</p>
        </Card>
      </div>
    </section>
  )
}

export default DashboardPage
