import { useEffect, useState } from 'react'
import { motion as Motion } from 'motion/react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Package, TrendingUp, Users } from 'lucide-react'
import { fetchDashboardKpis } from '../auth'

const data = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
]

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchDashboardKpis()
        setKpis(data.kpis || null)
      } catch (loadError) {
        setError(loadError.message || 'Unable to load KPI data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="mb-6 flex flex-col gap-2">
        <div className="mb-2 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
          Operations Overview
        </div>
        <h2 className="text-4xl font-black leading-tight tracking-tighter text-on-surface md:text-6xl">System Vitals.</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPIItem icon={<TrendingUp size={20} />} label="Users" value={loading ? '...' : String(kpis?.users_count ?? 0)} />
        <KPIItem icon={<Users size={20} />} label="Customers" value={loading ? '...' : String(kpis?.customers_count ?? 0)} />
        <KPIItem icon={<Package size={20} />} label="Parts" value={loading ? '...' : String(kpis?.parts_count ?? 0)} />
        <KPIItem icon={<AlertTriangle size={20} className="text-red-500" />} label="Bills" value={loading ? '...' : String(kpis?.bills_count ?? 0)} urgent />
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/10 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-primary">Weekly Revenue Trends</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84a98c" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#84a98c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#84a98c" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/10 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-primary">Recent Activity</h3>
          <div className="space-y-6">
            <ActivityItem title="Order #8902 Confirmed" time="2 mins ago" desc="Hydraulic Pump Unit x2" />
            <ActivityItem title="Stock Alert: Reinforcement Rods" time="15 mins ago" desc="Level dropped below minimum (12mm)" status="warning" />
            <ActivityItem title="New Client Registered" time="1 hour ago" desc="Precision Machining Ltd." />
            <ActivityItem title="Payment Received" time="3 hours ago" desc="Invoice #8894 - Rs 45,000" />
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

function KPIItem({ icon, label, value, growth, urgent = false }) {
  return (
    <div className={`rounded-2xl border border-outline-variant/10 bg-white p-6 shadow-sm transition-all hover:scale-[1.02] ${urgent ? 'ring-2 ring-red-100 dark:ring-red-900/20' : ''}`}>
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${urgent ? 'bg-red-50 text-red-500' : 'bg-surface-container text-primary'}`}>
        {icon}
      </div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-xl font-black text-on-surface">{value}</h4>
        {growth && <span className={`text-[10px] font-black ${growth.startsWith('+') ? 'text-secondary' : 'text-red-500'}`}>{growth}</span>}
      </div>
    </div>
  )
}

function ActivityItem({ title, time, desc, status }) {
  return (
    <div className="relative border-l-2 border-outline-variant/10 pb-2 pl-6 last:pb-0">
      <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${status === 'warning' ? 'bg-orange-500' : 'bg-primary'}`} />
      <p className="mb-1 text-[10px] font-black uppercase text-on-surface-variant/40">{time}</p>
      <h5 className="mb-1 text-sm leading-none font-bold text-on-surface">{title}</h5>
      <p className="text-xs text-on-surface-variant/60">{desc}</p>
    </div>
  )
}
