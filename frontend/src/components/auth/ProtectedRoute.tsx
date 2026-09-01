import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { RefreshCw } from 'lucide-react'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">Authenticating session...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
