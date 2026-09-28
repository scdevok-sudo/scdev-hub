import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Field, inputClass } from '@/components/ui/Field'
import { ErrorState, Loading } from '@/components/ui/States'
import { useClients } from '@/hooks/useFinance'
import { useCatalogPresets, useHostingTiers, usePricingConfig, simularPresupuesto } from '@/hooks/usePricing'
import { ApiError } from '@/lib/api'
import { cn, formatMoney, formatPct } from '@/lib/utils'
import type { SimularOut } from '@/types'

const SIN_PRESET = '__manual__'
const SIN_HOSTING = '__sin_hosting__'

export default function Calculadora() {
  const { data: config, loading: loadingConfig, error: errorConfig } = usePricingConfig()
  const { data: presets } = useCatalogPresets()
  const { data: tiers } = useHostingTiers()
  const { data: clients } = useClients()

  const [presetId, setPresetId] = useState(SIN_PRESET)
  const [horas, setHoras] = useState<number | ''>('')
  const [tarifaHora, setTarifaHora] = useState<number | ''>('')
  const [hostingTierId, setHostingTierId] = useState(SIN_HOSTING)
  const [alianzaBalance, setAlianzaBalance] = useState(false)
  const [gastosDirectos, setGastosDirectos] = useState<number | ''>(0)
  const [clienteId, setClienteId] = useState('')

  const [result, setResult] = useState<SimularOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const preset = presets?.find((p) => p.id === presetId)

  // Precarga tarifa estandar desde config apenas esta disponible.
  useEffect(() => {
    if (config && tarifaHora === '') setTarifaHora(Number(config.tarifa_hora_estandar))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  // Al elegir un preset por hora, precarga sus horas estimadas (si tiene).
  useEffect(() => {
    if (preset?.tipo_precio === 'por_hora' && preset.horas_estimadas != null) {
      setHoras(Number(preset.horas_estimadas))
    }
  }, [preset])

  useEffect(() => {
    if (!config) return
    const timer = setTimeout(() => {
      setError(null)
      simularPresupuesto({
        preset_id: presetId === SIN_PRESET ? null : presetId,
        horas: horas === '' ? null : horas,
        tarifa_hora: tarifaHora === '' ? null : tarifaHora,
        gastos_directos: gastosDirectos === '' ? 0 : gastosDirectos,
        incluir_hosting_tier_id: hostingTierId === SIN_HOSTING ? null : hostingTierId,
        alianza_balance: alianzaBalance,
        cliente_id: clienteId || null,
      })
        .then(setResult)
        .catch((err) => {
          setResult(null)
          setError(err instanceof ApiError ? err.message : 'No se pudo calcular')
        })
    }, 250)
    return () => clearTimeout(timer)
  }, [config, presetId, horas, tarifaHora, gastosDirectos, hostingTierId, alianzaBalance, clienteId])

  const semaforo = useMemo(() => {
    if (!result) return null
    if (result.margen_pct >= 30) return { label: 'Margen sano', className: 'bg-emerald-500/12 text-emerald-400' }
    if (result.margen_pct >= 15) return { label: 'Margen ajustado', className: 'bg-amber-500/12 text-amber-400' }
    return { label: 'Margen bajo', className: 'bg-red-dim text-red' }
  }, [result])

  const copiarDesglose = async () => {
    if (!result) return
    const lineas = [
      preset && preset.id !== SIN_PRESET ? `Servicio: ${preset.nombre}` : 'Servicio: manual',
      result.cliente_nombre ? `Cliente: ${result.cliente_nombre}` : null,
      `Subtotal: ${formatMoney(result.subtotal)}`,
      result.subtotal_con_hosting !== result.subtotal
        ? `Subtotal con hosting: ${formatMoney(result.subtotal_con_hosting)}`
        : null,
      result.descuento > 0
        ? `Descuento Alianza Balance (${formatPct(result.descuento_pct_aplicado)}): -${formatMoney(result.descuento)}`
        : null,
      `IIBB: ${formatMoney(result.iibb)}`,
      `Total: ${formatMoney(result.total)}`,
      `Margen: ${result.margen_pct.toFixed(1)}%`,
    ].filter(Boolean)

    try {
      await navigator.clipboard.writeText(lineas.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar al portapapeles')
    }
  }

  if (loadingConfig) {
    return (
      <PageWrapper crumbs={[{ label: 'Calculadora' }]}>
        <Loading />
      </PageWrapper>
    )
  }

  if (errorConfig || !config) {
    return (
      <PageWrapper crumbs={[{ label: 'Calculadora' }]}>
        <ErrorState message={errorConfig ?? 'No se pudo cargar la configuracion de precios'} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      crumbs={[{ label: 'Calculadora' }]}
      title="Calculadora de precio"
      subtitle="Simulacion rapida — no guarda nada, solo calcula"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 rounded-xl border border-line bg-graphite p-5">
          <Field label="Servicio">
            <select className={inputClass} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value={SIN_PRESET}>Manual (sin preset)</option>
              {presets
                ?.filter((p) => p.activo !== false)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.tipo_precio === 'fijo' && p.precio_fijo != null ? ` — ${formatMoney(p.precio_fijo)}` : ''}
                  </option>
                ))}
            </select>
          </Field>

          {(!preset || preset.tipo_precio === 'por_hora') && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Horas" required>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.5"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>
              <Field label="Tarifa por hora" required hint="Precargada, editable">
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={tarifaHora}
                  onChange={(e) => setTarifaHora(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Field>
            </div>
          )}

          <Field label="Hosting">
            <select
              className={inputClass}
              value={hostingTierId}
              onChange={(e) => setHostingTierId(e.target.value)}
            >
              <option value={SIN_HOSTING}>Sin hosting</option>
              {tiers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} — {formatMoney(t.precio_mensual)}/mes
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gastos directos del proyecto">
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={gastosDirectos}
              onChange={(e) => setGastosDirectos(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>

          <Field label="Cliente" hint="Opcional, para dejar registrado a quien se cotizo">
            <select className={inputClass} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm text-txt2">
            <input
              type="checkbox"
              checked={alianzaBalance}
              onChange={(e) => setAlianzaBalance(e.target.checked)}
              className="size-4 rounded border-line bg-graphite2 accent-red"
            />
            Alianza Balance (aplica descuento configurado)
          </label>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-graphite p-5">
            {error && <ErrorState message={error} />}

            {result && !error && (
              <div className="space-y-3">
                <Row label="Subtotal" value={formatMoney(result.subtotal)} />
                {result.subtotal_con_hosting !== result.subtotal && (
                  <Row label="Con hosting" value={formatMoney(result.subtotal_con_hosting)} />
                )}
                {result.descuento > 0 && (
                  <Row
                    label={`Descuento (${formatPct(result.descuento_pct_aplicado)})`}
                    value={`-${formatMoney(result.descuento)}`}
                    muted
                  />
                )}
                <Row label="Gastos directos" value={formatMoney(gastosDirectos === '' ? 0 : gastosDirectos)} muted />
                <Row label="IIBB" value={formatMoney(result.iibb)} muted />
                <div className="border-t border-line pt-3">
                  <Row label="Total" value={formatMoney(result.total)} big />
                </div>

                {semaforo && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                      semaforo.className,
                    )}
                  >
                    {semaforo.label} · {result.margen_pct.toFixed(1)}%
                  </span>
                )}

                <button
                  onClick={copiarDesglose}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-graphite2 px-3 py-2 text-sm font-medium text-txt2 transition-colors hover:text-txt"
                >
                  {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  {copied ? 'Copiado' : 'Copiar desglose'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function Row({
  label,
  value,
  muted = false,
  big = false,
}: {
  label: string
  value: string
  muted?: boolean
  big?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', muted ? 'text-txt3' : 'text-txt2')}>{label}</span>
      <span className={cn(big ? 'font-display text-xl text-txt' : 'text-sm text-txt', muted && 'text-txt3')}>
        {value}
      </span>
    </div>
  )
}
