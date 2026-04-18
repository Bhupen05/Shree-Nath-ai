import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Search, History } from 'lucide-react';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import FormField from '../../components/ui/FormField';
import { fetchActivityLogs } from '../../auth';

export default function ActivityLogsPage({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

  const loadActivityLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchActivityLogs(limit, offset);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, limit]);

  useEffect(() => {
    loadActivityLogs();
  }, [offset, limit, loadActivityLogs]);

  useEffect(() => {
    const filtered = logs.filter((log) => {
      const matchesSearch =
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = !filterAction || log.action === filterAction;
      return matchesSearch && matchesAction;
    });
    setFilteredLogs(filtered);
  }, [searchTerm, filterAction, logs]);

  const columns = [
    { key: 'created_at', label: 'Timestamp', render: (value) => new Date(value).toLocaleString() },
    { key: 'action', label: 'Action' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'ip_address', label: 'IP Address' },
  ];

  const getUniqueActions = () => {
    return [...new Set(logs.map((log) => log.action))].sort();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-100">Activity Logs</h1>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Complete audit trail of all system actions</p>
          </div>
          <History className="w-12 h-12 text-blue-400 opacity-50" />
        </div>
      </Card>

      {/* Stats */}
      <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 p-6">
        <p className="text-sm font-medium text-indigo-600">Total Activity Records</p>
        <p className="text-2xl font-bold text-indigo-900 mt-2">{total}</p>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" size={18} />
            <input
              type="text"
              placeholder="Search by action or entity type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
          >
            <option value="">All Actions</option>
            {getUniqueActions().map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Results */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p className="animate-pulse">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History size={40} className="mx-auto opacity-20 mb-2" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-blue-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-blue-900">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-900">Action</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-900">Entity Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-900">Entity ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-900">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-blue-700 dark:text-blue-300">{log.action}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{log.entity_id}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} logs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded font-medium transition disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white rounded font-medium transition disabled:opacity-50"
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
