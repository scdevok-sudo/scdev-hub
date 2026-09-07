export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function formatMoney(value: number | null | undefined): string {
  return money.format(Number(value ?? 0))
}

export function formatHours(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} h`
}

export function formatPct(value: number | null | undefined): string {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const date = new Date(iso)
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Suma en pasos de 0.25 respetando el rango 0.25 - 24. */
export function clampHours(value: number): number {
  const stepped = Math.round(value * 4) / 4
  return Math.min(24, Math.max(0.25, stepped))
}
