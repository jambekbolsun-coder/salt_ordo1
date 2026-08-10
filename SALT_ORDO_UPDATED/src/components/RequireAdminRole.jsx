import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

export default function RequireAdminRole({ roles }) {
  const { role } = useAuth()
  if (!role || !roles.includes(role)) return <Navigate to="/admin" replace />
  return <Outlet />
}
