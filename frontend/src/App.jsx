import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { getToken } from './auth'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const token = getToken()

  return (
    <main className="shell">
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/profile"
            element={token ? <ProfilePage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="*"
            element={<Navigate to={token ? '/profile' : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
    </main>
  )
}

export default App
