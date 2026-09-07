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
    <div className="ml-60 flex min-h-screen flex-col">
      <Header crumbs={crumbs} actions={actions} />
      <main className="flex-1 px-8 py-6">
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
