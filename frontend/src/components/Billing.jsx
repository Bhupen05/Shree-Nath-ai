import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { FileText, Plus, Printer, ReceiptIndianRupee, ScanBarcode, Trash2, Users, XCircle } from 'lucide-react'
import {
  addBillPayment,
  cancelBill,
  confirmBill,
  createBill,
  downloadInvoicePdf,
  fetchBills,
  fetchCustomers,
  fetchInventoryParts,
  fetchSuppliers,
} from '../auth'

export default function Billing({ autoTaxEnabled = true }) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [lineItems, setLineItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [parts, setParts] = useState([])
  const [bills, setBills] = useState([])
  const [billType, setBillType] = useState('SALE')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedPartId, setSelectedPartId] = useState('')
  const [skuInput, setSkuInput] = useState('')
  const [selectedQty, setSelectedQty] = useState('1')
  const [billDate, setBillDate] = useState(todayIso)
  const [paymentTerm, setPaymentTerm] = useState('FULL')
  const [dueDate, setDueDate] = useState('')
  const [selectedBillId, setSelectedBillId] = useState('')
  const [selectedPaymentBillId, setSelectedPaymentBillId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const partBySku = useMemo(() => {
    return new Map(parts.map((part) => [String(part.sku).toUpperCase(), part]))
  }, [parts])

  const billsById = useMemo(() => {
    return new Map(bills.map((bill) => [String(bill.id), bill]))
  }, [bills])

  const paymentEligibleBills = useMemo(() => {
    return bills.filter((bill) => ['CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status))
  }, [bills])

  const billSummary = useMemo(() => {
    const total = bills.length
    const completed = bills.filter((bill) => bill.status === 'PAID').length
    const pending = bills.filter((bill) => ['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status)).length
    return { total, completed, pending }
  }, [bills])

  const isSaleBill = billType === 'SALE'
  const selectedPartyId = isSaleBill ? selectedCustomerId : selectedSupplierId
  const partyLabel = isSaleBill ? 'Customer' : 'Supplier'

  const ensureCreditDueDate = () => {
    if (dueDate) {
      return
    }

    const next30 = new Date()
    next30.setDate(next30.getDate() + 30)
    setDueDate(next30.toISOString().slice(0, 10))
  }

  const handleBillTypeChange = (event) => {
    const nextBillType = event.target.value
    setBillType(nextBillType)

    if (nextBillType !== 'SALE') {
      setPaymentTerm('FULL')
      setDueDate('')
    }
  }

  const handlePaymentTermChange = (nextTerm) => {
    setPaymentTerm(nextTerm)

    if (nextTerm === 'FULL') {
      setDueDate('')
      return
    }

    ensureCreditDueDate()
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const [customerData, supplierData, partData, billData] = await Promise.all([
          fetchCustomers(),
          fetchSuppliers(),
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

        const supplierItems = supplierData.items || []
        setSuppliers(supplierItems)
        if (supplierItems.length > 0) {
          setSelectedSupplierId((prev) => prev || String(supplierItems[0].id))
        }

        setParts(partData.items || [])
        setBills(billData.items || [])
        if ((partData.items || []).length > 0) {
          setSelectedPartId((prev) => prev || String(partData.items[0].id))
        }
        if ((billData.items || []).length > 0) {
          setSelectedBillId((prev) => prev || String(billData.items[0].id))
          setSelectedPaymentBillId((prev) => {
            if (prev) {
              return prev
            }

            const firstEligible = (billData.items || []).find((bill) => ['CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status))
            return firstEligible ? String(firstEligible.id) : ''
          })
        }
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
      const [customerData, supplierData, partData, billData] = await Promise.all([
        fetchCustomers(),
        fetchSuppliers(),
        fetchInventoryParts(),
        fetchBills(),
      ])

      const customerItems = customerData.items || []
      setCustomers(customerItems)
      if (!selectedCustomerId && customerItems.length > 0) {
        setSelectedCustomerId(String(customerItems[0].id))
      }

      const supplierItems = supplierData.items || []
      setSuppliers(supplierItems)
      if (!selectedSupplierId && supplierItems.length > 0) {
        setSelectedSupplierId(String(supplierItems[0].id))
      }

      setParts(partData.items || [])
      setBills(billData.items || [])
      if ((partData.items || []).length > 0) {
        setSelectedPartId((prev) => prev || String(partData.items[0].id))
      }
      if ((billData.items || []).length > 0) {
        setSelectedBillId((prev) => prev || String(billData.items[0].id))
        setSelectedPaymentBillId((prev) => {
          if (prev) {
            return prev
          }

          const firstEligible = (billData.items || []).find((bill) => ['CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status))
          return firstEligible ? String(firstEligible.id) : ''
        })
      }
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load billing data')
    }
  }

  const updateQty = (id, qty) => {
    setLineItems((prev) => prev.map((item) => {
      if (item.id !== id) {
        return item
      }

      const nextQty = Math.max(1, Number(qty || 1))
      if (isSaleBill && nextQty > item.stock) {
        setError(`Insufficient stock for ${item.description}. Available: ${item.stock}`)
        return item
      }

      return { ...item, qty: nextQty }
    }))
  }

  const removeItem = (id) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const subtotal = lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0)
  const totalTax = autoTaxEnabled ? lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice * item.taxRate, 0) : 0
  const grandTotal = subtotal + totalTax

  const addOrMergeLineItem = (matchedPart, quantity) => {
    setLineItems((prev) => {
      const existingItem = prev.find((item) => Number(item.partId) === Number(matchedPart.id))

      if (existingItem) {
        const nextQty = existingItem.qty + quantity
        if (isSaleBill && nextQty > existingItem.stock) {
          setError(`Insufficient stock for ${existingItem.description}. Available: ${existingItem.stock}`)
          return prev
        }

        return prev.map((item) => (item.id === existingItem.id ? { ...item, qty: nextQty } : item))
      }

      if (isSaleBill && quantity > Number(matchedPart.current_stock || 0)) {
        setError(`Insufficient stock for ${matchedPart.name}. Available: ${matchedPart.current_stock || 0}`)
        return prev
      }

      return [
        ...prev,
        {
          id: `${matchedPart.id}-${Date.now()}`,
          partId: matchedPart.id,
          description: matchedPart.name,
          sku: matchedPart.sku,
          stock: Number(matchedPart.current_stock || 0),
          qty: quantity,
          unitPrice: Number(matchedPart.selling_price || 0),
          taxRate: 0.18,
        },
      ]
    })
  }

  const addLineItemFromSelection = () => {
    const matchedPart = parts.find((part) => String(part.id) === String(selectedPartId))
    const quantity = Math.max(1, Number(selectedQty || 1))

    if (!matchedPart) {
      setError('Select a valid part to add to bill')
      return
    }

    addOrMergeLineItem(matchedPart, quantity)
    setSelectedQty('1')
    setSkuInput('')
    setError('')
  }

  const addLineItemFromSku = () => {
    const normalizedSku = String(skuInput || '').trim().toUpperCase()
    const matchedPart = partBySku.get(normalizedSku)
    const quantity = Math.max(1, Number(selectedQty || 1))

    if (!normalizedSku || !matchedPart) {
      setError('Invalid SKU. Scan or enter a valid part SKU.')
      return
    }

    setSelectedPartId(String(matchedPart.id))
    addOrMergeLineItem(matchedPart, quantity)
    setSelectedQty('1')
    setSkuInput('')
    setError('')
  }

  const createDraftBill = async () => {
    setStatusMessage('')
    setError('')

    if (!selectedPartyId) {
      setError(`Select a ${partyLabel.toLowerCase()} before creating bill draft`)
      return
    }

    if (isSaleBill && ['CREDIT', 'PARTIAL'].includes(paymentTerm) && !dueDate) {
      setError('Please set due date for credit/partial sales bill')
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
        billType,
        partyType: isSaleBill ? 'CUSTOMER' : 'SUPPLIER',
        partyId: Number(selectedPartyId),
        billDate: billDate || undefined,
        dueDate: dueDate || undefined,
        items: normalizedItems,
        tax: totalTax,
        discount: 0,
      }

      const data = await createBill(payload)
      setStatusMessage(`Draft created: ${data.bill?.bill_number || 'Unknown bill number'}`)
      setLineItems([])
      if (data.bill?.id) {
        setSelectedBillId(String(data.bill.id))
      }
      await loadBillingData()
    } catch (createError) {
      setError(createError.message || 'Unable to create bill draft')
    }
  }

  const handleConfirmBill = async () => {
    setStatusMessage('')
    setError('')
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
    setStatusMessage('')
    setError('')
    if (!selectedBillId) {
      setError('Select a bill to cancel')
      return
    }

    const selectedBill = billsById.get(String(selectedBillId))
    if (selectedBill?.status === 'PARTIALLY_PAID') {
      setError('Cannot cancel partially paid bill. Refund/reconcile first.')
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
    setStatusMessage('')
    setError('')
    if (!selectedPaymentBillId) {
      setError('Select a bill to add payment')
      return
    }

    if (Number(paymentAmount) <= 0) {
      setError('Enter a valid payment amount')
      return
    }

    const selectedBill = billsById.get(String(selectedPaymentBillId))
    if (!selectedBill || !['CONFIRMED', 'PARTIALLY_PAID'].includes(selectedBill.status)) {
      setError('Payments are only allowed for CONFIRMED or PARTIALLY_PAID bills')
      return
    }

    try {
      await addBillPayment(Number(selectedPaymentBillId), {
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
    setStatusMessage('')
    setError('')
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
    <div className="grid grid-cols-12 gap-6 lg:gap-8">
      <div className="col-span-12 space-y-8 lg:col-span-8">
        <Motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-outline-variant/5 bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-8 flex flex-col gap-2">
            <div className="mb-4 inline-block w-fit rounded-full bg-secondary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-secondary-container">
              Billing Mode Active
            </div>
            <h2 className="text-3xl leading-tight font-bold tracking-tight text-on-surface md:text-5xl">Precision in every quote.</h2>
            <p className="mt-2 max-w-xl text-sm text-on-surface-variant md:text-base">A clean billing workspace designed to reduce cognitive load and keep high-volume billing fast and accurate.</p>
          </div>

          <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-outline-variant/5 pb-4 sm:flex-row sm:items-center">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Transaction Engine</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">ID: #SIB-2024-8902</span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bill Type</label>
              <div className="group relative">
                <div className="flex items-center rounded-lg border-b-2 border-transparent bg-surface-container-highest px-4 py-3 transition-all focus-within:border-primary">
                  <select
                    value={billType}
                    onChange={handleBillTypeChange}
                    className="w-full border-none bg-transparent text-sm font-medium outline-none"
                  >
                    <option value="SALE">Sales Bill (Stock OUT)</option>
                    <option value="PURCHASE">Purchase Bill (Stock IN)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{partyLabel} Selection</label>
              <div className="group relative">
                <div className="flex items-center rounded-lg border-b-2 border-transparent bg-surface-container-highest px-4 py-3 transition-all focus-within:border-primary">
                  <Users size={18} className="mr-3 text-primary" />
                  <select
                    value={selectedPartyId}
                    onChange={(event) => {
                      if (isSaleBill) {
                        setSelectedCustomerId(event.target.value)
                      } else {
                        setSelectedSupplierId(event.target.value)
                      }
                    }}
                    className="w-full border-none bg-transparent text-sm font-medium outline-none"
                  >
                    <option value="">Select {partyLabel.toLowerCase()}</option>
                    {(isSaleBill ? customers : suppliers).map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={loadBillingData} className="absolute top-2 right-2 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95">SYNC</button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Billing Address</label>
              <div className="flex min-h-11.5 items-center rounded-lg bg-surface-container-low px-4 py-3">
                <p className="text-xs italic opacity-60">Search for a customer to auto-populate shipping and tax details.</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(event) => setBillDate(event.target.value)}
                className="w-full rounded-lg border-none bg-surface-container-high py-3 px-3 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-primary"
              />
            </div>
            {isSaleBill && ['CREDIT', 'PARTIAL'].includes(paymentTerm) ? (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Due Date (Credit/Partial)</label>
                <input
                  type="date"
                  value={dueDate}
                  min={billDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-lg border-none bg-surface-container-high py-3 px-3 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : null}
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
            <div className="w-full sm:w-48">
              <input
                type="text"
                placeholder="Scan or type SKU"
                value={skuInput}
                onChange={(event) => setSkuInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addLineItemFromSku()
                  }
                }}
                className="w-full rounded-lg border-none bg-surface-container-high py-3.5 px-3 text-sm font-medium uppercase outline-none transition-all focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-full sm:w-32">
              <input type="number" min="1" value={selectedQty} onChange={(event) => setSelectedQty(event.target.value)} className="w-full rounded-lg border-none bg-surface-container-high py-3.5 px-3 text-sm font-medium outline-none transition-all focus:ring-1 focus:ring-primary" />
            </div>
            <button onClick={addLineItemFromSku} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-transparent px-4 py-3.5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white sm:w-auto">
              <ScanBarcode size={18} />
              Add by SKU
            </button>
            <button onClick={addLineItemFromSelection} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:opacity-90 sm:w-auto">
              <Plus size={18} />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-left">
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

      <div className="col-span-12 space-y-6 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
        <Motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-primary/5 bg-surface-container-highest p-6">
          <h3 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <ReceiptIndianRupee size={16} />
            Payment Scheduling
          </h3>
          <div className="space-y-3">
            <PaymentOption
              id="full"
              title="Full Payment"
              description="Settled immediately via Cash/Wire"
              checked={paymentTerm === 'FULL'}
              onChange={() => handlePaymentTermChange('FULL')}
            />
            <PaymentOption
              id="credit"
              title="On Credit (Net-30)"
              description="Subject to customer credit limit"
              checked={paymentTerm === 'CREDIT'}
              onChange={() => handlePaymentTermChange('CREDIT')}
              disabled={!isSaleBill}
            />
            <PaymentOption
              id="partial"
              title="Partial / Installment"
              description="Advance + Scheduled payouts"
              checked={paymentTerm === 'PARTIAL'}
              onChange={() => handlePaymentTermChange('PARTIAL')}
              disabled={!isSaleBill}
            />
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

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Bill Actions</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wide">
            <div className="rounded-lg bg-surface-container-low px-2 py-2">Total: {billSummary.total}</div>
            <div className="rounded-lg bg-green-50 px-2 py-2 text-green-700">Complete: {billSummary.completed}</div>
            <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-700">Pending: {billSummary.pending}</div>
          </div>
          <div className="mt-3 space-y-3">
            <select value={selectedBillId} onChange={(event) => setSelectedBillId(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select bill for actions</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>{bill.bill_number} - {bill.status}</option>
              ))}
            </select>
            <button onClick={handleConfirmBill} className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Confirm Selected Bill</button>

            <p className="pt-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Payment Entry</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Payment amount" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary" />
              <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} className="rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary">
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>
            <select value={selectedPaymentBillId} onChange={(event) => setSelectedPaymentBillId(event.target.value)} className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select bill for payment</option>
              {paymentEligibleBills.map((bill) => (
                <option key={bill.id} value={bill.id}>{bill.bill_number} - Due Rs {Number(bill.amount_due || 0).toLocaleString()}</option>
              ))}
            </select>
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

function PaymentOption({ id, title, description, checked = false, onChange, disabled = false }) {
  return (
    <label htmlFor={id} className={`group flex items-center gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 transition-all ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:ring-2 hover:ring-primary/20'}`}>
      <input
        type="radio"
        id={id}
        name="payment"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-5 w-5 border-outline-variant/50 text-primary focus:ring-primary"
      />
      <div>
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-[10px] font-medium text-on-surface-variant/60">{description}</p>
      </div>
    </label>
  )
}
