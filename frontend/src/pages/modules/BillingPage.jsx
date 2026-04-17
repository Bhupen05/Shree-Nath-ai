import { useEffect, useState } from 'react'
import {
  addBillPayment,
  cancelBill,
  confirmBill,
  createBill,
  fetchBills,
  fetchCustomers,
  fetchInventoryParts,
  fetchSuppliers,
  getBillDetail,
} from '../../auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import DataTable from '../../components/ui/DataTable'
import StatusView from '../../components/ui/StatusView'
import { useAuth } from '../../context/AuthContext'

function BillingPage() {
  const { can } = useAuth()
  const canWrite = can('billing:write')
  const [items, setItems] = useState([])
  const [parts, setParts] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedBillDetail, setSelectedBillDetail] = useState(null)
  const [draftForm, setDraftForm] = useState({
    billType: 'SALE',
    partyId: '',
    partId: '',
    quantity: '1',
    unitPrice: '',
    tax: '0',
    discount: '0',
  })
  const [paymentForm, setPaymentForm] = useState({
    billId: '',
    amount: '',
    paymentMode: 'CASH',
    referenceNumber: '',
  })

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [billsData, partData, customerData, supplierData] = await Promise.all([
        fetchBills(),
        fetchInventoryParts(),
        fetchCustomers(),
        fetchSuppliers(),
      ])
      setItems(billsData.items || [])
      setParts(partData.items || [])
      setCustomers(customerData.items || [])
      setSuppliers(supplierData.items || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const partyOptions = draftForm.billType === 'SALE' ? customers : suppliers

  const submitDraft = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!draftForm.partyId || !draftForm.partId || Number(draftForm.quantity) <= 0 || Number(draftForm.unitPrice) <= 0) {
      setActionError('Select party and part, and provide positive quantity and unit price.')
      return
    }

    setBusy(true)
    setActionError('')
    setActionMessage('')

    try {
      const payload = {
        billType: draftForm.billType,
        partyId: Number(draftForm.partyId),
        tax: Number(draftForm.tax || 0),
        discount: Number(draftForm.discount || 0),
        items: [
          {
            partId: Number(draftForm.partId),
            quantity: Number(draftForm.quantity),
            unitPrice: Number(draftForm.unitPrice),
          },
        ],
      }

      const result = await createBill(payload)
      setActionMessage(`Created draft bill ${result.bill.bill_number}`)
      setDraftForm((prev) => ({ ...prev, partyId: '', partId: '', quantity: '1', unitPrice: '' }))
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const executeAction = async (actionFn, successMessage) => {
    setBusy(true)
    setActionError('')
    setActionMessage('')

    try {
      await actionFn()
      setActionMessage(successMessage)
      await load()
    } catch (actionErr) {
      setActionError(actionErr.message)
    } finally {
      setBusy(false)
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!paymentForm.billId || Number(paymentForm.amount) <= 0) {
      setActionError('Select bill and enter a positive payment amount.')
      return
    }

    await executeAction(
      () =>
        addBillPayment(Number(paymentForm.billId), {
          amount: Number(paymentForm.amount),
          paymentMode: paymentForm.paymentMode,
          referenceNumber: paymentForm.referenceNumber || undefined,
        }),
      'Payment recorded successfully.'
    )
  }

  const viewBillDetail = async (id) => {
    try {
      const data = await getBillDetail(id)
      setSelectedBillDetail(data)
    } catch (detailError) {
      setActionError(detailError.message)
    }
  }

  if (loading) {
    return <StatusView mode="loading" title="Loading billing" message="Collecting invoices and payment states..." />
  }

  if (error) {
    return <StatusView mode="error" title="Unable to load billing" message={error} onRetry={load} />
  }

  if (items.length === 0) {
    return <StatusView mode="empty" title="No bills yet" message="As soon as bills are created, they will appear here." />
  }

  return (
    <section className="stack">
      <header className="page-head">
        <p className="eyebrow">Billing</p>
        <h1>Billing Ledger</h1>
      </header>

      {canWrite && (
        <form className="inline-form" onSubmit={submitDraft}>
          <h2>Create Draft Bill</h2>
          <div className="inline-grid">
            <label className="form-field" htmlFor="billType">
              <span>Bill Type</span>
              <select
                id="billType"
                value={draftForm.billType}
                onChange={(event) => setDraftForm((prev) => ({ ...prev, billType: event.target.value, partyId: '' }))}
              >
                <option value="SALE">SALE</option>
                <option value="PURCHASE">PURCHASE</option>
              </select>
            </label>

            <label className="form-field" htmlFor="partyId">
              <span>{draftForm.billType === 'SALE' ? 'Customer' : 'Supplier'}</span>
              <select
                id="partyId"
                value={draftForm.partyId}
                onChange={(event) => setDraftForm((prev) => ({ ...prev, partyId: event.target.value }))}
              >
                <option value="">Select</option>
                {partyOptions.map((party) => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="partId">
              <span>Part</span>
              <select
                id="partId"
                value={draftForm.partId}
                onChange={(event) => setDraftForm((prev) => ({ ...prev, partId: event.target.value }))}
              >
                <option value="">Select</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                ))}
              </select>
            </label>

            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              value={draftForm.quantity}
              onChange={(event) => setDraftForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
            <FormField
              label="Unit Price"
              name="unitPrice"
              type="number"
              value={draftForm.unitPrice}
              onChange={(event) => setDraftForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
            />
            <FormField
              label="Tax"
              name="tax"
              type="number"
              value={draftForm.tax}
              onChange={(event) => setDraftForm((prev) => ({ ...prev, tax: event.target.value }))}
            />
            <FormField
              label="Discount"
              name="discount"
              type="number"
              value={draftForm.discount}
              onChange={(event) => setDraftForm((prev) => ({ ...prev, discount: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create Draft'}</Button>
          </div>
        </form>
      )}

      {canWrite && (
        <form className="inline-form" onSubmit={submitPayment}>
          <h2>Record Payment</h2>
          <div className="inline-grid">
            <label className="form-field" htmlFor="paymentBillId">
              <span>Bill</span>
              <select
                id="paymentBillId"
                value={paymentForm.billId}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, billId: event.target.value }))}
              >
                <option value="">Select</option>
                {items.map((bill) => (
                  <option key={bill.id} value={bill.id}>{bill.bill_number} ({bill.status})</option>
                ))}
              </select>
            </label>

            <FormField
              label="Amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
            />

            <label className="form-field" htmlFor="paymentMode">
              <span>Mode</span>
              <select
                id="paymentMode"
                value={paymentForm.paymentMode}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentMode: event.target.value }))}
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </label>

            <FormField
              label="Reference"
              name="referenceNumber"
              value={paymentForm.referenceNumber}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, referenceNumber: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record Payment'}</Button>
          </div>
        </form>
      )}

      {actionError && <p className="error-box">{actionError}</p>}
      {actionMessage && <p className="success-box">{actionMessage}</p>}

      <DataTable
        title="Recent bills"
        rows={items}
        searchKeys={['bill_number', 'bill_type', 'status']}
        columns={[
          { key: 'bill_number', label: 'Bill No', sortable: true },
          { key: 'bill_type', label: 'Type', sortable: true },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (row) => <span className="pill">{row.status}</span>,
          },
          { key: 'total', label: 'Total', sortable: true },
          { key: 'amount_due', label: 'Due', sortable: true },
          {
            key: 'created_at',
            label: 'Created',
            sortable: true,
            render: (row) => new Date(row.created_at).toLocaleString(),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="row-actions">
                <button onClick={() => viewBillDetail(row.id)}>View</button>
                {canWrite && row.status === 'DRAFT' && (
                  <button
                    onClick={() => executeAction(() => confirmBill(row.id), 'Bill confirmed successfully.')}
                    disabled={busy}
                  >
                    Confirm
                  </button>
                )}
                {canWrite && ['DRAFT', 'CONFIRMED'].includes(row.status) && (
                  <button
                    onClick={() => executeAction(() => cancelBill(row.id), 'Bill cancelled successfully.')}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {selectedBillDetail && (
        <section className="inline-form">
          <h2>Bill Detail: {selectedBillDetail.bill.bill_number}</h2>
          <p className="sub">Type: {selectedBillDetail.bill.bill_type} | Status: {selectedBillDetail.bill.status}</p>
          <p className="sub">Total: {selectedBillDetail.bill.total} | Paid: {selectedBillDetail.bill.amount_paid} | Due: {selectedBillDetail.bill.amount_due}</p>
          <div className="detail-grid">
            <div>
              <h3>Items</h3>
              {selectedBillDetail.items.map((item) => (
                <p key={item.id}>{item.name} ({item.sku}) x {item.quantity} @ {item.unit_price}</p>
              ))}
            </div>
            <div>
              <h3>Payments</h3>
              {selectedBillDetail.payments.length === 0 && <p>No payments yet.</p>}
              {selectedBillDetail.payments.map((payment) => (
                <p key={payment.id}>{payment.amount} via {payment.payment_mode}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </section>
  )
}

export default BillingPage
