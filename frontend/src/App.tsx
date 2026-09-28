import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import Admin from '@/pages/Admin'
import AuthCallback from '@/pages/AuthCallback'
import Calculadora from '@/pages/Calculadora'
import Dashboard from '@/pages/Dashboard'
import Finance from '@/pages/Finance'
import Login from '@/pages/Login'
import MyHours from '@/pages/MyHours'
import ProjectDetail from '@/pages/ProjectDetail'
import Projects from '@/pages/Projects'

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-onix">
      <Loader2 className="size-6 animate-spin text-red" />
    </div>
  )
}

function Protected({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loaded } = useAuthStore()
  const location = useLocation()

  if (!loaded) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <>
      <Sidebar />
      {children}
    </>
  )
}

export default function App() {
  const { fetchMe, loaded, user } = useAuthStore()

  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

  return (
    <Routes>
      <Route
        path="/login"
        element={loaded && user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/proyectos"
        element={
          <Protected>
            <Projects />
          </Protected>
        }
      />
      <Route
        path="/proyectos/:id"
        element={
          <Protected>
            <ProjectDetail />
          </Protected>
        }
      />
      <Route
        path="/mis-horas"
        element={
          <Protected>
            <MyHours />
          </Protected>
        }
      />
      <Route
        path="/finanzas"
        element={
          <Protected adminOnly>
            <Finance />
          </Protected>
        }
      />
      <Route
        path="/calculadora"
        element={
          <Protected adminOnly>
            <Calculadora />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected adminOnly>
            <Admin />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
