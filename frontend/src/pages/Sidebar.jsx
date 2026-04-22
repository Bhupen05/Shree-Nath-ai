import { 
  LayoutDashboard, 
  Package, 
  ReceiptIndianRupee, 
  Truck, 
  BarChart3, 
  Settings, 
  Plus 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Package, label: 'Inventory', path: '/dashboard/inventory' },
  { icon: ReceiptIndianRupee, label: 'Billing', path: '/dashboard/billing' },
  { icon: Truck, label: 'Suppliers', path: '/dashboard/suppliers' },
  { icon: BarChart3, label: 'Reports', path: '/dashboard/reports' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex flex-col py-8 shadow-ambient z-50">
      <div className="px-8 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-container flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/20">
            S
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-primary leading-none">SIBMS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-1">
              Kinetic Archive v1.0
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center px-6 py-4 rounded-xl transition-all duration-300 group ${
              isActive(item.path)
                ? 'bg-surface-container-lowest text-primary shadow-sm border-l-4 border-primary font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container hover:translate-x-1'
            }`}
          >
            <item.icon className={`mr-4 w-5 h-5 ${isActive(item.path) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-6 mt-auto">
        <button onClick={() => navigate('/billing')} className="w-full py-4 bg-linear-to-b from-primary to-primary-container text-white rounded-2xl font-bold shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span className="tracking-tight">New Invoice</span>
        </button>
      </div>
    </aside>
  );
}
