import { useEffect, useState } from 'react'
import {
  Archive,
  LineChart,
  Landmark,
  Activity,
  FileText,
  Table,
  Download,
  Share,
  ChevronRight,
  Users,
  Loader,
  RefreshCw,
} from 'lucide-react'
import { motion } from 'motion/react'
import { apiCall } from '../lib/apiClient'

export default function Reports() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState([])
  const [stockValue, setStockValue] = useState('—')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const loadReportsData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiCall('/reports/metrics')
      if (response.data) {
        setReports(response.data.reports || [])
      }
    } catch (err) {
      console.error('Error loading reports data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load dashboard metrics for the stock value figure
  const loadStockValue = async () => {
    try {
      const response = await apiCall('/dashboard/metrics')
      if (response.data?.metrics?.totalStockValue) {
        setStockValue(response.data.metrics.totalStockValue)
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    loadReportsData()
    loadStockValue()
    const interval = setInterval(loadReportsData, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`http://localhost:5000/api/billing/bills?billType=SALE`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Export failed')
      const data = await response.json()
      const rows = data.items || []
      if (rows.length === 0) {
        alert('No data to export.')
        return
      }
      const headers = Object.keys(rows[0]).join(',')
      const csv = [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales_report_${dateFrom}_${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed: ' + err.message)
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-12">
      {/* Page Heading */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-on-surface-variant mb-2 font-bold">
          <span>Archive</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary">Reports Engine</span>
        </nav>
        <h1 className="text-5xl font-black text-on-surface tracking-tighter">System Performance & Reporting</h1>
        <p className="text-on-surface-variant text-sm mt-3 max-w-2xl">
          Generate authoritative data exports from the kinetic ledger.{' '}
          {!isLoading && `(${reports.length} reports available)`}
        </p>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl bg-error-container/10 border border-error/20 p-4 text-on-error-container flex items-center justify-between">
          <p className="text-sm font-medium">⚠️ Unable to load reports data. {error}</p>
          <button onClick={loadReportsData} className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Time Range Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex bg-surface-container rounded-lg p-1 shadow-sm ring-1 ring-outline-variant/10">
          <button className="px-5 py-2 bg-surface text-on-surface rounded-md text-xs font-bold shadow-sm transition-all">
            All Time
          </button>
          <button className="px-5 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
            Custom Range
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Inventory Value Report (Large) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10 flex flex-col justify-between min-h-85"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary rounded-lg mb-4">
                <Archive className="w-4 h-4 mr-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Asset Ledger</span>
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">Inventory Value Report</h3>
              <p className="text-on-surface-variant text-sm mt-3 max-w-md">
                Comprehensive audit of current stock valuation, depreciation metrics, and warehouse turnover velocity.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">Estimated Value</p>
              <p className="text-4xl font-black text-on-surface tracking-tighter">{stockValue}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-on-surface-variant mb-3 block tracking-widest">
                Date Range Selection
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-surface border-none rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 w-full py-2.5 px-3 outline-none"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-surface border-none rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/30 w-full py-2.5 px-3 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-initial bg-surface-container hover:bg-surface-container-high text-on-surface py-2.5 px-6 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-initial bg-linear-to-b from-primary to-primary-container text-white py-2.5 px-8 rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <Table className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sales Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10 flex flex-col"
        >
          <div className="flex-1">
            <div className="inline-flex items-center px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg mb-4">
              <LineChart className="w-4 h-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Revenue Stream</span>
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Sales Summary</h3>
            <p className="text-on-surface-variant text-sm mt-3">
              Aggregate transaction analysis including gross margins and tax collection totals.
            </p>
            <div className="mt-8 p-4 bg-surface rounded-xl border border-outline-variant/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Q2 Target</span>
                <span className="text-xs font-black text-primary">82%</span>
              </div>
              <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '82%' }} transition={{ duration: 1, delay: 0.5 }} className="bg-primary h-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant mb-3 block tracking-widest">Quick Export</label>
            <button
              onClick={handleExportCSV}
              className="w-full border-2 border-primary/20 text-primary hover:bg-primary/5 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Monthly Report
            </button>
          </div>
        </motion.div>

        {/* Tax & GST Report */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 md:col-span-6 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10 flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center px-3 py-1.5 bg-tertiary/10 text-tertiary rounded-lg mb-4">
              <Landmark className="w-4 h-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Compliance</span>
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Tax & GST Report</h3>
            <p className="text-on-surface-variant text-sm mt-3">
              Detailed breakdown of jurisdictional tax obligations for government filing.
            </p>
          </div>
          <div className="mt-8 flex gap-3">
            <select className="flex-1 bg-surface border-none rounded-lg text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/30 py-2.5 px-4 outline-none appearance-none">
              <option>FY 2026-27</option>
              <option>FY 2025-26</option>
            </select>
            <button className="bg-surface-container hover:bg-surface-container-high p-2.5 rounded-lg transition-colors flex items-center justify-center text-primary">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Employee Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 md:col-span-6 bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-outline-variant/10 flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center px-3 py-1.5 bg-surface-container text-primary rounded-lg mb-4">
              <Activity className="w-4 h-4 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Operations</span>
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Employee Activity</h3>
            <p className="text-on-surface-variant text-sm mt-3">
              Performance logs and system interaction records for all active warehouse personnel.
            </p>
          </div>
          <div className="mt-8 flex gap-3">
            <div className="flex-1 relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <select className="w-full bg-surface border-none rounded-lg text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/30 py-2.5 pl-10 pr-4 outline-none appearance-none">
                <option>All Departments</option>
                <option>Logistics</option>
                <option>Sales</option>
              </select>
            </div>
            <button className="bg-surface-container hover:bg-surface-container-high p-2.5 rounded-lg transition-colors flex items-center justify-center text-primary">
              <Share className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Archives Section */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-on-surface-variant mb-6">Recent Archives</h2>
        <div className="overflow-hidden rounded-2xl border border-outline-variant/10 shadow-ambient bg-surface-container-lowest">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64 w-full">
                <Loader size={32} className="animate-spin text-primary" />
              </div>
            ) : reports && reports.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-low/30 border-b border-outline-variant/10">
                    <th className="px-8 py-4">Report Name</th>
                    <th className="px-8 py-4">Generated By</th>
                    <th className="px-8 py-4">Format</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-outline-variant/10">
                  {reports.map((item, i) => (
                    <tr key={item.id || i} className="group transition-colors hover:bg-surface-container-low/20">
                      <td className="px-8 py-5 font-bold text-on-surface">{item.name}</td>
                      <td className="px-8 py-5 text-on-surface-variant">{item.generatedBy || 'System'}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] shadow-sm ${
                          item.format === 'CSV' ? 'bg-primary/10 text-primary'
                          : item.format === 'PDF' ? 'bg-error/10 text-error'
                          : 'bg-secondary/10 text-secondary'
                        }`}>
                          {item.format}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`flex items-center gap-2 font-bold ${item.status === 'Processing' ? 'text-on-surface-variant' : 'text-primary'}`}>
                          <div className={`w-2 h-2 rounded-full ${item.status === 'Processing' ? 'bg-on-surface-variant animate-pulse' : 'bg-primary'}`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => item.status !== 'Processing' && handleExportCSV()}
                          className={`font-bold transition-all ${item.status === 'Processing' ? 'text-on-surface-variant cursor-not-allowed opacity-50' : 'text-primary hover:underline underline-offset-2'}`}
                          disabled={item.status === 'Processing'}
                        >
                          {item.status === 'Processing' ? 'Processing...' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 w-full text-on-surface-variant gap-3">
                <Archive size={32} className="opacity-30" />
                <p className="text-sm font-medium">No reports available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
