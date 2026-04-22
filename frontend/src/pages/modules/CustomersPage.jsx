import { useCallback, useEffect, useState } from 'react'
import {
  createCustomer,
  createSupplier,
  deleteCustomer,
  deleteSupplier,
  fetchBills,
  fetchCustomers,
  fetchSuppliers,
  updateCustomer,
  updateSupplier,
} from '../../auth'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import DataTable from '../../components/ui/DataTable'
import StatusView from '../../components/ui/StatusView'
import { useAuth } from '../../context/AuthContext'

function CustomersPage() {
  const { can } = useAuth()
  const canWrite = can('customers:write')
  const canReadBilling = can('billing:read')
  const [activeTab, setActiveTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [customerBills, setCustomerBills] = useState([])
  const [portalCustomerId, setPortalCustomerId] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
  })
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [editingSupplierId, setEditingSupplierId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [customerData, supplierData] = await Promise.all([fetchCustomers(), fetchSuppliers()])
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

  const loadCustomerBills = useCallback(async (customerId) => {
    if (!customerId || !canReadBilling) {
      setCustomerBills([])
      return
    }

    setPortalLoading(true)
    setActionError('')
    try {
      const data = await fetchBills({
        partyType: 'CUSTOMER',
        partyId: customerId,
        limit: 100,
      })
      setCustomerBills(data.items || [])
    } catch (loadError) {
      setActionError(loadError.message || 'Unable to load customer bills')
    } finally {
      setPortalLoading(false)
    }
  }, [canReadBilling])

  useEffect(() => {
    if (activeTab !== 'portal' || !canReadBilling) {
      return
    }

    const defaultCustomerId = portalCustomerId || (customers[0] ? String(customers[0].id) : '')
    if (!portalCustomerId && defaultCustomerId) {
      setPortalCustomerId(defaultCustomerId)
      loadCustomerBills(defaultCustomerId)
      return
    }

    loadCustomerBills(defaultCustomerId)
  }, [activeTab, portalCustomerId, customers, canReadBilling, loadCustomerBills])

  const completedBills = customerBills.filter((bill) => bill.status === 'PAID').length
  const pendingBills = customerBills.filter((bill) => ['DRAFT', 'CONFIRMED', 'PARTIALLY_PAID'].includes(bill.status)).length

  const resetCustomerForm = () => {
    setCustomerForm({ name: '', phone: '', email: '', address: '', creditLimit: '' })
    setEditingCustomerId(null)
  }

  const resetSupplierForm = () => {
    setSupplierForm({ name: '', phone: '', email: '', address: '' })
    setEditingSupplierId(null)
  }

  const submitCustomer = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!customerForm.name.trim()) {
      setActionError('Customer name is required.')
      return
    }

    setFormLoading(true)
    setActionError('')

    try {
      const payload = {
        name: customerForm.name,
        phone: customerForm.phone || undefined,
        email: customerForm.email || undefined,
        address: customerForm.address || undefined,
        creditLimit: customerForm.creditLimit === '' ? undefined : Number(customerForm.creditLimit),
      }

      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, payload)
      } else {
        await createCustomer(payload)
      }

      resetCustomerForm()
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setFormLoading(false)
    }
  }

  const submitSupplier = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      return
    }

    if (!supplierForm.name.trim()) {
      setActionError('Supplier name is required.')
      return
    }

    setFormLoading(true)
    setActionError('')

    try {
      const payload = {
        name: supplierForm.name,
        phone: supplierForm.phone || undefined,
        email: supplierForm.email || undefined,
        address: supplierForm.address || undefined,
      }

      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, payload)
      } else {
        await createSupplier(payload)
      }

      resetSupplierForm()
      await load()
    } catch (submitError) {
      setActionError(submitError.message)
    } finally {
      setFormLoading(false)
    }
  }

  const onEditCustomer = (row) => {
    setActiveTab('customers')
    setEditingCustomerId(row.id)
    setCustomerForm({
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      creditLimit: row.credit_limit ?? '',
    })
  }

  const onEditSupplier = (row) => {
    setActiveTab('suppliers')
    setEditingSupplierId(row.id)
    setSupplierForm({
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
    })
  }

  const onDeleteCustomer = async (id) => {
    if (!canWrite) {
      return
    }
    setActionError('')
    try {
      await deleteCustomer(id)
      await load()
    } catch (removeError) {
      setActionError(removeError.message)
    }
  }

  const onDeleteSupplier = async (id) => {
    if (!canWrite) {
      return
    }
    setActionError('')
    try {
      await deleteSupplier(id)
      await load()
    } catch (removeError) {
      setActionError(removeError.message)
    }
  }

  if (loading) {
    return <StatusView mode="loading" title="Loading parties" message="Syncing customer and supplier ledgers..." />
  }

  if (error) {
    return <StatusView mode="error" title="Unable to load parties" message={error} onRetry={load} />
  }

  return (
    <section className="stack">
      <header className="page-head">
        <p className="eyebrow">Parties</p>
        <h1>Customers and Suppliers</h1>
      </header>

      <section className="segment-wrap">
        <button
          className={activeTab === 'customers' ? 'segment-btn segment-btn-active' : 'segment-btn'}
          onClick={() => setActiveTab('customers')}
        >
          Customers
        </button>
        <button
          className={activeTab === 'suppliers' ? 'segment-btn segment-btn-active' : 'segment-btn'}
          onClick={() => setActiveTab('suppliers')}
        >
          Suppliers
        </button>
        <button
          className={activeTab === 'portal' ? 'segment-btn segment-btn-active' : 'segment-btn'}
          onClick={() => setActiveTab('portal')}
        >
          Customer Bill Portal
        </button>
      </section>

      {activeTab === 'customers' && canWrite && (
        <form className="inline-form" onSubmit={submitCustomer}>
          <h2>{editingCustomerId ? 'Edit Customer' : 'Create Customer'}</h2>
          <div className="inline-grid">
            <FormField
              label="Name"
              name="name"
              value={customerForm.name}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <FormField
              label="Phone"
              name="phone"
              value={customerForm.phone}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={customerForm.email}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <FormField
              label="Credit Limit"
              name="creditLimit"
              type="number"
              value={customerForm.creditLimit}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, creditLimit: event.target.value }))}
            />
            <FormField
              label="Address"
              name="address"
              value={customerForm.address}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Customer'}</Button>
            {editingCustomerId && (
              <Button type="button" variant="outline" onClick={resetCustomerForm}>Cancel Edit</Button>
            )}
          </div>
        </form>
      )}

      {activeTab === 'suppliers' && canWrite && (
        <form className="inline-form" onSubmit={submitSupplier}>
          <h2>{editingSupplierId ? 'Edit Supplier' : 'Create Supplier'}</h2>
          <div className="inline-grid">
            <FormField
              label="Name"
              name="name"
              value={supplierForm.name}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <FormField
              label="Phone"
              name="phone"
              value={supplierForm.phone}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              value={supplierForm.email}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <FormField
              label="Address"
              name="address"
              value={supplierForm.address}
              onChange={(event) => setSupplierForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Supplier'}</Button>
            {editingSupplierId && (
              <Button type="button" variant="outline" onClick={resetSupplierForm}>Cancel Edit</Button>
            )}
          </div>
        </form>
      )}

      {actionError && <p className="error-box">{actionError}</p>}

      {activeTab === 'customers' ? (
        customers.length === 0 ? (
          <StatusView mode="empty" title="No customers yet" message="Create customer records to track receivables." />
        ) : (
          <DataTable
            title="Customer accounts"
            rows={customers}
            searchKeys={['name', 'email', 'phone']}
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'phone', label: 'Phone', sortable: true },
              { key: 'email', label: 'Email', sortable: true },
              { key: 'credit_limit', label: 'Credit Limit', sortable: true },
              { key: 'outstanding_balance', label: 'Outstanding', sortable: true },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) =>
                  canWrite ? (
                    <div className="row-actions">
                      <button onClick={() => onEditCustomer(row)}>Edit</button>
                      <button onClick={() => onDeleteCustomer(row.id)}>Delete</button>
                    </div>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        )
      ) : activeTab === 'suppliers' ? (
        suppliers.length === 0 ? (
        <StatusView mode="empty" title="No suppliers yet" message="Create supplier records to track payables." />
        ) : (
        <DataTable
          title="Supplier accounts"
          rows={suppliers}
          searchKeys={['name', 'email', 'phone']}
          columns={[
            { key: 'name', label: 'Name', sortable: true },
            { key: 'phone', label: 'Phone', sortable: true },
            { key: 'email', label: 'Email', sortable: true },
            { key: 'outstanding_balance', label: 'Outstanding', sortable: true },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) =>
                canWrite ? (
                  <div className="row-actions">
                    <button onClick={() => onEditSupplier(row)}>Edit</button>
                    <button onClick={() => onDeleteSupplier(row.id)}>Delete</button>
                  </div>
                ) : (
                  '-'
                ),
            },
          ]}
        />
        )
      ) : !canReadBilling ? (
        <StatusView mode="empty" title="Billing Access Required" message="Your role cannot read billing records." />
      ) : (
        <section className="stack">
          <section className="inline-form">
            <h2>Customer Bill Portal</h2>
            <div className="inline-grid">
              <label className="form-field" htmlFor="portalCustomerId">
                <span>Customer</span>
                <select
                  id="portalCustomerId"
                  value={portalCustomerId}
                  onChange={(event) => setPortalCustomerId(event.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="inline-grid" style={{ marginTop: '0.75rem' }}>
              <div className="pill">Total Bills: {customerBills.length}</div>
              <div className="pill">Complete: {completedBills}</div>
              <div className="pill">Pending: {pendingBills}</div>
            </div>
          </section>

          {portalLoading ? (
            <StatusView mode="loading" title="Loading bills" message="Fetching customer billing history..." />
          ) : customerBills.length === 0 ? (
            <StatusView mode="empty" title="No bills found" message="This customer has no billing records yet." />
          ) : (
            <DataTable
              title="Customer bill history"
              rows={customerBills}
              searchKeys={['bill_number', 'status', 'bill_type', 'party_name']}
              columns={[
                { key: 'bill_number', label: 'Bill No', sortable: true },
                { key: 'bill_type', label: 'Type', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                {
                  key: 'bill_date',
                  label: 'Bill Date',
                  sortable: true,
                  render: (row) => (row.bill_date ? new Date(row.bill_date).toLocaleDateString() : '-'),
                },
                {
                  key: 'due_date',
                  label: 'Due Date',
                  sortable: true,
                  render: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'),
                },
                {
                  key: 'total',
                  label: 'Total',
                  sortable: true,
                  render: (row) => `Rs ${Number(row.total || 0).toLocaleString()}`,
                },
                {
                  key: 'amount_due',
                  label: 'Pending',
                  sortable: true,
                  render: (row) => `Rs ${Number(row.amount_due || 0).toLocaleString()}`,
                },
              ]}
            />
          )}
        </section>
      )}
    </section>
  )
}

export default CustomersPage
