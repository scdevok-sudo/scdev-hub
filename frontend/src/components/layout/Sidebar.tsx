import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Calculator,
  CheckSquare,
  Clock,
  DollarSign,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Settings,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban, end: false },
  { to: '/mis-horas', label: 'Mis horas', icon: Clock, end: false },
]

export function Sidebar() {
  const { isAdmin } = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen)
  const closeMobileNav = useUiStore((s) => s.closeMobileNav)
  const location = useLocation()

  // Al navegar a una ruta nueva desde el drawer mobile, se cierra solo.
  useEffect(() => {
    closeMobileNav()
  }, [location.pathname, closeMobileNav])

  const links = isAdmin
    ? [
        ...LINKS,
        { to: '/finanzas', label: 'Finanzas', icon: DollarSign, end: false },
        { to: '/calculadora', label: 'Calculadora', icon: Calculator, end: false },
        { to: '/pendientes', label: 'Pendientes', icon: CheckSquare, end: false },
        { to: '/admin', label: 'Admin', icon: Settings, end: false },
      ]
    : LINKS

  return (
    <>
      {/* Overlay solo mobile, mismo patron que Modal (fixed inset-0 + click cierra). */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-[2px] md:hidden"
          onClick={closeMobileNav}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-graphite transition-transform duration-200',
          'md:z-30 md:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-dim text-red'
                    : 'text-txt2 hover:bg-graphite2 hover:text-txt',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-txt2 transition-colors hover:bg-graphite2 hover:text-txt"
          >
            <LogOut className="size-4 shrink-0" />
            Salir
          </button>
        </div>
      </aside>
    </>
  )
}
