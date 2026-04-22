import { motion } from 'motion/react'
import {
  Download,
  Plus,
  Globe,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react'
import SuppliersTable from '../components/SuppliersTable'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function Suppliers() {
  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-end justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <span className="h-0.5 w-8 bg-primary" />
            Inventory Logistics
          </div>
          <h1 className="text-4xl font-black tracking-tight text-on-surface">Suppliers Directory</h1>
          <p className="text-sm text-on-surface-variant">Managing 148 active global logistical partners for SIBMS.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-surface-container-low">
            <Download size={18} />
            Export List
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-linear-to-b from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-primary/20">
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-12 gap-6"
      >
        <motion.div
          variants={itemVariants}
          className="col-span-12 rounded-2xl border-b-4 border-primary/20 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Core Fleet Suppliers
          </p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-primary">82</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/10 text-primary">
              <Globe size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="rounded bg-primary-container/10 px-1.5 py-0.5 font-bold text-primary">Engine & Powertrain</span>
            <span className="text-on-surface-variant">Primary focus</span>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-12 rounded-2xl border-b-4 border-secondary/20 bg-white p-6 shadow-sm lg:col-span-5"
        >
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Supply Reliability Index
          </p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-secondary">98.4%</span>
            <div className="flex items-end gap-1 h-8">
              <div className="h-4 w-2 animate-pulse rounded-full bg-secondary/20" />
              <div className="h-6 w-2 animate-pulse rounded-full bg-secondary/40 delay-75" />
              <div className="h-8 w-2 animate-pulse rounded-full bg-secondary delay-150" />
              <div className="h-5 w-2 animate-pulse rounded-full bg-secondary/60 delay-100" />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-medium text-on-surface-variant">
            +2.1% improvement from last quarter audit
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-12 relative overflow-hidden rounded-2xl bg-on-surface p-6 text-white shadow-lg lg:col-span-3"
        >
          <div className="relative z-10">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-primary-container">Pending Audits</p>
            <span className="text-4xl font-black">04</span>
            <p className="mt-4 text-[10px] font-medium leading-relaxed text-white/60">
              System requires quarterly review for Tier-1 electrical vendors.
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <ShieldCheck size={120} strokeWidth={1} />
          </div>
        </motion.div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-x-auto"
      >
        <SuppliersTable />
      </motion.div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-12 gap-8 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 relative overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-high/20 p-8 group xl:col-span-8"
        >
          <div className="relative z-10 flex flex-col gap-6 md:flex-row">
            <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl shadow-2xl">
              <img
                src="https://picsum.photos/seed/warehouse/300/300"
                alt="Warehouse"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-black tracking-tight text-on-surface">Suppliers Optimization Audit</h4>
              <p className="max-w-lg text-sm leading-relaxed text-on-surface-variant">
                Our latest analytical report suggests consolidating Tier-3 electrical suppliers to reduce overhead by 12.4%. Tier-1
                partners are currently maintaining peak SLA compliance.
              </p>
              <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary transition-transform group-hover:translate-x-2">
                View Full Logistics Report
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-12 flex flex-col justify-between rounded-3xl bg-primary p-6 text-white xl:col-span-4"
        >
          <div className="space-y-4">
            <Activity size={32} className="opacity-50" />
            <h4 className="text-lg font-black leading-tight">Global Inventory Reach</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span>Europe</span>
                <span>65%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1, delay: 1 }}
                  className="h-full bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span>APAC</span>
                <span>25%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '25%' }}
                  transition={{ duration: 1, delay: 1.2 }}
                  className="h-full bg-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
