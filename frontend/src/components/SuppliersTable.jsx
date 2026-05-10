import { Filter, ListOrdered, MoreVertical, ChevronLeft, ChevronRight, Loader } from 'lucide-react'

export default function SuppliersTable({ suppliers = [], isLoading = false, onRefresh }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-container-high/50 bg-white shadow-sm">
      <div className="border-b border-surface-container-low p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">Logistics Partners</h3>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
              <Filter size={18} />
            </button>
            <button className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
              <ListOrdered size={18} />
            </button>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-left">
        <thead className="bg-surface-container-low/30">
          <tr>
            {['Name', 'Category', 'Contact Person', 'Phone', 'Status', ''].map((header) => (
              <th
                key={header}
                className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container-low/50 text-sm">
          {isLoading ? (
            <tr>
              <td colSpan="6" className="px-8 py-12 text-center">
                <Loader size={24} className="animate-spin text-primary mx-auto" />
              </td>
            </tr>
          ) : suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <tr key={supplier.id} className="transition-colors hover:bg-surface-container-low/20 group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-xs font-black text-primary">
                      {(supplier.name || 'NA').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{supplier.name}</p>
                      <p className="text-[10px] font-medium text-on-surface-variant">{supplier.phone || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="rounded bg-surface-container-low px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant">
                    {supplier.category || 'General'}
                  </span>
                </td>
                <td className="px-8 py-5 font-medium text-on-surface-variant">{supplier.contactPerson || '—'}</td>
                <td className="px-8 py-5 font-mono text-xs text-on-surface-variant">{supplier.phone || '—'}</td>
                <td className="px-8 py-5">
                  <div className="flex justify-center">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                        supplier.status === 'Active' || supplier.status === 'ACTIVE'
                          ? 'bg-primary-container/10 text-primary-container'
                          : 'bg-error/10 text-error'
                      }`}
                    >
                      {supplier.status || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <button className="p-2 text-on-surface-variant transition-all opacity-0 hover:text-primary group-hover:opacity-100">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-8 py-12 text-center text-on-surface-variant">
                <p className="text-sm font-medium">No suppliers found. Add your first supplier above.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between bg-surface-container-low/10 px-8 py-6">
        <p className="text-xs font-medium text-on-surface-variant">
          Showing <span className="font-bold text-on-surface">{suppliers.length}</span> suppliers
        </p>
        <div className="flex gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-white ring-2 ring-primary/20">
            1
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
