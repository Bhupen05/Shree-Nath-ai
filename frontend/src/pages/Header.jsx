import { Search, Bell, HelpCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center w-full px-10 py-5 border-b border-outline-variant/10">
      <div className="flex items-center flex-1 max-w-2xl">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search vehicle parts (e.g., 'oil filter for i10')"
            className="w-full bg-surface-container-low border-none rounded-2xl py-3.5 pl-14 pr-6 text-sm focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/50 font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-8 ml-10">
        <div className="flex gap-4">
          <button className="p-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-error rounded-full ring-2 ring-surface"></span>
          </button>
          <button className="p-3 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="h-10 w-px bg-outline-variant/20"></div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-black text-on-surface tracking-tight">Alex Mercer</p>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Warehouse Manager</p>
          </div>
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/manager/100/100" 
              alt="Profile" 
              className="w-11 h-11 rounded-2xl object-cover border-2 border-surface-container shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-lg border-2 border-surface flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
