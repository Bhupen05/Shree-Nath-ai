/**
 * Stock Management Component
 * Handles add, list, update stock operations for Phase 5
 */

import React, { useState, useEffect } from 'react';
import './Stock.css';

// API base URL
const API_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

function StockManagement() {
  const [tab, setTab] = useState('add'); // add, list, transfer
  const [stocks, setStocks] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    quantity: '',
    batch_number: '',
    supplier_id: '',
    expiry_date: '',
    unit_cost: ''
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchLocations();
    fetchProducts();
    if (tab === 'list') {
      fetchStocks();
    }
  }, [tab]);

  // Fetch locations
  async function fetchLocations() {
    try {
      const response = await fetch(`${API_URL}/api/inventory/locations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  }

  // Fetch products
  async function fetchProducts() {
    try {
      const response = await fetch(`${API_URL}/api/inventory/parts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }

  // Fetch stock entries
  async function fetchStocks() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/inventory/stock/entries`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStocks(data.data);
        setError(null);
      }
    } catch {
      setError('Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }

  // Handle form input change
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // Add stock entry
  async function handleAddStock(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/inventory/stock/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: parseInt(formData.product_id),
          location_id: parseInt(formData.location_id),
          quantity: parseInt(formData.quantity),
          batch_number: formData.batch_number,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
          expiry_date: formData.expiry_date || null,
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Stock entry added successfully (ID: ${data.data.entry.id})`);
        // Reset form
        setFormData({
          product_id: '',
          location_id: '',
          quantity: '',
          batch_number: '',
          supplier_id: '',
          expiry_date: '',
          unit_cost: ''
        });
        // Refresh list
        fetchStocks();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add stock');
      }
    } catch (err) {
      setError('Error adding stock: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Render Add Stock Form
  function renderAddStockForm() {
    return (
      <div className="stock-form">
        <h3>Add Stock Entry</h3>
        <form onSubmit={handleAddStock}>
          <div className="form-group">
            <label>Product *</label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <select
              name="location_id"
              value={formData.location_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Batch Number *</label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleInputChange}
                required
                placeholder="e.g., BATCH-001"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Cost</label>
              <input
                type="number"
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Stock Entry'}
          </button>
        </form>
      </div>
    );
  }

  // Render Stock List
  function renderStockList() {
    if (loading) return <div className="loading">Loading stock data...</div>;
    if (stocks.length === 0) return <div className="empty">No stock entries found</div>;

    return (
      <div className="stock-list">
        <h3>Stock Entries</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Location</th>
              <th>Batch</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(stock => (
              <tr key={stock.id}>
                <td>{stock.id}</td>
                <td>{stock.product_name}</td>
                <td>{stock.location_name}</td>
                <td>{stock.batch_number}</td>
                <td>{stock.quantity}</td>
                <td>{stock.expiry_date || '-'}</td>
                <td>{new Date(stock.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-small">View</button>
                  <button className="btn-small">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="stock-management">
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${tab === 'add' ? 'active' : ''}`}
          onClick={() => setTab('add')}
        >
          Add Stock
        </button>
        <button
          className={`tab ${tab === 'list' ? 'active' : ''}`}
          onClick={() => setTab('list')}
        >
          Stock List
        </button>
        <button
          className={`tab ${tab === 'transfer' ? 'active' : ''}`}
          onClick={() => setTab('transfer')}
        >
          Transfer Stock
        </button>
      </div>

      <div className="tab-content">
        {tab === 'add' && renderAddStockForm()}
        {tab === 'list' && renderStockList()}
        {tab === 'transfer' && <div>Transfer Stock feature coming soon...</div>}
      </div>
    </div>
  );
}

export default StockManagement;
