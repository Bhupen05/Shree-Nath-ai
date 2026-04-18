import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
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
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
      </div>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by action or entity type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">All Actions</option>
            {getUniqueActions().map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading activity logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No activity logs found</div>
      ) : (
        <>
          <DataTable columns={columns} data={filteredLogs} />
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} logs
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
