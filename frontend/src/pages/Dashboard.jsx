import { useEffect, useState } from 'react'
import {
  Download,
  ArrowRight,
  TrendingUp,
  Calendar,
  Plus,
  Wallet,
  AlertCircle,
  Loader,
} from 'lucide-react'
import { motion } from 'motion/react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { apiCall } from '../lib/apiClient'

const cn = (...classes) => classes.filter(Boolean).join(' ')

export function MetricCard({ title, value, subValue, icon: Icon, trend, variant = 'primary', status, isLoading }) {
  const isError = variant === 'error'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-l-4 p-6 shadow-sm',
        variant === 'primary' && 'border-primary bg-surface-container-lowest',
        variant === 'secondary' && 'border-secondary bg-surface-container-lowest',
        variant === 'error' && 'border-red-500 bg-red-50'
      )}
    >
      {variant === 'primary' && (
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-primary/5" />
      )}

      <div className="mb-4 flex items-start justify-between">
        <p className={cn('text-xs font-bold uppercase tracking-widest', isError ? 'text-red-700' : 'text-on-surface-variant')}>
          {title}
        </p>
        <Icon className={cn(isError ? 'text-red-500' : variant === 'primary' ? 'text-primary-container' : 'text-secondary')} size={20} />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 h-10">
          <Loader size={20} className="animate-spin text-primary" />
          <span className="text-sm text-on-surface-variant">Loading...</span>
        </div>
      ) : (
        <>
          <h3 className={cn('text-4xl font-black tracking-tighter', isError ? 'text-red-900' : 'text-on-surface')}>
            {value}{' '}
            {status && <span className="text-lg font-medium text-on-surface-variant">{status}</span>}
          </h3>

          {trend && (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
              <TrendingUp className="text-sm" size={14} />
              {trend}
            </div>
          )}

          {isError && subValue && (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-red-600">{subValue}</div>
          )}

          {variant === 'secondary' && subValue && (
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              Total Payable: <span className="font-bold text-on-surface">{subValue}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TrendChart({ data = [], isLoading = false }) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-surface-container-lowest p-8 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <h4 className="text-xl font-extrabold tracking-tight text-on-surface">Sales Performance Trend</h4>
        <div className="flex gap-2">
          <span className="cursor-pointer rounded bg-surface-container px-3 py-1 text-[10px] font-bold uppercase transition-colors hover:bg-surface-container-high">
            Daily
          </span>
          <span className="cursor-pointer rounded bg-primary px-3 py-1 text-[10px] font-bold uppercase text-white">
            Weekly
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="min-h-75 flex-1 flex items-center justify-center">
          <Loader size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="min-h-75 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00346f" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#00346f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#c2c6d3' }} dy={10} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="sales" stroke="#00346f" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="target" stroke="#abc7ff" strokeWidth={3} strokeDasharray="5 5" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function InboundFeed({ updates = [] }) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-surface-container p-6 shadow-sm">
      <h4 className="mb-6 text-lg font-extrabold tracking-tight text-on-surface">Stock Inbound Feed</h4>
      <div className="flex-1 space-y-6">
        {updates.length > 0 ? (
          updates.map((item, idx) => (
            <div key={item.id || idx} className={cn('flex gap-4', item.faded && 'opacity-60')}>
              <div className={cn('h-12 w-2 rounded-full', item.color || 'bg-primary')} />
              <div>
                <p className="text-xs font-bold text-on-surface-variant">{item.time}</p>
                <p className="text-sm font-bold text-on-surface">{item.title}</p>
                <p className="text-xs font-medium text-on-surface-variant">{item.sub}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-on-surface-variant py-8">
            <p className="text-sm font-medium">No recent updates</p>
          </div>
        )}
      </div>
      <button className="group mt-6 flex items-center gap-1 text-xs font-bold text-primary hover:underline">
        View Detailed Log
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  )
}

export function AssetTable({ assets = [], isLoading = false }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h4 className="text-xl font-extrabold tracking-tight text-on-surface">High-Movement Assets</h4>
          <p className="text-sm text-on-surface-variant">Inventory ranking based on monthly turnover velocity.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container-highest">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container text-[10px] font-black uppercase tracking-widest text-outline-variant">
                <th className="px-2 pb-4">Part Specification</th>
                <th className="px-2 pb-4">SKU Code</th>
                <th className="px-2 pb-4">Velocity</th>
                <th className="px-2 pb-4 text-right">In-Stock</th>
                <th className="px-2 pb-4 text-right">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <tr key={asset.id} className="group transition-colors hover:bg-surface-container-low/50">
                    <td className="px-2 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container', asset.isCritical && 'text-red-500')}>
                          {asset.img ? (
                            <img src={asset.img} alt={asset.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xs font-bold">{asset.name?.[0] || '?'}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{asset.name}</p>
                          <p className="text-[10px] text-on-surface-variant">{asset.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-5">
                      <span className="rounded bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-primary-container">{asset.sku}</span>
                    </td>
                    <td className="px-2 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container">
                          <div
                            className={cn('h-full', asset.isCritical ? 'bg-red-500' : asset.velocity > 50 ? 'bg-primary' : 'bg-secondary')}
                            style={{ width: `${asset.velocity}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-bold', asset.isCritical ? 'text-red-500' : 'text-on-surface')}>
                          {asset.isCritical ? 'CRITICAL' : `${asset.velocity}%`}
                        </span>
                      </div>
                    </td>
                    <td className={cn('px-2 py-5 text-right text-sm font-medium', asset.isCritical && 'font-bold text-red-500')}>
                      {asset.stock}
                    </td>
                    <td className="px-2 py-5 text-right text-sm font-black text-primary">{asset.valuation}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-2 py-12 text-center text-on-surface-variant">
                    <p className="text-sm font-medium">No asset data available. Add inventory items to see them here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [chartData, setChartData] = useState([])
  const [topAssets, setTopAssets] = useState([])
  const [stockUpdates, setStockUpdates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await apiCall('/dashboard/metrics')

        if (response.data) {
          const data = response.data
          setMetrics(data.metrics)

          if (data.salesTrend && Array.isArray(data.salesTrend)) {
            setChartData(data.salesTrend)
          }

          if (data.topProducts && Array.isArray(data.topProducts)) {
            setTopAssets(data.topProducts)
          }

          if (data.recentLogs && Array.isArray(data.recentLogs)) {
            setStockUpdates(data.recentLogs)
          }
        }
      } catch (err) {
        console.error('Dashboard data load error:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative">
      <div className="flex-1 space-y-8 p-8">
        <div className="flex items-end justify-between">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl font-black tracking-tighter text-on-surface">Archive Intelligence</h2>
            <p className="font-medium text-on-surface-variant">Real-time logistics and inventory health overview.</p>
          </motion.div>

          <div className="flex items-center gap-2 rounded-lg bg-surface-container-highest px-4 py-2 text-sm font-bold text-primary">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - Today
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/10 border border-error/20 rounded-lg p-4 text-sm font-medium text-error"
          >
            ⚠️ Unable to load live data. {error}
          </motion.div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <motion.div className="md:col-span-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <MetricCard
              title="Total Stock Value"
              value={metrics?.totalStockValue ?? '—'}
              icon={Plus}
              trend={metrics ? '+12.5% from last period' : undefined}
              variant="primary"
              isLoading={isLoading && !metrics}
            />
          </motion.div>

          <motion.div className="md:col-span-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <MetricCard
              title="Pending Bills"
              value={metrics?.pendingBills != null ? String(metrics.pendingBills) : '—'}
              status="Active"
              subValue={metrics?.pendingBillsValue}
              icon={Wallet}
              variant="secondary"
              isLoading={isLoading && !metrics}
            />
          </motion.div>

          <motion.div className="md:col-span-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <MetricCard
              title="Critical Alerts"
              value={metrics?.criticalAlerts != null ? String(metrics.criticalAlerts).padStart(2, '0') : '—'}
              status="SKUs"
              subValue="Requires immediate replenishment"
              icon={AlertCircle}
              variant="error"
              isLoading={isLoading && !metrics}
            />
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <TrendChart data={chartData} isLoading={isLoading} />
          </motion.div>

          <motion.div className="md:col-span-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <InboundFeed updates={stockUpdates} />
          </motion.div>
        </div>

        {/* Assets Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <AssetTable assets={topAssets} isLoading={isLoading} />
        </motion.div>
      </div>

      {/* FAB Button */}
      <button className="group fixed right-8 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-all hover:scale-110 active:scale-95">
        <Plus size={24} className="transition-transform duration-300 group-hover:rotate-90" />
        <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-on-surface px-3 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
          Add New SKU
        </span>
      </button>
    </section>
  )
}

export default Dashboard
