/**
 * Location Controller - Location Hierarchy Management
 */

const { pool } = require('../../../db');

class LocationController {
  /**
   * POST /api/inventory/locations
   * Create new location
   */
  async createLocation(req, res) {
    try {
      const { name, type, parent_id, capacity_units, description } = req.body;
      const userId = req.user.id;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'name and type are required'
        });
      }

      const validTypes = ['ROOM', 'CABINET', 'SECTION'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Validate parent location if provided
      if (parent_id) {
        const parentResult = await pool.query(
          'SELECT id, type FROM locations WHERE id = $1',
          [parent_id]
        );

        if (parentResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Parent location not found'
          });
        }

        // Validate hierarchy (ROOM -> CABINET -> SECTION)
        const parentType = parentResult.rows[0].type;
        if (type === 'ROOM') {
          return res.status(400).json({
            success: false,
            error: 'ROOM cannot have a parent'
          });
        } else if (type === 'CABINET' && parentType !== 'ROOM') {
          return res.status(400).json({
            success: false,
            error: 'CABINET must have ROOM as parent'
          });
        } else if (type === 'SECTION' && parentType !== 'CABINET') {
          return res.status(400).json({
            success: false,
            error: 'SECTION must have CABINET as parent'
          });
        }
      }

      const result = await pool.query(
        `INSERT INTO locations (name, type, parent_id, capacity_units, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, type, parent_id || null, capacity_units || null, description || null, userId]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Location created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/locations
   * Get all locations
   */
  async getAllLocations(req, res) {
    try {
      const { type, parent_id } = req.query;

      let query = 'SELECT * FROM locations WHERE is_active = true';
      const params = [];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      if (parent_id) {
        query += ` AND parent_id = $${params.length + 1}`;
        params.push(parseInt(parent_id));
      }

      query += ' ORDER BY type, name';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/locations/tree
   * Get location hierarchy tree
   */
  async getLocationTree(req, res) {
    try {
      // Get all rooms
      const roomsResult = await pool.query(
        'SELECT id, name FROM locations WHERE type = $1 AND is_active = true ORDER BY name',
        ['ROOM']
      );

      const tree = [];

      for (const room of roomsResult.rows) {
        // Get cabinets in room
        const cabinetsResult = await pool.query(
          'SELECT id, name FROM locations WHERE type = $1 AND parent_id = $2 AND is_active = true ORDER BY name',
          ['CABINET', room.id]
        );

        const roomNode = {
          id: room.id,
          name: room.name,
          type: 'ROOM',
          children: []
        };

        for (const cabinet of cabinetsResult.rows) {
          // Get sections in cabinet
          const sectionsResult = await pool.query(
            'SELECT id, name FROM locations WHERE type = $1 AND parent_id = $2 AND is_active = true ORDER BY name',
            ['SECTION', cabinet.id]
          );

          const cabinetNode = {
            id: cabinet.id,
            name: cabinet.name,
            type: 'CABINET',
            children: sectionsResult.rows.map(s => ({
              id: s.id,
              name: s.name,
              type: 'SECTION',
              children: []
            }))
          };

          roomNode.children.push(cabinetNode);
        }

        tree.push(roomNode);
      }

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/inventory/locations/:id
   * Get location with stock info
   */
  async getLocationById(req, res) {
    try {
      const { id } = req.params;

      const locationResult = await pool.query(
        'SELECT * FROM locations WHERE id = $1',
        [parseInt(id)]
      );

      if (locationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Location not found'
        });
      }

      const location = locationResult.rows[0];

      // Get stock at this location
      const stockResult = await pool.query(
        `SELECT se.*, p.name as product_name FROM stock_entries se
         JOIN products p ON se.product_id = p.id
         WHERE se.location_id = $1 AND se.deleted_at IS NULL`,
        [parseInt(id)]
      );

      const totalQuantity = stockResult.rows.reduce((sum, row) => sum + (row.quantity || 0), 0);

      res.json({
        success: true,
        data: {
          location,
          stock: stockResult.rows,
          total_items: stockResult.rows.length,
          total_quantity: totalQuantity,
          capacity_available: location.capacity_units ? Math.max(0, location.capacity_units - totalQuantity) : null
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/inventory/locations/:id
   * Update location
   */
  async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const { name, capacity_units, description } = req.body;

      const result = await pool.query(
        `UPDATE locations SET 
          name = COALESCE($1, name),
          capacity_units = COALESCE($2, capacity_units),
          description = COALESCE($3, description),
          updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name || null, capacity_units || null, description || null, parseInt(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Location not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Location updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/inventory/locations/:id
   * Soft delete location
   */
  async deleteLocation(req, res) {
    try {
      const { id } = req.params;

      // Check if location has stock
      const stockResult = await pool.query(
        'SELECT COUNT(*) as count FROM stock_entries WHERE location_id = $1 AND deleted_at IS NULL',
        [parseInt(id)]
      );

      if (stockResult.rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete location with active stock'
        });
      }

      const result = await pool.query(
        'UPDATE locations SET is_active = false WHERE id = $1 RETURNING *',
        [parseInt(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Location not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Location deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new LocationController();
