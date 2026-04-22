import { Filter, ListOrdered, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'

// Mock Suppliers Data
const SUPPLIERS_DATA = [
  {
    id: 1,
    name: 'Zenith Steelworks Ltd',
    sku: 'ZSL-ENG-001',
    initials: 'ZS',
    categories: ['Steel', 'Engine'],
    contactPerson: 'Marcus Chen',
    phone: '+45 2847 5931',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Precision Components International',
    sku: 'PCI-ELECT-045',
    initials: 'PC',
    categories: ['Electrical', 'Electronics'],
    contactPerson: 'Elena Rodriguez',
    phone: '+33 1742 8829',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Nordic Logistics Partners',
    sku: 'NLP-LOG-082',
    initials: 'NL',
    categories: ['Logistics', 'Transport'],
    contactPerson: 'Johan Bergström',
    phone: '+46 8129 4521',
    status: 'Active',
  },
  {
    id: 4,
    name: 'Singapore Hydraulics Corp',
    sku: 'SHC-HYD-156',
    initials: 'SH',
    categories: ['Hydraulics', 'Fluids'],
    contactPerson: 'Wei Tan',
    phone: '+65 6274 8819',
    status: 'Inactive',
  },
]

export default function SuppliersTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-container-high/50 bg-white shadow-sm">
      <div className="border-b border-surface-container-low p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface">Logistics Partners</h3>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
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
          {SUPPLIERS_DATA.map((supplier) => (
            <tr key={supplier.id} className="transition-colors hover:bg-surface-container-low/20 group">
              <td className="px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/10 text-xs font-black text-primary">
                    {supplier.initials}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{supplier.name}</p>
                    <p className="text-[10px] font-medium text-on-surface-variant">{supplier.sku}</p>
                  </div>
                </div>
              </td>
              <td className="px-8 py-5">
                <div className="flex gap-1">
                  {supplier.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded bg-surface-container-low px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-on-surface-variant"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-8 py-5 font-medium text-on-surface-variant">{supplier.contactPerson}</td>
              <td className="px-8 py-5 font-mono text-xs text-on-surface-variant">{supplier.phone}</td>
              <td className="px-8 py-5">
                <div className="flex justify-center">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                      supplier.status === 'Active'
                        ? 'bg-primary-container/10 text-primary-container'
                        : 'bg-error/10 text-error'
                    }`}
                  >
                    {supplier.status}
                  </span>
                </div>
              </td>
              <td className="px-8 py-5 text-right">
                <button className="p-2 text-on-surface-variant transition-all opacity-0 hover:text-primary group-hover:opacity-100">
                  <MoreVertical size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between bg-surface-container-low/10 px-8 py-6">
        <p className="text-xs font-medium text-on-surface-variant">
          Showing <span className="font-bold text-on-surface">4</span> of{' '}
          <span className="font-bold text-on-surface">148</span> suppliers
        </p>
        <div className="flex gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-white ring-2 ring-primary/20">
            1
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high">
            2
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high">
            3
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
