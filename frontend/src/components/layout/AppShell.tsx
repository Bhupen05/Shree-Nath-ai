import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";

const navigation = [
  { to: "/", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/billing", label: "Billing" },
  { to: "/employees", label: "Employees" },
  { to: "/ai-agent", label: "AI Agent" },
  { to: "/reports", label: "Reports" }
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SN</div>
          <div>
            <p className="eyebrow">Auto Parts Ops</p>
            <h1>SIBMS</h1>
          </div>
        </div>

        <nav className="nav-stack">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="eyebrow">Signed in as</p>
          <p className="sidebar-user">{user?.fullName ?? "Team member"}</p>
          <p className="sidebar-meta">{user?.roles.join(", ")}</p>
          <button className="button ghost" onClick={clearSession} type="button">
            Sign out
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Smart Inventory & Business Management System</p>
            <h2>Auto-parts operations in one control room</h2>
          </div>

          <div className="topbar-meta">
            <span className="status-pill good">Live architecture scaffold</span>
            <span className="status-pill">PWA-ready</span>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
