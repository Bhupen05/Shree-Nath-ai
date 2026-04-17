import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PublicOnlyRoute from './components/layout/PublicOnlyRoute'
import ForbiddenPage from './pages/ForbiddenPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import BillingPage from './pages/modules/BillingPage'
import CustomersPage from './pages/modules/CustomersPage'
import DashboardPage from './pages/modules/DashboardPage'
import InventoryPage from './pages/modules/InventoryPage'

function App() {
  return (
    <BrowserRouter>
      <main className="shell">
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route element={<ProtectedRoute requiredPermission="dashboard:read" />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="inventory:read" />}>
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="billing:read" />}>
                <Route path="/billing" element={<BillingPage />} />
              </Route>
              <Route element={<ProtectedRoute requiredPermission="customers:read" />}>
                <Route path="/customers" element={<CustomersPage />} />
              </Route>
            </Route>
          </Route>

          {/* <Route path="/forbidden" element={<ForbiddenPage />} /> */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
