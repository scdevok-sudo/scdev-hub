export type Role = 'admin' | 'collaborator'
export type ProjectStatus = 'active' | 'paused' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

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
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  created_by: string | null
  created_at?: string
  updated_at?: string
  assignee: User | null
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
