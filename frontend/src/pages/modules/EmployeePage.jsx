import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Users, CheckCircle, AlertCircle, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import FormField from '../../components/ui/FormField';
import { fetchEmployees, createEmployee } from '../../auth';

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(
      (emp) =>
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.emp_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    setIsLoadingPage(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!formData.fullName || !formData.email) {
      alert('Full name and email are required');
      return;
    }

    try {
      await createEmployee(formData);
      setFormData({ fullName: '', phone: '', email: '' });
      setShowCreateForm(false);
      await loadEmployees();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    }
  };

  if (selectedEmployee) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded hover:bg-purple-100 dark:hover:bg-purple-900">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">Employee Details</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Employee Code</label>
              <p className="bg-purple-50 dark:bg-purple-900 p-2 rounded border border-purple-200 dark:border-purple-700">{selectedEmployee.emp_code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Full Name</label>
              <p className="bg-purple-50 dark:bg-purple-900 p-2 rounded border border-purple-200 dark:border-purple-700">{selectedEmployee.full_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Email</label>
              <p className="bg-purple-50 dark:bg-purple-900 p-2 rounded border border-purple-200 dark:border-purple-700">{selectedEmployee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Phone</label>
              <p className="bg-purple-50 dark:bg-purple-900 p-2 rounded border border-purple-200 dark:border-purple-700">{selectedEmployee.phone || 'N/A'}</p>
            </div>
          </div>

          {selectedEmployee.roles && selectedEmployee.roles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.roles.map((role) => (
                  <span key={role.roleId} className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900 dark:to-purple-800 dark:text-purple-100 rounded-full text-sm font-medium">
                    {role.roleName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Status</label>
            <p className={`inline-flex items-center gap-2 px-3 py-1 rounded font-medium ${selectedEmployee.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              {selectedEmployee.is_active ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {selectedEmployee.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>

          <button onClick={() => setSelectedEmployee(null)} className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded font-medium transition">
            Back
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100">Employee Management</h1>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Manage team members and roles</p>
          </div>
          <Users className="w-12 h-12 text-purple-400 opacity-50" />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-6">
          <p className="text-sm font-medium text-green-600">Active Employees</p>
          <p className="text-2xl font-bold text-green-900 mt-2">{employees.filter(e => e.is_active).length}</p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-6">
          <p className="text-sm font-medium text-orange-600">Total Employees</p>
          <p className="text-2xl font-bold text-orange-900 mt-2">{employees.length}</p>
        </Card>
      </div>

      {showCreateForm && (
        <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 p-6">
          <h3 className="text-lg font-bold text-purple-900 mb-4">Create New Employee</h3>
          <div className="space-y-4">
            <FormField
              label="Full Name"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter employee name"
            />
            <FormField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email"
            />
            <FormField
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateEmployee} variant="primary">
                Create Employee
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="primary" className="flex items-center gap-2">
            <Plus size={18} />
            New Employee
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-6">
        {isLoadingPage ? (
          <div className="text-center py-8 text-gray-500">
            <p className="animate-pulse">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={40} className="mx-auto opacity-20 mb-2" />
            <p>No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-purple-100 to-purple-50 border-b border-purple-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-purple-900">Employee Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-purple-900">Full Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-purple-900">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-purple-900">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-purple-900">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-purple-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-purple-100 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
                    <td className="px-4 py-3 font-mono text-purple-600">{employee.emp_code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{employee.full_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{employee.email}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{employee.phone || '-'}</td>
                    <td className="px-4 py-3">
                      {employee.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-medium">
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full text-xs font-medium">
                          <AlertCircle size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="px-3 py-1 text-sm text-purple-600 hover:text-purple-900 hover:bg-purple-100 dark:hover:bg-purple-900 rounded transition font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
