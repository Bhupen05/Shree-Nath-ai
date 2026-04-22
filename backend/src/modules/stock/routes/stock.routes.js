/**
 * Stock Routes - API Endpoint Definitions
 */

const express = require('express');
const router = express.Router();

const stockController = require('../controllers/stock.controller');
const locationController = require('../controllers/location.controller');

// ============================================================================
// STOCK ENTRY ROUTES
// ============================================================================

/**
 * POST /api/inventory/stock/entries
 * Add new stock entry
 */
router.post('/entries', (req, res) => {
  stockController.addStockEntry(req, res);
});

/**
 * GET /api/inventory/stock/entries
 * Get all stock entries with pagination and filters
 */
router.get('/entries', (req, res) => {
  stockController.getAllStockEntries(req, res);
});

/**
 * GET /api/inventory/stock/entries/:id
 * Get single stock entry with history
 */
router.get('/entries/:id', (req, res) => {
  stockController.getStockEntryById(req, res);
});

/**
 * PUT /api/inventory/stock/entries/:id
 * Update stock entry
 */
router.put('/entries/:id', (req, res) => {
  stockController.updateStockEntry(req, res);
});

/**
 * DELETE /api/inventory/stock/entries/:id
 * Soft delete stock entry
 */
router.delete('/entries/:id', (req, res) => {
  stockController.deleteStockEntry(req, res);
});

// ============================================================================
// STOCK QUERY ROUTES
// ============================================================================

/**
 * GET /api/inventory/stock/product/:id
 * Get all stock batches for a product
 */
router.get('/product/:id', (req, res) => {
  stockController.getStockByProduct(req, res);
});

/**
 * GET /api/inventory/stock/location/:id
 * Get stock at specific location
 */
router.get('/location/:id', (req, res) => {
  stockController.getStockByLocation(req, res);
});

/**
 * GET /api/inventory/stock/low
 * Get low stock items
 */
router.get('/low', (req, res) => {
  stockController.getLowStockItems(req, res);
});

/**
 * GET /api/inventory/stock/expiring
 * Get expiring stock items
 */
router.get('/expiring', (req, res) => {
  stockController.getExpiringStock(req, res);
});

/**
 * GET /api/inventory/stock/value
 * Get total stock value
 */
router.get('/value', (req, res) => {
  stockController.getTotalStockValue(req, res);
});

// ============================================================================
// STOCK OPERATION ROUTES
// ============================================================================

/**
 * POST /api/inventory/stock/transfer
 * Transfer stock between locations
 */
router.post('/transfer', (req, res) => {
  stockController.transferStock(req, res);
});

/**
 * POST /api/inventory/stock/adjust
 * Adjust stock quantity (remove/add)
 */
router.post('/adjust', (req, res) => {
  stockController.adjustStock(req, res);
});

// ============================================================================
// AUDIT LOG ROUTES
// ============================================================================

/**
 * GET /api/inventory/stock/logs
 * Get all stock logs with filtering
 */
router.get('/logs', (req, res) => {
  stockController.getStockLogs(req, res);
});

/**
 * GET /api/inventory/stock/logs/:id
 * Get logs for specific stock entry
 */
router.get('/logs/:id', (req, res) => {
  stockController.getEntryLogs(req, res);
});

// ============================================================================
// LOCATION ROUTES
// ============================================================================

/**
 * POST /api/inventory/locations
 * Create new location
 */
router.post('/locations', (req, res) => {
  locationController.createLocation(req, res);
});

/**
 * GET /api/inventory/locations
 * Get all locations
 */
router.get('/locations', (req, res) => {
  locationController.getAllLocations(req, res);
});

/**
 * GET /api/inventory/locations/tree
 * Get location hierarchy tree
 */
router.get('/locations/tree', (req, res) => {
  locationController.getLocationTree(req, res);
});

/**
 * GET /api/inventory/locations/:id
 * Get location with stock info
 */
router.get('/locations/:id', (req, res) => {
  locationController.getLocationById(req, res);
});

/**
 * PUT /api/inventory/locations/:id
 * Update location
 */
router.put('/locations/:id', (req, res) => {
  locationController.updateLocation(req, res);
});

/**
 * DELETE /api/inventory/locations/:id
 * Soft delete location
 */
router.delete('/locations/:id', (req, res) => {
  locationController.deleteLocation(req, res);
});

module.exports = router;
