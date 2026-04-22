/**
 * Bill-Stock Integration Routes
 * API endpoints for bill-to-stock operations
 */

const express = require('express');
const router = express.Router();
const billStockController = require('../controllers/bill-stock.controller');

/**
 * Create stock entries from a purchase bill
 * POST /api/bill-stock/create-stock-from-bill
 * 
 * Request:
 * {
 *   "billId": 123,
 *   "locationId": 1
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "billId": 123,
 *     "entriesCreated": 5,
 *     "totalQuantity": 50,
 *     "totalCost": 5000
 *   }
 * }
 */
router.post('/create-stock-from-bill', async (req, res) => {
  return billStockController.createStockFromBill(req, res);
});

/**
 * Allocate and reserve stock for a sales bill item
 * POST /api/bill-stock/allocate-stock
 * 
 * Request:
 * {
 *   "billItemId": 456,
 *   "productId": 789,
 *   "quantity": 10,
 *   "locationId": null
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "allocated": 10,
 *     "shortage": 0,
 *     "entries": [...]
 *   }
 * }
 */
router.post('/allocate-stock', async (req, res) => {
  return billStockController.allocateStock(req, res);
});

/**
 * Fulfill a bill item from reserved stock
 * POST /api/bill-stock/fulfill-item
 * 
 * Request:
 * {
 *   "billItemId": 456,
 *   "quantity": 10
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "fulfilled": 10,
 *     "fulfillmentStatus": "FULFILLED"
 *   }
 * }
 */
router.post('/fulfill-item', async (req, res) => {
  return billStockController.fulfillBillItem(req, res);
});

/**
 * Get stock status for a bill
 * GET /api/bill-stock/status/:billId
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 123,
 *     "bill_number": "BILL-001",
 *     "bill_type": "SALE",
 *     "total_items": 5,
 *     "fulfilled_items": 3,
 *     "partial_items": 1,
 *     "pending_items": 1,
 *     "items": [...]
 *   }
 * }
 */
router.get('/status/:billId', async (req, res) => {
  return billStockController.getBillStatus(req, res);
});

/**
 * Get pending stock allocations for a bill
 * GET /api/bill-stock/pending/:billId
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "bill_item_id": 456,
 *       "product_id": 789,
 *       "needed": 10,
 *       "reserved": 5,
 *       "fulfilled": 0,
 *       "pending": 5,
 *       "available": 20
 *     }
 *   ]
 * }
 */
router.get('/pending/:billId', async (req, res) => {
  return billStockController.getPendingAllocations(req, res);
});

/**
 * Get bill-to-stock linkage summary
 * GET /api/bill-stock/linkage?billType=PURCHASE&days=30
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "bill_id": 123,
 *       "bill_number": "BILL-001",
 *       "bill_type": "PURCHASE",
 *       "linked_stock_entries": 5,
 *       "total_quantity": 100,
 *       "total_value": 10000
 *     }
 *   ]
 * }
 */
router.get('/linkage', async (req, res) => {
  return billStockController.getBillStockLinkage(req, res);
});

/**
 * Automatically allocate stock to all pending items in a bill
 * POST /api/bill-stock/auto-allocate/:billId
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "allocatedItems": 3,
 *     "failedItems": 1,
 *     "results": [...]
 *   }
 * }
 */
router.post('/auto-allocate/:billId', async (req, res) => {
  return billStockController.autoAllocateBillStock(req, res);
});

module.exports = router;
