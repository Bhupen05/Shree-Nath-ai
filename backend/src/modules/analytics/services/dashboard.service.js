/**
 * Dashboard Service
 * Manages dashboard widgets and layouts
 */

class DashboardService {
  constructor(pool) {
    this.pool = pool;
    this.widgetCache = new Map();
  }

  /**
   * Create dashboard widget
   * @param {Object} widgetData - Widget configuration
   */
  async createWidget({
    widgetCode,
    widgetName,
    widgetType,
    chartType,
    dataSource,
    config,
    refreshInterval = 300
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO dashboard_widgets (
          widget_code, widget_name, widget_type, chart_type,
          data_source, config, refresh_interval_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, widget_code, created_at
      `, [
        widgetCode,
        widgetName,
        widgetType,
        chartType,
        dataSource,
        JSON.stringify(config),
        refreshInterval
      ]);

      const widget = result.rows[0];
      this.widgetCache.set(widget.id, widget);

      return {
        success: true,
        widget,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create dashboard layout
   * @param {Object} layoutData - Dashboard configuration
   */
  async createDashboard({
    dashboardName,
    dashboardType,
    ownerId,
    layoutConfig,
    description,
    isDefault = false,
    isPublic = false
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO dashboard_layouts (
          dashboard_name, dashboard_type, owner_id, layout_config,
          description, is_default, is_public
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, dashboard_name, created_at
      `, [
        dashboardName,
        dashboardType,
        ownerId,
        JSON.stringify(layoutConfig),
        description,
        isDefault,
        isPublic
      ]);

      return {
        success: true,
        dashboard: result.rows[0],
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add widget to dashboard
   * @param {integer} dashboardId - Dashboard ID
   * @param {integer} widgetId - Widget ID
   * @param {Object} position - Widget position/size
   */
  async addWidgetToDashboard(dashboardId, widgetId, {
    positionX = 0,
    positionY = 0,
    width = 4,
    height = 3,
    parameters = {}
  }) {
    try {
      const result = await this.pool.query(`
        INSERT INTO dashboard_widget_mappings (
          dashboard_id, widget_id, position_x, position_y,
          width, height, parameters
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
      `, [
        dashboardId,
        widgetId,
        positionX,
        positionY,
        width,
        height,
        JSON.stringify(parameters)
      ]);

      return {
        success: true,
        mappingId: result.rows[0].id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get dashboard with widgets
   * @param {integer} dashboardId - Dashboard ID
   */
  async getDashboard(dashboardId) {
    try {
      const dashResult = await this.pool.query(`
        SELECT
          id, dashboard_name, dashboard_type, description,
          layout_config, is_public, created_at
        FROM dashboard_layouts
        WHERE id = $1
      `, [dashboardId]);

      if (dashResult.rows.length === 0) {
        return {
          success: false,
          error: 'Dashboard not found'
        };
      }

      const dashboard = dashResult.rows[0];

      // Get widgets
      const widgetsResult = await this.pool.query(`
        SELECT
          dw.id,
          dw.widget_code,
          dw.widget_name,
          dw.widget_type,
          dw.chart_type,
          dw.config,
          dwm.position_x,
          dwm.position_y,
          dwm.width,
          dwm.height,
          dwm.parameters
        FROM dashboard_widget_mappings dwm
        JOIN dashboard_widgets dw ON dw.id = dwm.widget_id
        WHERE dwm.dashboard_id = $1
        ORDER BY dwm.position_y, dwm.position_x
      `, [dashboardId]);

      dashboard.widgets = widgetsResult.rows;

      return {
        success: true,
        dashboard
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's dashboards
   * @param {integer} userId - User ID
   */
  async getUserDashboards(userId) {
    try {
      const result = await this.pool.query(`
        SELECT
          id, dashboard_name, dashboard_type, description,
          is_default, created_at
        FROM dashboard_layouts
        WHERE owner_id = $1 OR is_public = TRUE
        ORDER BY is_default DESC, created_at DESC
      `, [userId]);

      return {
        success: true,
        dashboards: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available widgets
   */
  async getAvailableWidgets() {
    try {
      const result = await this.pool.query(`
        SELECT
          id, widget_code, widget_name, widget_type, chart_type,
          description, refresh_interval_seconds
        FROM dashboard_widgets
        WHERE is_active = TRUE
        ORDER BY widget_type, widget_name
      `);

      return {
        success: true,
        widgets: result.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get widget data
   * @param {integer} widgetId - Widget ID
   * @param {Object} parameters - Widget parameters
   */
  async getWidgetData(widgetId, parameters = {}) {
    try {
      const widgetResult = await this.pool.query(`
        SELECT * FROM dashboard_widgets WHERE id = $1
      `, [widgetId]);

      if (widgetResult.rows.length === 0) {
        return {
          success: false,
          error: 'Widget not found'
        };
      }

      const widget = widgetResult.rows[0];
      const dataSource = widget.data_source;

      // Execute query based on data source
      let query = `SELECT * FROM ${dataSource}`;
      
      if (parameters && Object.keys(parameters).length > 0) {
        // Build WHERE clause if parameters provided
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(parameters)) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      query += ` LIMIT 1000`;

      const dataResult = await this.pool.query(query);

      return {
        success: true,
        widget: {
          id: widget.id,
          name: widget.widget_name,
          type: widget.widget_type,
          chartType: widget.chart_type,
          config: widget.config
        },
        data: dataResult.rows,
        recordCount: dataResult.rows.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get dashboard types
   */
  getDashboardTypes() {
    return [
      { type: 'EXECUTIVE', description: 'Executive summary dashboard' },
      { type: 'MANAGER', description: 'Manager operations dashboard' },
      { type: 'TEAM', description: 'Team performance dashboard' },
      { type: 'CUSTOM', description: 'Custom user dashboard' }
    ];
  }

  /**
   * Get widget types
   */
  getWidgetTypes() {
    return [
      { type: 'METRIC', description: 'Single metric display' },
      { type: 'CHART', description: 'Visual chart' },
      { type: 'TABLE', description: 'Data table' },
      { type: 'GAUGE', description: 'Gauge/progress indicator' },
      { type: 'MAP', description: 'Geographic map' }
    ];
  }

  /**
   * Get chart types
   */
  getChartTypes() {
    return [
      'LINE',
      'BAR',
      'PIE',
      'AREA',
      'SCATTER',
      'BUBBLE',
      'HEATMAP'
    ];
  }
}

module.exports = DashboardService;
