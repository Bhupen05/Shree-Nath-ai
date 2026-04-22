/**
 * Stock Validation Middleware
 */

function validateAddStockEntry(req, res, next) {
  const { product_id, location_id, quantity, batch_number } = req.body;
  const errors = [];

  if (!product_id) errors.push('product_id is required');
  if (!location_id) errors.push('location_id is required');
  if (!quantity) errors.push('quantity is required');
  if (quantity && quantity <= 0) errors.push('quantity must be greater than 0');
  if (typeof quantity !== 'number') errors.push('quantity must be a number');
  if (!batch_number) errors.push('batch_number is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
}

function validateTransferStock(req, res, next) {
  const { entry_id, to_location_id } = req.body;
  const errors = [];

  if (!entry_id) errors.push('entry_id is required');
  if (!to_location_id) errors.push('to_location_id is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
}

function validateAdjustStock(req, res, next) {
  const { entry_id, quantity_to_remove } = req.body;
  const errors = [];

  if (!entry_id) errors.push('entry_id is required');
  if (!quantity_to_remove) errors.push('quantity_to_remove is required');
  if (quantity_to_remove && quantity_to_remove <= 0) errors.push('quantity_to_remove must be greater than 0');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
}

function validateCreateLocation(req, res, next) {
  const { name, type } = req.body;
  const errors = [];

  if (!name) errors.push('name is required');
  if (!type) errors.push('type is required');

  const validTypes = ['ROOM', 'CABINET', 'SECTION'];
  if (type && !validTypes.includes(type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
}

module.exports = {
  validateAddStockEntry,
  validateTransferStock,
  validateAdjustStock,
  validateCreateLocation
};
