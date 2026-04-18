import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { FileText, Plus, Printer, ReceiptIndianRupee, ScanBarcode, Trash2, Users, XCircle } from 'lucide-react'
import { addBillPayment, cancelBill, confirmBill, createBill, downloadInvoicePdf, fetchBills, fetchCustomers, fetchInventoryParts } from '../auth'

export default function Billing({ autoTaxEnabled = true }) {
  const [lineItems, setLineItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [parts, setParts] = useState([])
  const [bills, setBills] = useState([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedPartId, setSelectedPartId] = useState('')
  const [selectedQty, setSelectedQty] = useState('1')
  const [selectedBillId, setSelectedBillId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const partBySku = useMemo(() => {
    return new Map(parts.map((part) => [String(part.sku).toUpperCase(), part]))
  }, [parts])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const [customerData, partData, billData] = await Promise.all([
          fetchCustomers(),
          fetchInventoryParts(),
          fetchBills(),
        ])

        if (cancelled) {
          return
        }

        const customerItems = customerData.items || []
        setCustomers(customerItems)
        if (customerItems.length > 0) {
          setSelectedCustomerId((prev) => prev || String(customerItems[0].id))
        }

        setParts(partData.items || [])
        setBills(billData.items || [])
        setError('')
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load billing data')
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [])

  const loadBillingData = async () => {
    setError('')
    try {
      const [customerData, partData, billData] = await Promise.all([
        fetchCustomers(),
        fetchInventoryParts(),
        fetchBills(),
      ])

      const customerItems = customerData.items || []
      setCustomers(customerItems)
      if (!selectedCustomerId && customerItems.length > 0) {
        setSelectedCustomerId(String(customerItems[0].id))
      }

      setParts(partData.items || [])
      setBills(billData.items || [])
      if ((partData.items || []).length > 0) {
        setSelectedPartId((prev) => prev || String(partData.items[0].id))
      }
      if ((billData.items || []).length > 0) {
        setSelectedBillId((prev) => prev || String(billData.items[0].id))
      }
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load billing data')
    }
  }

  const updateQty = (id, qty) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, qty: Math.max(0, qty) } : item)))
  }

  const removeItem = (id) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const subtotal = lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0)
  const totalTax = autoTaxEnabled ? lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice * item.taxRate, 0) : 0
  const grandTotal = subtotal + totalTax

  const addLineItemFromSelection = () => {
    const matchedPart = parts.find((part) => String(part.id) === String(selectedPartId))
    const quantity = Math.max(1, Number(selectedQty || 1))

    if (!matchedPart) {
      setError('Select a valid part to add to bill')
      return
    }

    setLineItems((prev) => [
      ...prev,
      {
        id: `${matchedPart.id}-${Date.now()}`,
        description: matchedPart.name,
        sku: matchedPart.sku,
        stock: Number(matchedPart.current_stock || 0),
        qty: quantity,
        unitPrice: Number(matchedPart.selling_price || 0),
        taxRate: 0.18,
      },
    ])
    setError('')
  }

  const createDraftBill = async () => {
    setStatusMessage('')
    setError('')

    if (!selectedCustomerId) {
      setError('Select a customer before creating bill draft')
      return
    }

    const normalizedItems = []

    if (lineItems.length === 0) {
      setError('Add at least one line item before creating bill')
      return
    }

    for (const item of lineItems) {
      const matchedPart = partBySku.get(String(item.sku).toUpperCase())
      if (!matchedPart) {
        setError(`No backend part found for SKU ${item.sku}`)
        return
      }

      normalizedItems.push({
        partId: matchedPart.id,
        quantity: item.qty,
        unitPrice: item.unitPrice,
      })
    }

    try {
      const payload = {
        billType: 'SALE',
        partyType: 'CUSTOMER',
        partyId: Number(selectedCustomerId),
        items: normalizedItems,
        tax: totalTax,
        discount: 0,
      }

      const data = await createBill(payload)
      setStatusMessage(`Draft created: ${data.bill?.bill_number || 'Unknown bill number'}`)
      await loadBillingData()
    } catch (createError) {
      setError(createError.message || 'Unable to create bill draft')
    }
  }

  const handleConfirmBill = async () => {
    if (!selectedBillId) {
      setError('Select a bill to confirm')
      return
    }

    try {
      await confirmBill(Number(selectedBillId))
      setStatusMessage('Bill confirmed successfully')
      await loadBillingData()
    } catch (confirmError) {
      setError(confirmError.message || 'Unable to confirm bill')
    }
  }

  const handleCancelBill = async () => {
    if (!selectedBillId) {
      setError('Select a bill to cancel')
      return
    }

    try {
      await cancelBill(Number(selectedBillId))
      setStatusMessage('Bill cancelled successfully')
      await loadBillingData()
    } catch (cancelError) {
      setError(cancelError.message || 'Unable to cancel bill')
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedBillId) {
      setError('Select a bill to add payment')
      return
    }

    try {
      await addBillPayment(Number(selectedBillId), {
        amount: Number(paymentAmount),
        paymentMode,
      })
      setStatusMessage('Payment recorded successfully')
      setPaymentAmount('')
      await loadBillingData()
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to add payment')
    }
  }

  const handleDownloadInvoice = async () => {
    if (!selectedBillId) {
      setError('Select a bill to download invoice')
      return
    }

    try {
      const blob = await downloadInvoicePdf(Number(selectedBillId))
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatusMessage('Invoice opened in new tab')
    } catch (downloadError) {
      setError(downloadError.message || 'Unable to download invoice')
    }
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 space-y-8 lg:col-span-8">
        <Motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-10 flex flex-col gap-2">
            <div className="mb-4 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
              Billing Mode Active
            </div>
            <h2 className="text-[64px] leading-[0.95] font-bold tracking-[-0.04em] text-on-surface md:text-[112px]">Precision in every quote.</h2>
            <p className="mt-4 max-w-xl text-lg text-on-surface-variant">A minimalist approach to industrial billing, designed to reduce cognitive load and enhance your warehouse throughput.</p>
          </div>

          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-outline-variant/5 pb-4 sm:flex-row sm:items-center">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Transaction Engine</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">ID: #SIB-2024-8902</span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Customer Selection</label>
              <div className="group relative">
                <div className="flex items-center rounded-lg border-b-2 border-transparent bg-surface-container-highest px-4 py-3 transition-all focus-within:border-primary">
                  <Users size={18} className="mr-3 text-primary" />
                  <select
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    className="w-full border-none bg-transparent text-sm font-medium outline-none"
                  >
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={loadBillingData} className="absolute top-2 right-2 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95">SYNC</button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Billing Address</label>
              <div className="flex min-h-[46px] items-center rounded-lg bg-surface-container-low px-4 py-3">
                <p className="text-xs italic opacity-60">Search for a customer to auto-populate shipping and tax details.</p>
              </div>
            </div>
          </div>
        </Motion.section>

        <Motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-outline-variant/5 bg-surface-container-low p-6">
          <div className="mb-6 flex items-center gap-3">
            <ReceiptIndianRupee size={20} className="text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Inventory Line Items</h3>
          </div>

          <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-4 shadow-sm sm:flex-row">
            <div className="relative w-full flex-1">
              <ScanBarcode className="absolute top-3.5 left-4 text-primary opacity-60" size={20} />
              <select value={selectedPartId} onChange={(event) => setSelectedPartId(event.target.value)} className="w-full rounded-lg border-none bg-surface-container-high py-3.5 pl-12 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-primary">
                <option value="">Select part by SKU</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-32">
              <input type="number" min="1" value={selectedQty} onChange={(event) => setSelectedQty(event.target.value)} className="w-full rounded-lg border-none bg-surface-container-high py-3.5 px-3 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-primary" />
            </div>
            <button onClick={addLineItemFromSelection} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:opacity-90 sm:w-auto">
              <Plus size={18} />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                  <th className="px-4 pb-4 font-bold">Part Description</th>
                  <th className="pb-4 font-bold">Qty</th>
                  <th className="pb-4 text-right font-bold">Unit Price</th>
                  <th className="pb-4 text-right font-bold">Tax (18%)</th>
                  <th className="pb-4 text-right font-bold">Line Total</th>
                  <th className="w-12 pb-4 font-bold" />
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                  {lineItems.map((item) => (
                    <Motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group border-b border-outline-variant/5 transition-colors hover:bg-surface-bright"
                    >
                      <td className="px-4 py-5">
                        <div className="font-bold text-on-surface">{item.description}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-on-surface-variant/60">
                          <span>SKU: {item.sku}</span>
                          <span className="h-1 w-1 rounded-full bg-outline-variant" />
                          <span className={`${item.stock < 5 ? 'rounded-full bg-secondary px-3 py-0.5 text-[9px] font-black uppercase text-secondary-container' : 'font-bold text-primary'}`}>
                            {item.stock < 5 ? 'Limited Inventory' : 'System Stock'}: {item.stock}
                          </span>
                        </div>
                      </td>
                      <td className="py-5">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateQty(item.id, parseInt(e.target.value, 10) || 0)}
                          className="w-16 rounded-lg border-none bg-surface-container-highest py-2 text-center text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="py-5 text-right font-medium">Rs {item.unitPrice.toLocaleString()}</td>
                      <td className="py-5 text-right text-on-surface-variant/60">Rs {(item.unitPrice * item.qty * item.taxRate).toLocaleString()}</td>
                      <td className="py-5 text-right font-bold text-primary">Rs {(item.unitPrice * item.qty * (1 + item.taxRate)).toLocaleString()}</td>
                      <td className="py-5 text-center">
                        <button onClick={() => removeItem(item.id)} className="rounded-lg p-2 text-red-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50/50 hover:text-red-500 dark:hover:bg-red-950/20">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </Motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {statusMessage ? <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{statusMessage}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        </Motion.section>
      </div>

      <div className="col-span-12 space-y-6 lg:col-span-4">
        <Motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-primary/5 bg-surface-container-highest p-6">
          <h3 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <ReceiptIndianRupee size={16} />
            Payment Scheduling
          </h3>
          <div className="space-y-3">
            <PaymentOption id="full" title="Full Payment" description="Settled immediately via Cash/Wire" defaultChecked />
            <PaymentOption id="credit" title="On Credit (Net-30)" description="Subject to customer credit limit" />
            <PaymentOption id="partial" title="Partial / Installment" description="Advance + Scheduled payouts" />
          </div>
        </Motion.section>

        <Motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-2xl shadow-primary/30">
          <div className="absolute -right-4 -bottom-4 rotate-12 opacity-10">
            <ReceiptIndianRupee size={120} />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider opacity-70">
              <span>Subtotal (Excl. Tax)</span>
              <span>Rs {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider opacity-70">
              <span>GST (Total 18%)</span>
              <span>Rs {totalTax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-secondary-container">
              <span>Applied Discount</span>
              <span>- Rs 0.00</span>
            </div>

            <div className="mt-4 border-t border-white/20 pt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Grand Total</p>
                  <p className="text-4xl font-black tracking-tighter">Rs {grandTotal.toLocaleString()}</p>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase">INR</span>
              </div>
            </div>
          </div>
        </Motion.section>

        <div className="flex flex-col gap-3">
          <button onClick={loadBillingData} className="group flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/10 bg-surface-container-high py-4 font-bold text-on-surface transition-all hover:bg-surface-container-highest active:scale-[0.98]">
            <FileText size={20} className="transition-transform group-hover:-translate-y-0.5" />
            Reload Billing
          </button>
          <button onClick={createDraftBill} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-95 active:scale-[0.98]">
            <FileText size={20} />
            Create Bill Draft
          </button>
        </div>

        <div className="flex justify-between px-2 pt-2">
          <button onClick={handleDownloadInvoice} className="flex items-center gap-2 text-xs font-bold text-primary transition-all hover:underline">
            <Printer size={14} /> Print Receipt
          </button>
          <button onClick={handleCancelBill} className="flex items-center gap-2 text-xs font-bold text-red-500 transition-all hover:underline">
            <XCircle size={14} /> Void Order
          </button>
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Latest Bills</p>
          <div className="mt-3 space-y-2">
            <select value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select bill</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>{bill.bill_number} - {bill.status}</option>
              ))}
            </select>
            <button onClick={handleConfirmBill} className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Confirm Selected Bill</button>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Payment amount" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
              <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary">
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>
            <button onClick={handleRecordPayment} className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface">Record Payment</button>
          </div>
          <div className="mt-3 space-y-2">
            {bills.slice(0, 5).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-xs">
                <span className="font-bold">{bill.bill_number}</span>
                <span>{bill.status}</span>
                <span>Rs {Number(bill.amount_due || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentOption({ id, title, description, defaultChecked = false }) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer items-center gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 transition-all hover:ring-2 hover:ring-primary/20">
      <input type="radio" id={id} name="payment" defaultChecked={defaultChecked} className="h-5 w-5 border-outline-variant/50 text-primary focus:ring-primary" />
      <div>
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-[10px] font-medium text-on-surface-variant/60">{description}</p>
      </div>
    </label>
  )
}
