import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { setupOfflineSync } from "./offlineQueue";
import { replayQueuedRequest } from "./auth";
import Dashboard from "./pages/Dashboard";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import ForbiddenPage from "./pages/ForbiddenPage";
import Inventory from "./pages/Inventory";
import Billing from "./pages/Billing";
import Panel from "./pages/Panel";
import Reports from "./pages/Reports";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";

// Shared Loading Screen UI
const LOADING_SCREEN = (
  <div className="flex min-h-screen items-center justify-center bg-surface p-6 text-on-surface">
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Connecting Session
      </p>
      <p className="mt-2 text-sm text-on-surface-variant">
        Checking authentication state with backend...
      </p>
    </div>
  </div>
);

// Protected Route Component
function ProtectedRoute({ user, ready, children }) {
  if (!ready) {
    return LOADING_SCREEN;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route Component (redirects if already logged in)
function PublicRoute({ user, ready, children }) {
  if (!ready) {
    return LOADING_SCREEN;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const { user, ready } = useAuth();

  // Initialize offline sync when user authenticates
  useEffect(() => {
    if (user && ready) {
      console.log("[App] User authenticated, initializing offline sync");

      const cleanup = setupOfflineSync({
        requestAdapter: replayQueuedRequest,
        onSynced: (result) => {
          console.log("[App] Offline queue synced:", result);
        },
      });

      return cleanup;
    }
  }, [user, ready]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute user={user} ready={ready}>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute user={user} ready={ready}>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user} ready={ready}>
            <Panel />
          </ProtectedRoute>
        }
      > 
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory/>} />
        <Route path="billing" element={<Billing />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route
        path="/profile"
        element={
          <ProtectedRoute user={user} ready={ready}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Error route */}
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Catch-all: redirect to dashboard or login */}
      <Route
        path="*"
        element={
          !ready ? (
            LOADING_SCREEN
          ) : user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
