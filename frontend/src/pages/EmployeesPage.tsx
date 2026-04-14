import { useQuery } from "@tanstack/react-query";
import { DataState } from "../components/ui/DataState";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../lib/api";
import { roleMatrix } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";

export function EmployeesPage() {
  const token = useAuthStore((state) => state.token)!;

  const employeesQuery = useQuery({
    queryKey: ["employees", token],
    queryFn: () => api.getEmployees(token)
  });

  const activityQuery = useQuery({
    queryKey: ["activity-logs", token],
    queryFn: () => api.getActivityLogs(token)
  });

  return (
    <div className="page-grid">
      <section className="hero-panel compact">
        <div>
          <p className="eyebrow">Module 3</p>
          <h1>Employee Management</h1>
        </div>
        <p className="hero-copy">
          Admin onboarding, role assignment, forced first-login password change, and activity
          logging are reflected in the backend routes and this management surface.
        </p>
      </section>

      <div className="two-column-grid">
        <SectionCard title="Role Matrix" subtitle="Permissions from the documentation">
          <div className="table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Admin</th>
                  <th>Manager</th>
                  <th>Billing</th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row) => (
                  <tr key={row.permission}>
                    <td>{row.permission}</td>
                    <td>{row.Admin}</td>
                    <td>{row.Manager}</td>
                    <td>{row.Billing}</td>
                    <td>{row.Warehouse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Immutable audit trail">
          <DataState
            loading={activityQuery.isLoading}
            error={activityQuery.error instanceof Error ? activityQuery.error.message : null}
            empty={!activityQuery.data?.activityLogs.length}
            emptyMessage="Activity events will show up here once the team starts using the system."
          />
          <div className="feed-list">
            {activityQuery.data?.activityLogs.map((log) => (
              <div className="feed-item" key={log.id}>
                <span className="feed-time">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
                <strong>{log.employee?.fullName ?? "System"}</strong>
                <p>{log.action.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Employee Directory" subtitle="Admin CRUD over workforce accounts">
        <DataState
          loading={employeesQuery.isLoading}
          error={employeesQuery.error instanceof Error ? employeesQuery.error.message : null}
          empty={!employeesQuery.data?.employees.length}
          emptyMessage="No employees created yet."
        />
        <div className="table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Password reset</th>
              </tr>
            </thead>
            <tbody>
              {employeesQuery.data?.employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.fullName}</td>
                  <td>{employee.empCode}</td>
                  <td>{employee.roles.join(", ")}</td>
                  <td>{employee.isActive ? "Active" : "Inactive"}</td>
                  <td>{employee.mustChangePassword ? "Pending" : "Completed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
