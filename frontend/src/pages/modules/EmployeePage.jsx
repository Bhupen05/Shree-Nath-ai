import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import FormField from '../../components/ui/FormField';
import { fetchEmployees, createEmployee, updateEmployee } from '../../auth';

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

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm('Are you sure? This will deactivate the employee.')) {
      return;
    }

    try {
      await updateEmployee(empId, { isActive: false });
      await loadEmployees();
    } catch (error) {
      console.error('Error deactivating employee:', error);
      alert('Failed to deactivate employee');
    }
  };

  const columns = [
    { key: 'emp_code', label: 'Employee Code' },
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (value ? 'Active' : 'Inactive'),
    },
  ];

  const actions = [
    {
      label: 'View',
      onClick: (row) => setSelectedEmployee(row),
    },
    {
      label: 'Delete',
      onClick: (row) => handleDeleteEmployee(row.id),
      destructive: true,
    },
  ];

  if (selectedEmployee) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelectedEmployee(null)} className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">Employee Details</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Code</label>
              <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded">{selectedEmployee.emp_code}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded">{selectedEmployee.full_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded">{selectedEmployee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded">{selectedEmployee.phone || 'N/A'}</p>
            </div>
          </div>

          {selectedEmployee.roles && selectedEmployee.roles.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Roles</label>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.roles.map((role) => (
                  <span key={role.roleId} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    {role.roleName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <p className={`inline-block px-3 py-1 rounded ${selectedEmployee.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              {selectedEmployee.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>

          <button onClick={() => setSelectedEmployee(null)} className="mt-4 px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400">
            Back
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="primary">
          <Plus size={18} className="mr-2" />
          New Employee
        </Button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Create New Employee</h3>
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
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or employee code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>
      </div>

      {isLoadingPage ? (
        <div className="text-center py-8">Loading employees...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No employees found</div>
      ) : (
        <DataTable columns={columns} data={filteredEmployees} actions={actions} />
      )}
    </Card>
  );
}
