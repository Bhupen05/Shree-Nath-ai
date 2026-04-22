/**
 * Bill-Stock Integration Controller
 * Handles HTTP requests for bill-to-stock operations
 */

const billStockService = require('../services/bill-stock.service');

class BillStockController {
  /**
   * POST /api/bill-stock/create-stock-from-bill
   * Create stock entries from a confirmed purchase bill
   */
  async createStockFromBill(req, res) {
    try {
      const { billId, locationId = 1 } = req.body;

      if (!billId) {
        return res.status(400).json({
          success: false,
          error: 'billId is required'
        });
      }

      const result = await billStockService.createStockFromPurchaseBill(
        billId,
        locationId,
        req.user.userId
      );

      return res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/bill-stock/allocate-stock
   * Allocate and reserve stock for a sales bill item
   */
  async allocateStock(req, res) {
    try {
      const { billItemId, productId, quantity, locationId = null } = req.body;

      if (!billItemId || !productId || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'billItemId, productId, and quantity are required'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'quantity must be greater than 0'
        });
      }

      const result = await billStockService.allocateStockToBillItem(
        billItemId,
        productId,
        quantity,
        locationId,
        req.user.userId
      );

      return res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/bill-stock/fulfill-item
   * Fulfill a bill item from its reserved stock
   */
  async fulfillBillItem(req, res) {
    try {
      const { billItemId, quantity = null } = req.body;

      if (!billItemId) {
        return res.status(400).json({
          success: false,
          error: 'billItemId is required'
        });
      }

      const result = await billStockService.fulfillBillItem(
        billItemId,
        quantity,
        req.user.userId
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/bill-stock/status/:billId
   * Get stock status for a bill
   */
  async getBillStatus(req, res) {
    try {
      const billId = parseInt(req.params.billId);

      if (!billId) {
        return res.status(400).json({
          success: false,
          error: 'billId is required'
        });
      }

      const result = await billStockService.getBillStockStatus(billId);

      return res.status(200).json({
        success: true,
        data: result.data,
        message: 'Bill stock status retrieved successfully'
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/bill-stock/pending/:billId
   * Get pending stock allocations for a bill
   */
  async getPendingAllocations(req, res) {
    try {
      const billId = parseInt(req.params.billId);

      if (!billId) {
        return res.status(400).json({
          success: false,
          error: 'billId is required'
        });
      }

      const result = await billStockService.getPendingAllocations(billId);

      return res.status(200).json({
        success: true,
        data: result.data,
        message: 'Pending allocations retrieved successfully'
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/bill-stock/linkage
   * Get bill-to-stock linkage summary
   */
  async getBillStockLinkage(req, res) {
    try {
      const { billType = null, days = 30 } = req.query;

      const result = await billStockService.getBillStockLinkage(
        billType,
        parseInt(days)
      );

      return res.status(200).json({
        success: true,
        data: result.data,
        message: 'Bill-stock linkage retrieved successfully'
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/bill-stock/auto-allocate/:billId
   * Automatically allocate stock to all pending items in a bill
   */
  async autoAllocateBillStock(req, res) {
    try {
      const billId = parseInt(req.params.billId);

      if (!billId) {
        return res.status(400).json({
          success: false,
          error: 'billId is required'
        });
      }

      // Get pending allocations
      const pending = await billStockService.getPendingAllocations(billId);

      if (!pending.success || pending.data.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            allocatedItems: 0,
            failedItems: 0,
            results: []
          },
          message: 'No items to allocate'
        });
      }

      const results = [];
      let allocatedItems = 0;
      let failedItems = 0;

      // Allocate stock to each pending item
      for (const item of pending.data) {
        try {
          const result = await billStockService.allocateStockToBillItem(
            item.bill_item_id,
            item.product_id,
            item.pending,
            null,
            req.user.userId
          );

          results.push({
            billItemId: item.bill_item_id,
            status: 'success',
            allocated: result.allocated,
            shortage: result.shortage
          });

          if (result.allocated === item.pending) {
            allocatedItems += 1;
          }
        } catch (error) {
          results.push({
            billItemId: item.bill_item_id,
            status: 'failed',
            error: error.message
          });
          failedItems += 1;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          allocatedItems,
          failedItems,
          totalItems: pending.data.length,
          results
        },
        message: `Auto-allocated ${allocatedItems} items, ${failedItems} failed`
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new BillStockController();
