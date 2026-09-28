import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { ErrorState, Loading } from '@/components/ui/States'
import { InvoiceTable } from '@/components/finance/InvoiceTable'
import { ClientsGrid } from '@/components/finance/ClientsGrid'
import { UpcomingList } from '@/components/finance/UpcomingList'
import { RecurringExpenseList } from '@/components/finance/RecurringExpenseList'
import { ExpenseLogTable } from '@/components/finance/ExpenseLogTable'
import { PersonalIncomeTable } from '@/components/finance/PersonalIncomeTable'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { useClients, useResumenAgencia, useResumenPersonal } from '@/hooks/useFinance'
import { cn, formatMoney } from '@/lib/utils'
import type { GastoTipo } from '@/types'

type Tab = 'agencia' | 'personal'

export default function Finance() {
  const [tab, setTab] = useState<Tab>('agencia')
  const now = new Date()
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <PageWrapper
      crumbs={[{ label: 'Finanzas' }]}
      title="Finanzas"
      subtitle="Agencia y personal, sin mezclar"
    >
      <div className="mb-5 flex gap-1 border-b border-line">
        {(['agencia', 'personal'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === key ? 'border-red text-txt' : 'border-transparent text-txt2 hover:text-txt',
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === 'agencia' ? <AgenciaTab mes={mes} /> : <PersonalTab mes={mes} />}
    </PageWrapper>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-graphite p-4">
      <p className="text-[11px] uppercase tracking-wide text-txt3">{label}</p>
      <p className={cn('mt-1 font-display text-xl', accent ? 'text-red' : 'text-txt')}>{value}</p>
    </div>
  )
}

function AgenciaTab({ mes }: { mes: string }) {
  const { data: resumen, loading, error } = useResumenAgencia(mes)
  const { data: clients, reload: reloadClients } = useClients()
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [gastosKey, setGastosKey] = useState(0)

  return (
    <div className="space-y-8">
      <section>
        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {resumen && (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Facturado" value={formatMoney(resumen.facturado)} />
            <Stat label="IIBB" value={formatMoney(resumen.iibb)} />
            <Stat label="Neto" value={formatMoney(resumen.neto)} />
            <Stat label="Gastos agencia" value={formatMoney(resumen.gastos_agencia)} />
            <Stat label="Ganancia" value={formatMoney(resumen.ganancia)} accent />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-txt">Facturas</h2>
        <InvoiceTable clients={clients ?? []} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-txt">Clientes</h2>
        <ClientsGrid />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-txt">Vencimientos proximos</h2>
        <UpcomingList />
      </section>

      <ExpenseSection tipo="agencia" gastosKey={gastosKey} onOpenForm={() => setExpenseFormOpen(true)} />

      <ExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSaved={() => {
          setGastosKey((k) => k + 1)
          reloadClients()
        }}
        tipo="agencia"
      />
    </div>
  )
}

function PersonalTab({ mes }: { mes: string }) {
  const { data: resumen, loading, error } = useResumenPersonal(mes)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [gastosKey, setGastosKey] = useState(0)

  return (
    <div className="space-y-8">
      <section>
        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {resumen && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Ingresos del mes" value={formatMoney(resumen.ingresos)} />
            <Stat label="Gastos personales" value={formatMoney(resumen.gastos)} />
            <Stat label="Balance" value={formatMoney(resumen.balance)} accent />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-txt">Ingresos</h2>
        <PersonalIncomeTable />
      </section>

      <ExpenseSection tipo="personal" gastosKey={gastosKey} onOpenForm={() => setExpenseFormOpen(true)} />

      <ExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSaved={() => setGastosKey((k) => k + 1)}
        tipo="personal"
      />
    </div>
  )
}

function ExpenseSection({
  tipo,
  gastosKey,
  onOpenForm,
}: {
  tipo: GastoTipo
  gastosKey: number
  onOpenForm: () => void
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-txt">Gastos</h2>
        <Button size="sm" icon={<Plus className="size-4" />} onClick={onOpenForm}>
          Nuevo gasto
        </Button>
      </div>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-txt3">Fijos / recurrentes</p>
          <RecurringExpenseList tipo={tipo} refreshKey={gastosKey} />
        </div>
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-txt3">Puntuales</p>
          <ExpenseLogTable tipo={tipo} refreshKey={gastosKey} />
        </div>
      </div>
    </section>
  )
}
