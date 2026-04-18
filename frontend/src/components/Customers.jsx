import { useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { Building2, CreditCard, Mail, Phone, Search, UserPlus } from 'lucide-react'
import { useEffect } from 'react'
import { createCustomer, fetchCustomers } from '../auth'

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
  })

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const data = await fetchCustomers()
        if (!cancelled) {
          setCustomers(data.items || [])
          setError('')
          setMessage('')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load customers')
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  const loadCustomers = async () => {
    setError('')
    try {
      const data = await fetchCustomers()
      setCustomers(data.items || [])
      setMessage('Customers synced from backend')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load customers')
    }
  }

  const handleCreateCustomer = async () => {
    setError('')
    setMessage('')

    try {
      await createCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        creditLimit: Number(form.creditLimit || 0),
      })

      setForm({ name: '', phone: '', email: '', address: '', creditLimit: '' })
      setMessage('Customer created successfully')
      await loadCustomers()
    } catch (createError) {
      setError(createError.message || 'Unable to create customer')
    }
  }

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <Motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <div className="mb-2 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
            Client Relations
          </div>
          <h2 className="text-4xl font-black leading-tight tracking-tighter text-on-surface md:text-6xl">Client Base.</h2>
        </div>
        <button onClick={loadCustomers} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95">
          <UserPlus size={20} />
          Refresh Clients
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p> : null}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-outline-variant/10 bg-white p-4 md:grid-cols-5">
        <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Customer name" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        <input value={form.creditLimit} type="number" onChange={(event) => setForm((prev) => ({ ...prev, creditLimit: event.target.value }))} placeholder="Credit limit" className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
        <button onClick={handleCreateCustomer} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">Add Customer</button>
        <input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address" className="md:col-span-5 rounded-lg border border-outline-variant/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant/40" size={20} />
        <input
          type="text"
          placeholder="Filter by client name, organization or contact details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-outline-variant/10 bg-white py-4 pr-4 pl-12 text-sm font-medium shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {filtered.map((customer) => (
            <Motion.div key={customer.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group rounded-2xl border border-outline-variant/10 bg-white p-6 shadow-sm transition-all hover:border-primary/20">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-lg font-black text-primary">
                  {customer.name.charAt(0)}
                </div>
                <div className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${Number(customer.outstanding_balance || 0) > Number(customer.credit_limit || 0) && Number(customer.credit_limit || 0) > 0 ? 'bg-red-50 text-red-500' : 'bg-secondary/10 text-secondary'}`}>
                  {Number(customer.outstanding_balance || 0) > Number(customer.credit_limit || 0) && Number(customer.credit_limit || 0) > 0 ? 'credit risk' : 'active'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg leading-tight font-bold text-on-surface">{customer.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant/60">
                    <Building2 size={12} />
                    {(customer.address || 'Address unavailable').slice(0, 40)}
                  </div>
                </div>

                <div className="space-y-2 border-y border-outline-variant/5 py-4">
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant/70">
                    <Mail size={14} /> {customer.email}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant/70">
                    <Phone size={14} /> {customer.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Credit Limit</p>
                    <div className="flex items-center gap-2 font-bold text-on-surface">
                      <CreditCard size={14} className="text-primary" />
                      Rs {Number(customer.credit_limit || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Outstanding</p>
                    <p className="font-bold text-on-surface">Rs {Number(customer.outstanding_balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Motion.div>
  )
}
