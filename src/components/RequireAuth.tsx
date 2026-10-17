import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-soft">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
