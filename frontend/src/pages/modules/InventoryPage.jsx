import { useEffect, useState } from 'react'
import {
  createPart,
  createStockAdjustment,
  createStockTransfer,
  fetchInventoryParts,
  fetchLocationTree,
} from '../../auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import DataTable from '../../components/ui/DataTable'
import StatusView from '../../components/ui/StatusView'
import { useAuth } from '../../context/AuthContext'

function InventoryPage() {
  const { can } = useAuth()
  const canWrite = can('inventory:write')
  const [items, setItems] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [partForm, setPartForm] = useState({
    sku: '',
    name: '',
    sellingPrice: '',
    costPrice: '',
    reorderThreshold: '0',
    sectionId: '',
  })
  const [adjustForm, setAdjustForm] = useState({
    partId: '',
    sectionId: '',
    quantityDelta: '',
    reason: '',
  })
  const [transferForm, setTransferForm] = useState({
    partId: '',
    fromSectionId: '',
    toSectionId: '',
    quantity: '',
    reason: '',
  })

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [partData, locationData] = await Promise.all([fetchInventoryParts(), fetchLocationTree()])
      setItems(partData.items || [])

      const flattenedSections = []
      for (const room of locationData.items || []) {
        for (const cabinet of room.cabinets || []) {
          for (const section of cabinet.sections || []) {
            flattenedSections.push({
              id: section.id,
              label: `${room.name} / ${cabinet.name} / ${section.name}`,
            })
          }
        }
      }
      setSections(flattenedSections)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submitPart = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!partForm.sku.trim() || !partForm.name.trim()) {
      setActionError('SKU and Name are required.')
      return
    }

    setBusy(true)
    setActionError('')
    setActionMessage('')
    try {
      await createPart({
        sku: partForm.sku,
        name: partForm.name,
        sellingPrice: Number(partForm.sellingPrice || 0),
        costPrice: Number(partForm.costPrice || 0),
        reorderThreshold: Number(partForm.reorderThreshold || 0),
        sectionId: partForm.sectionId || undefined,
      })

      setActionMessage('Part created successfully.')
      setPartForm({ sku: '', name: '', sellingPrice: '', costPrice: '', reorderThreshold: '0', sectionId: '' })
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const submitAdjustment = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!adjustForm.partId || !adjustForm.quantityDelta || !adjustForm.reason.trim()) {
      setActionError('Part, quantity delta, and reason are required for adjustments.')
      return
    }

    setBusy(true)
    setActionError('')
    setActionMessage('')
    try {
      await createStockAdjustment({
        partId: Number(adjustForm.partId),
        sectionId: adjustForm.sectionId ? Number(adjustForm.sectionId) : undefined,
        quantityDelta: Number(adjustForm.quantityDelta),
        reason: adjustForm.reason,
      })

      setActionMessage('Stock adjustment recorded successfully.')
      setAdjustForm({ partId: '', sectionId: '', quantityDelta: '', reason: '' })
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const submitTransfer = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (
      !transferForm.partId ||
      !transferForm.fromSectionId ||
      !transferForm.toSectionId ||
      !transferForm.quantity ||
      !transferForm.reason.trim()
    ) {
      setActionError('Part, source, destination, quantity, and reason are required for transfers.')
      return
    }

    if (transferForm.fromSectionId === transferForm.toSectionId) {
      setActionError('Source and destination sections must be different.')
      return
    }

    setBusy(true)
    setActionError('')
    setActionMessage('')
    try {
      await createStockTransfer({
        partId: Number(transferForm.partId),
        fromSectionId: Number(transferForm.fromSectionId),
        toSectionId: Number(transferForm.toSectionId),
        quantity: Number(transferForm.quantity),
        reason: transferForm.reason,
      })

      setActionMessage('Stock transfer recorded successfully.')
      setTransferForm({ partId: '', fromSectionId: '', toSectionId: '', quantity: '', reason: '' })
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <StatusView mode="loading" title="Loading inventory" message="Pulling stock records..." />
  }

  if (error) {
    return <StatusView mode="error" title="Unable to load inventory" message={error} onRetry={load} />
  }

  if (items.length === 0) {
    return <StatusView mode="empty" title="No parts yet" message="Create your first part from API/Postman to see it here." />
  }

  return (
    <section className="stack">
      <header className="page-head">
        <p className="eyebrow">Inventory</p>
        <h1>Parts and Stock</h1>
      </header>

      {canWrite && (
        <form className="inline-form" onSubmit={submitPart}>
          <h2>Create Part</h2>
          <div className="inline-grid">
            <FormField
              label="SKU"
              name="sku"
              value={partForm.sku}
              onChange={(event) => setPartForm((prev) => ({ ...prev, sku: event.target.value }))}
            />
            <FormField
              label="Name"
              name="name"
              value={partForm.name}
              onChange={(event) => setPartForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <FormField
              label="Cost Price"
              name="costPrice"
              type="number"
              value={partForm.costPrice}
              onChange={(event) => setPartForm((prev) => ({ ...prev, costPrice: event.target.value }))}
            />
            <FormField
              label="Selling Price"
              name="sellingPrice"
              type="number"
              value={partForm.sellingPrice}
              onChange={(event) => setPartForm((prev) => ({ ...prev, sellingPrice: event.target.value }))}
            />
            <FormField
              label="Reorder Threshold"
              name="reorderThreshold"
              type="number"
              value={partForm.reorderThreshold}
              onChange={(event) => setPartForm((prev) => ({ ...prev, reorderThreshold: event.target.value }))}
            />
            <label className="form-field" htmlFor="sectionId">
              <span>Section</span>
              <select
                id="sectionId"
                value={partForm.sectionId}
                onChange={(event) => setPartForm((prev) => ({ ...prev, sectionId: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create Part'}</Button>
          </div>
        </form>
      )}

      {canWrite && (
        <form className="inline-form" onSubmit={submitAdjustment}>
          <h2>Stock Adjustment</h2>
          <div className="inline-grid">
            <label className="form-field" htmlFor="adjustPartId">
              <span>Part</span>
              <select
                id="adjustPartId"
                value={adjustForm.partId}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, partId: event.target.value }))}
              >
                <option value="">Select</option>
                {items.map((part) => (
                  <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="adjustSectionId">
              <span>Section (optional)</span>
              <select
                id="adjustSectionId"
                value={adjustForm.sectionId}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, sectionId: event.target.value }))}
              >
                <option value="">None</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.label}</option>
                ))}
              </select>
            </label>

            <FormField
              label="Quantity Delta"
              name="quantityDelta"
              type="number"
              value={adjustForm.quantityDelta}
              onChange={(event) => setAdjustForm((prev) => ({ ...prev, quantityDelta: event.target.value }))}
            />
            <FormField
              label="Reason"
              name="reason"
              value={adjustForm.reason}
              onChange={(event) => setAdjustForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record Adjustment'}</Button>
          </div>
        </form>
      )}

      {canWrite && (
        <form className="inline-form" onSubmit={submitTransfer}>
          <h2>Stock Transfer</h2>
          <div className="inline-grid">
            <label className="form-field" htmlFor="transferPartId">
              <span>Part</span>
              <select
                id="transferPartId"
                value={transferForm.partId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, partId: event.target.value }))}
              >
                <option value="">Select</option>
                {items.map((part) => (
                  <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="fromSectionId">
              <span>From Section</span>
              <select
                id="fromSectionId"
                value={transferForm.fromSectionId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, fromSectionId: event.target.value }))}
              >
                <option value="">Select</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.label}</option>
                ))}
              </select>
            </label>

            <label className="form-field" htmlFor="toSectionId">
              <span>To Section</span>
              <select
                id="toSectionId"
                value={transferForm.toSectionId}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, toSectionId: event.target.value }))}
              >
                <option value="">Select</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.label}</option>
                ))}
              </select>
            </label>

            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              value={transferForm.quantity}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
            <FormField
              label="Reason"
              name="transferReason"
              value={transferForm.reason}
              onChange={(event) => setTransferForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Record Transfer'}</Button>
          </div>
        </form>
      )}

      {actionError && <p className="error-box">{actionError}</p>}
      {actionMessage && <p className="success-box">{actionMessage}</p>}

      <DataTable
        title="Part catalog"
        rows={items}
        searchKeys={['sku', 'name']}
        columns={[
          { key: 'sku', label: 'SKU', sortable: true },
          { key: 'name', label: 'Part Name', sortable: true },
          { key: 'current_stock', label: 'Stock', sortable: true },
          { key: 'reorder_threshold', label: 'Threshold', sortable: true },
          {
            key: 'low_stock',
            label: 'Status',
            render: (row) => (
              <span className={row.low_stock ? 'pill pill-danger' : 'pill pill-ok'}>
                {row.low_stock ? 'Low Stock' : 'Healthy'}
              </span>
            ),
          },
        ]}
      />
    </section>
  )
}

export default InventoryPage
