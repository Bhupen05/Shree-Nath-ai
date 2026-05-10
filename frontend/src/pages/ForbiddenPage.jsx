import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ShieldOff, ArrowLeft } from 'lucide-react'

function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-error/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 relative z-10 max-w-md"
      >
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-error/10 rounded-3xl flex items-center justify-center border border-error/20 shadow-xl">
            <ShieldOff className="w-12 h-12 text-error" />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-error uppercase tracking-widest mb-2">Access Denied</p>
          <h1 className="text-7xl font-black tracking-tighter text-on-surface mb-3">403</h1>
          <h2 className="text-xl font-black text-on-surface tracking-tight">Insufficient Permissions</h2>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            You do not have permission to access this page. Please contact your system administrator or sign in with a
            different account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 justify-center bg-linear-to-b from-primary to-primary-container text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all text-sm"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 justify-center bg-surface-container-low hover:bg-surface-container text-on-surface font-bold px-6 py-3 rounded-xl transition-colors text-sm border border-outline-variant/20"
          >
            Sign in with different account
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default ForbiddenPage
