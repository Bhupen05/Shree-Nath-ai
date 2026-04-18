import { useEffect, useState } from 'react'
import { fetchEnhancedDashboardKPIs, fetchReorderSuggestions, fetchSalesTrends } from '../../auth'
import Card from '../../components/ui/Card'
import StatusView from '../../components/ui/StatusView'
import { useAuth } from '../../context/AuthContext'
import { Package, AlertTriangle, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'

function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kpis, setKpis] = useState(null)
  const [trends, setTrends] = useState([])
  const [reorderSuggestions, setReorderSuggestions] = useState([])

  const load = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [kpiData, trendsData, suggestionsData] = await Promise.all([
        fetchEnhancedDashboardKPIs(),
        fetchSalesTrends(30).catch(() => ({ trends: [] })),
        fetchReorderSuggestions().catch(() => ({ suggestions: [] }))
      ])
      setKpis(kpiData.kpis)
      setTrends(trendsData.trends || [])
      setReorderSuggestions(suggestionsData.suggestions || [])
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
    <section className="space-y-6 pb-8">
      <header className="page-head">
        <p className="eyebrow">Overview</p>
        <h1>Operations Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Stock Value</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">₹{kpis.totalStockValue?.toLocaleString()}</p>
            </div>
            <Package className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </Card>

        {/* Pending Bills */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Pending Bills</p>
              <p className="text-2xl font-bold text-orange-900 mt-2">₹{kpis.pendingBillsValue?.toLocaleString()}</p>
              <p className="text-xs text-orange-700 mt-1">{kpis.pendingBillsCount} bills</p>
            </div>
            <DollarSign className="w-12 h-12 text-orange-400 opacity-50" />
          </div>
        </Card>

        {/* Today's Sales */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Today's Sales</p>
              <p className="text-2xl font-bold text-green-900 mt-2">₹{kpis.todaysSales?.toLocaleString()}</p>
              <p className="text-xs text-green-700 mt-1">{kpis.todaysSalesCount} transactions</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-green-400 opacity-50" />
          </div>
        </Card>

        {/* Low Stock Alert */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock Alert</p>
              <p className="text-2xl font-bold text-red-900 mt-2">{kpis.lowStockCount}</p>
              <p className="text-xs text-red-700 mt-1">below threshold</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-400 opacity-50" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dead Stock */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 p-6">
          <div>
            <p className="text-sm font-medium text-purple-600">Dead Stock (90+ days)</p>
            <p className="text-2xl font-bold text-purple-900 mt-2">{kpis.deadStockCount}</p>
            <p className="text-xs text-purple-700 mt-1">inactive products</p>
          </div>
        </Card>

        {/* Overdue Bills */}
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 p-6">
          <div>
            <p className="text-sm font-medium text-pink-600">Overdue Bills</p>
            <p className="text-2xl font-bold text-pink-900 mt-2">₹{kpis.overdueAmount?.toLocaleString()}</p>
            <p className="text-xs text-pink-700 mt-1">{kpis.overdueCount} bills</p>
          </div>
        </Card>

        {/* Top Products */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 p-6">
          <div>
            <p className="text-sm font-medium text-cyan-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Products
            </p>
            <p className="text-xs text-cyan-700 mt-3">Best performing:</p>
            <div className="mt-2 space-y-1">
              {kpis.topProducts?.slice(0, 3).map((product) => (
                <p key={product.id} className="text-xs text-cyan-900 truncate">
                  • {product.name} ({product.sales_qty} sold)
                </p>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top Products Table */}
      {kpis.topProducts && kpis.topProducts.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top 10 Products (Last 30 Days)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">SKU</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Product Name</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Qty Sold</th>
                </tr>
              </thead>
              <tbody>
                {kpis.topProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-600">{product.sku}</td>
                    <td className="px-4 py-2 text-gray-900">{product.name}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-semibold">{product.sales_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reorder Suggestions */}
      {reorderSuggestions.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Reorder Suggestions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">SKU</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Current Stock</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Suggested Order Qty</th>
                </tr>
              </thead>
              <tbody>
                {reorderSuggestions.slice(0, 10).map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-600">{item.sku}</td>
                    <td className="px-4 py-2 text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">{item.current_stock}</td>
                    <td className="px-4 py-2 text-right text-orange-600 font-semibold">{item.suggested_order_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sales Trends */}
      {trends.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Sales Trends (Last 30 Days)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">SKU</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Qty Sold</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 10).map((trend) => (
                  <tr key={trend.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-gray-600">{trend.sku}</td>
                    <td className="px-4 py-2 text-gray-900">{trend.name}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-semibold">{trend.total_qty_sold}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-semibold">₹{trend.total_revenue?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  )
}

export default DashboardPage
