import React, { useState } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { downloadStockReportCSV, downloadSalesReportCSV } from '../../auth';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDownloadStockReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = await downloadStockReportCSV();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSalesReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = await downloadSalesReportCSV(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stock Report */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6" />
              Stock Report
            </h2>
            <p className="text-sm text-blue-700 mb-4">
              Complete inventory status with current stock, valuations, and locations
            </p>
            <p className="text-xs text-blue-600 mb-4">
              Includes SKU, product names, section/cabinet/room locations, current stock quantities, and valuation
            </p>
            <Button
              onClick={handleDownloadStockReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download as CSV
            </Button>
          </div>
          <FileText className="w-16 h-16 text-blue-300 opacity-50" />
        </div>
      </Card>

      {/* Sales Report */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-green-900 flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6" />
              Sales Report
            </h2>
            <p className="text-sm text-green-700 mb-4">
              Complete sales data with bills, amounts, and customer information
            </p>

            {/* Date Filters */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md bg-white text-green-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-green-900 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-md bg-white text-green-900"
                />
              </div>
            </div>

            <p className="text-xs text-green-600 mb-4">
              Filter by date range or leave blank to get all sales
            </p>

            <Button
              onClick={handleDownloadSalesReport}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download as CSV
            </Button>
          </div>
          <FileText className="w-16 h-16 text-green-300 opacity-50" />
        </div>
      </Card>

      {/* Additional Reports Coming Soon */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 opacity-60">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Calendar className="w-6 h-6" />
              More Reports Coming Soon
            </h2>
            <p className="text-sm text-gray-700 mb-2">
              Additional reports planned for Phase 5:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Aged Receivables Report</li>
              <li>Demand Forecast Report</li>
              <li>Employee Activity Report</li>
              <li>Dead Stock Analysis</li>
              <li>Profit & Loss Summary</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
