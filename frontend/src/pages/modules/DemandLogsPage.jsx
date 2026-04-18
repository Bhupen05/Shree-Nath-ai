import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Search, Phone, CheckCircle, Circle, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { fetchDemandLogs, fetchDemandLogsByStatus } from '../../auth';

export default function DemandLogsPage({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFulfilled, setFilterFulfilled] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

  const loadDemandLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let data;
      if (filterFulfilled) {
        data = await fetchDemandLogsByStatus(filterFulfilled === 'fulfilled', limit, offset);
      } else {
        data = await fetchDemandLogs(limit, offset);
      }
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading demand logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit, filterFulfilled]);

  useEffect(() => {
    loadDemandLogs();
  }, [offset, limit, filterFulfilled, loadDemandLogs]);

  useEffect(() => {
    const filtered = logs.filter((log) => {
      const matchesSearch =
        log.query_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.caller_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.vehicle_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  const columns = [
    {
      key: 'created_at',
      label: 'Time',
      render: (value) => new Date(value).toLocaleString(),
    },
    { key: 'source', label: 'Source' },
    { key: 'query_text', label: 'Query' },
    { key: 'vehicle_make', label: 'Vehicle Make' },
    { key: 'vehicle_model', label: 'Vehicle Model' },
    { key: 'quantity_req', label: 'Qty Required' },
    {
      key: 'fulfilled',
      label: 'Status',
      render: (value) =>
        value ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-medium">
            <CheckCircle size={14} /> Fulfilled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-xs font-medium">
            <Circle size={14} /> Pending
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-orange-900 dark:text-orange-100">Demand Logs</h1>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Track all customer queries and demands from the AI voice agent</p>
          </div>
          <Phone className="w-12 h-12 text-orange-400 opacity-50" />
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-6">
          <p className="text-sm font-medium text-blue-600">Total Demands</p>
          <p className="text-2xl font-bold text-blue-900 mt-2">{total}</p>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-6">
          <p className="text-sm font-medium text-green-600">Fulfilled</p>
          <p className="text-2xl font-bold text-green-900 mt-2">{logs.filter((l) => l.fulfilled).length}</p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-6">
          <p className="text-sm font-medium text-orange-600">Pending</p>
          <p className="text-2xl font-bold text-orange-900 mt-2">{logs.filter((l) => !l.fulfilled).length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-4">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" size={18} />
            <input
              type="text"
              placeholder="Search query, phone, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-orange-200 dark:border-orange-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
            />
          </div>
          <select
            value={filterFulfilled}
            onChange={(e) => setFilterFulfilled(e.target.value)}
            className="px-4 py-2 border border-orange-200 dark:border-orange-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-orange-400 focus:ring-1 focus:ring-orange-300"
          >
            <option value="">All Status</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p className="animate-pulse">Loading demand logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Phone size={40} className="mx-auto opacity-20 mb-2" />
            <p>No demand logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-orange-100 to-orange-50 border-b border-orange-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Query</th>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Vehicle Make</th>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Vehicle Model</th>
                    <th className="px-4 py-3 text-center font-semibold text-orange-900">Qty Req</th>
                    <th className="px-4 py-3 text-left font-semibold text-orange-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-orange-100 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-orange-700 dark:text-orange-300">{log.source}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white truncate max-w-xs">{log.query_text}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.vehicle_make || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.vehicle_model || '-'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">{log.quantity_req}</td>
                      <td className="px-4 py-3">
                        {log.fulfilled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-medium">
                            <CheckCircle size={14} /> Fulfilled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 rounded-full text-xs font-medium">
                            <Circle size={14} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} demands
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded font-medium transition disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded font-medium transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
