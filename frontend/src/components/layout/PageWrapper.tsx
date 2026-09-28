import type { ReactNode } from 'react'
import { Header, type Crumb } from '@/components/layout/Header'

interface PageWrapperProps {
  crumbs: Crumb[]
  actions?: ReactNode
  title?: string
  subtitle?: string
  children: ReactNode
}

export function PageWrapper({ crumbs, actions, title, subtitle, children }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col md:ml-60">
      <Header crumbs={crumbs} actions={actions} />
      <main className="flex-1 px-4 py-6 md:px-8">
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-normal text-txt">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-txt2">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
