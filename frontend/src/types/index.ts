export type Role = 'admin' | 'collaborator'
export type ProjectStatus = 'active' | 'paused' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: Role
  created_at?: string
}

export interface UserWithHours extends User {
  hours_this_month: number
}

export interface Project {
  id: string
  name: string
  client_name: string
  description: string | null
  status: ProjectStatus
  structure_pct: number
  billed_amount: number | null
  estimated_hours: number | null
  created_by: string | null
  created_at?: string
  updated_at?: string
  logged_hours: number
  open_tasks: number
  member_ids: string[]
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  description: string | null
  details: string | null
  checklist: ChecklistItem[]
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  claim_status: ClaimStatus | null
  claimed_by: string | null
  created_by: string | null
  created_at?: string
  updated_at?: string
  assignee: User | null
  claimer: User | null
}

export interface PendingClaim {
  task: Task
  project_id: string | null
  project_name: string | null
  claimer: User | null
}

export interface ProjectMember {
  id: string
  project_id: string | null
  user_id: string | null
  created_at?: string
  user: User | null
}

export interface TaskComment {
  id: string
  task_id: string | null
  user_id: string | null
  content: string
  created_at?: string
  user: User | null
}

export interface TimeLog {
  id: string
  project_id: string | null
  user_id: string | null
  task_id: string | null
  description: string
  hours: number
  logged_date: string
  created_at?: string
  user: User | null
  project_name: string | null
  task_title: string | null
  editable: boolean
}

export interface PayoutRow {
  user: User
  hours: number
  share_pct: number
  payout: number
}

export interface ProjectSummary {
  project_id: string
  billed_amount: number
  structure_pct: number
  structure_amount: number
  distributable: number
  total_hours: number
  rows: PayoutRow[]
}

export interface DashboardData {
  hours_this_month: number
  estimated_payout: number
  active_projects: number
  pending_tasks: number
  recent_logs: TimeLog[]
}

export interface ProjectInput {
  name: string
  client_name: string
  description?: string | null
  status?: ProjectStatus
  structure_pct?: number
  billed_amount?: number
  estimated_hours?: number | null
}

export interface TaskInput {
  title: string
  description?: string | null
  details?: string | null
  checklist?: ChecklistItem[]
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string | null
}

export interface TimeLogInput {
  project_id: string
  task_id?: string | null
  description: string
  hours: number
  logged_date?: string
}

export type EstadoPago = 'al_dia' | 'pendiente' | 'atrasado'
export type InvoiceEstado = 'pendiente' | 'parcial' | 'cobrado'
export type Recurrencia = 'mensual' | 'anual' | 'unico'
export type ServiceEstado = 'activo' | 'pausado' | 'cancelado'
export type GastoTipo = 'personal' | 'agencia'

export interface Client {
  id: string
  name: string
  rubro: string | null
  ubicacion: string | null
  telefono: string | null
  email: string | null
  instagram: string | null
  web: string | null
  estado_pago: EstadoPago
  notas: string | null
  created_at?: string
}

export interface ClientInput {
  name: string
  rubro?: string | null
  ubicacion?: string | null
  telefono?: string | null
  email?: string | null
  instagram?: string | null
  web?: string | null
  estado_pago?: EstadoPago
  notas?: string | null
}

export interface ClientService {
  id: string
  client_id: string
  servicio: string
  monto_mensual: number | null
  fecha_inicio: string | null
  proxima_fecha_vencimiento: string | null
  recurrencia: Recurrencia
  estado: ServiceEstado
  client_name: string | null
}

export interface ClientServiceInput {
  servicio: string
  monto_mensual?: number | null
  fecha_inicio?: string | null
  proxima_fecha_vencimiento?: string | null
  recurrencia?: Recurrencia
  estado?: ServiceEstado
}

export interface Invoice {
  id: string
  client_id: string
  project_id: string | null
  servicio: string | null
  monto: number
  iibb: number | null
  neto: number | null
  anticipo: number | null
  saldo_pendiente: number | null
  estado: InvoiceEstado
  fecha: string
  fecha_seguimiento: string | null
  notas: string | null
  created_at?: string
  client_name: string | null
}

export interface InvoiceInput {
  client_id: string
  project_id?: string | null
  servicio?: string | null
  monto: number
  anticipo?: number
  estado?: InvoiceEstado
  fecha: string
  fecha_seguimiento?: string | null
  notas?: string | null
}

export interface RecurringExpense {
  id: string
  concepto: string
  categoria: string | null
  monto: number
  tipo: GastoTipo
  frecuencia: string | null
  activo: boolean | null
}

export interface RecurringExpenseInput {
  concepto: string
  categoria?: string | null
  monto: number
  tipo: GastoTipo
  frecuencia?: string
  activo?: boolean
}

export interface ExpenseLogEntry {
  id: string
  fecha: string
  concepto: string
  categoria: string | null
  monto: number
  tipo: GastoTipo
  project_id: string | null
}

export interface ExpenseLogInput {
  fecha: string
  concepto: string
  categoria?: string | null
  monto: number
  tipo: GastoTipo
  project_id?: string | null
}

export interface PersonalIncome {
  id: string
  concepto: string
  monto: number
  fecha: string
  recurrente: boolean | null
  fuente: string | null
}

export interface PersonalIncomeInput {
  concepto: string
  monto: number
  fecha: string
  recurrente?: boolean
  fuente?: string | null
}

export interface ClientServicesPipelineResponse {
  services: ClientService[]
}

export interface InvoicesPipeline {
  invoices: Invoice[]
  total_saldo_pendiente: number
}

export interface InvoicesResumen {
  mes: string
  facturado: number
  iibb: number
  neto: number
  cantidad_facturas: number
}

export interface FinanceResumenAgencia {
  mes: string
  facturado: number
  iibb: number
  neto: number
  gastos_agencia: number
  ganancia: number
}

export interface FinanceResumenPersonal {
  mes: string
  ingresos: number
  gastos: number
  balance: number
}

// -------------------------------------------------------------- Calculadora

export type TipoPrecio = 'fijo' | 'por_hora'

export interface PricingConfig {
  id: string
  tarifa_hora_estandar: number
  tarifa_hora_scope_creep: number
  tasa_iibb: number
  dolar_oficial: number | null
  descuento_alianza_balance_min: number | null
  descuento_alianza_balance_max: number | null
  updated_at?: string
}

export interface CatalogPreset {
  id: string
  nombre: string
  tipo_precio: TipoPrecio
  precio_fijo: number | null
  horas_estimadas: number | null
  activo: boolean | null
}

export interface HostingTier {
  id: string
  nombre: string
  precio_mensual: number
  orden: number | null
}

export interface SimularRequest {
  preset_id?: string | null
  horas?: number | null
  tarifa_hora?: number | null
  gastos_directos?: number
  incluir_hosting_tier_id?: string | null
  alianza_balance?: boolean
  descuento_alianza_pct?: number | null
  cliente_id?: string | null
}

export interface SimularOut {
  subtotal: number
  subtotal_con_hosting: number
  descuento: number
  descuento_pct_aplicado: number
  base: number
  iibb: number
  total: number
  margen_pct: number
  cliente_nombre: string | null
}
