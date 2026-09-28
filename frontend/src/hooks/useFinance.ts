import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type {
  Client,
  ClientInput,
  ClientService,
  ClientServiceInput,
  ClientServicesPipelineResponse,
  ExpenseLogEntry,
  ExpenseLogInput,
  FinanceResumenAgencia,
  FinanceResumenPersonal,
  GastoTipo,
  Invoice,
  InvoiceInput,
  InvoicesPipeline,
  InvoicesResumen,
  PersonalIncome,
  PersonalIncomeInput,
  RecurringExpense,
  RecurringExpenseInput,
} from '@/types'

// ------------------------------------------------------------------ Clients

export function useClients() {
  return useAsync<Client[]>(() => api.get<Client[]>('/clients'), [])
}

export async function createClient(input: ClientInput) {
  return api.post<Client>('/clients', input)
}

export async function updateClient(id: string, input: Partial<ClientInput>) {
  return api.patch<Client>(`/clients/${id}`, input)
}

export async function deleteClient(id: string) {
  return api.delete(`/clients/${id}`)
}

export function useClientServices(clientId: string | undefined) {
  return useAsync<ClientService[]>(
    () => (clientId ? api.get<ClientService[]>(`/clients/${clientId}/services`) : Promise.resolve([])),
    [clientId],
  )
}

export async function createClientService(clientId: string, input: ClientServiceInput) {
  return api.post<ClientService>(`/clients/${clientId}/services`, input)
}

export async function updateClientService(id: string, input: Partial<ClientServiceInput>) {
  return api.patch<ClientService>(`/client-services/${id}`, input)
}

export async function deleteClientService(id: string) {
  return api.delete(`/client-services/${id}`)
}

export function useClientServicesPipeline(dias = 15) {
  return useAsync<ClientServicesPipelineResponse>(
    () => api.get<ClientServicesPipelineResponse>('/client-services/pipeline', { dias }),
    [dias],
  )
}

// ----------------------------------------------------------------- Invoices

export function useInvoices(filters: { clientId?: string; estado?: string; mes?: string }) {
  return useAsync<Invoice[]>(
    () =>
      api.get<Invoice[]>('/invoices', {
        client_id: filters.clientId,
        estado: filters.estado,
        mes: filters.mes,
      }),
    [filters.clientId, filters.estado, filters.mes],
  )
}

export async function createInvoice(input: InvoiceInput) {
  return api.post<Invoice>('/invoices', input)
}

export async function updateInvoice(id: string, input: Partial<InvoiceInput> & { saldo_pendiente?: number }) {
  return api.patch<Invoice>(`/invoices/${id}`, input)
}

export async function deleteInvoice(id: string) {
  return api.delete(`/invoices/${id}`)
}

export function useInvoicesPipeline() {
  return useAsync<InvoicesPipeline>(() => api.get<InvoicesPipeline>('/invoices/pipeline'), [])
}

export function useInvoicesResumen(mes: string) {
  return useAsync<InvoicesResumen>(() => api.get<InvoicesResumen>('/invoices/resumen', { mes }), [mes])
}

// ---------------------------------------------------------- Recurring expenses

export function useRecurringExpenses(tipo: GastoTipo) {
  return useAsync<RecurringExpense[]>(
    () => api.get<RecurringExpense[]>('/recurring-expenses', { tipo }),
    [tipo],
  )
}

export async function createRecurringExpense(input: RecurringExpenseInput) {
  return api.post<RecurringExpense>('/recurring-expenses', input)
}

export async function updateRecurringExpense(id: string, input: Partial<RecurringExpenseInput>) {
  return api.patch<RecurringExpense>(`/recurring-expenses/${id}`, input)
}

export async function deleteRecurringExpense(id: string) {
  return api.delete(`/recurring-expenses/${id}`)
}

// ---------------------------------------------------------------- Expense log

export function useExpenseLog(tipo: GastoTipo) {
  return useAsync<ExpenseLogEntry[]>(() => api.get<ExpenseLogEntry[]>('/expense-log', { tipo }), [tipo])
}

export async function createExpenseLog(input: ExpenseLogInput) {
  return api.post<ExpenseLogEntry>('/expense-log', input)
}

export async function deleteExpenseLog(id: string) {
  return api.delete(`/expense-log/${id}`)
}

// ------------------------------------------------------------ Personal income

export function usePersonalIncome() {
  return useAsync<PersonalIncome[]>(() => api.get<PersonalIncome[]>('/personal-income'), [])
}

export async function createPersonalIncome(input: PersonalIncomeInput) {
  return api.post<PersonalIncome>('/personal-income', input)
}

export async function updatePersonalIncome(id: string, input: Partial<PersonalIncomeInput>) {
  return api.patch<PersonalIncome>(`/personal-income/${id}`, input)
}

export async function deletePersonalIncome(id: string) {
  return api.delete(`/personal-income/${id}`)
}

// --------------------------------------------------------- Resumenes combinados

export function useResumenAgencia(mes: string) {
  return useAsync<FinanceResumenAgencia>(
    () => api.get<FinanceResumenAgencia>('/finance/resumen-agencia', { mes }),
    [mes],
  )
}

export function useResumenPersonal(mes: string) {
  return useAsync<FinanceResumenPersonal>(
    () => api.get<FinanceResumenPersonal>('/finance/resumen-personal', { mes }),
    [mes],
  )
}
