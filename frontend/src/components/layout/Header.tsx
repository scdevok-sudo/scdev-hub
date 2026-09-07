import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export interface Crumb {
  label: string
  to?: string
}

export function Header({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  const { user, isAdmin } = useCurrentUser()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-onix/90 px-8 backdrop-blur">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-txt3" />}
              {crumb.to && !last ? (
                <Link to={crumb.to} className="text-txt2 transition-colors hover:text-txt">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-txt">{crumb.label}</span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-4">
        {actions}
        <div className="flex items-center gap-2.5 border-l border-line pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight text-txt">{user?.name}</p>
            <p className="text-[11px] leading-tight text-txt3">
              {isAdmin ? 'Admin' : 'Colaborador'}
            </p>
          </div>
          <Avatar user={user} size="md" />
        </div>
      </div>
    </header>
  )
}
