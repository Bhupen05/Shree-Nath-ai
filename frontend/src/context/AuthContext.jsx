/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearToken, getProfile, getToken, hasPermission, login, register, saveToken } from '../auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const loadProfile = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setReady(true)
      return
    }

    try {
      const profile = await getProfile(token)
      setUser(profile.user)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const loginUser = useCallback(async (payload) => {
    const data = await login(payload)
    saveToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const registerUser = useCallback(async (payload) => {
    const data = await register(payload)
    saveToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const logoutUser = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      loginUser,
      registerUser,
      logoutUser,
      refreshProfile: loadProfile,
      can: (permission) => hasPermission(user?.permissions, permission),
    }),
    [user, ready, loginUser, registerUser, logoutUser, loadProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
