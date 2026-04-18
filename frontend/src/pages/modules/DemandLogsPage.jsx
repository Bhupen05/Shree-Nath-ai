import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Search, CheckCircle, Circle } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-300">
            <CheckCircle size={16} /> Fulfilled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
            <Circle size={16} /> Pending
          </span>
        ),
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-3xl font-bold">Demand Logs</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Track all customer queries and demands captured through the AI voice agent
      </p>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search query, phone, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <select
            value={filterFulfilled}
            onChange={(e) => setFilterFulfilled(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">All Status</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Demands</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Fulfilled</p>
          <p className="text-2xl font-bold">
            {logs.filter((l) => l.fulfilled).length}
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold">
            {logs.filter((l) => !l.fulfilled).length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading demand logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No demand logs found</div>
      ) : (
        <>
          <DataTable columns={columns} data={filteredLogs} />
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}{' '}
              demands
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
