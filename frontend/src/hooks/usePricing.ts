import { api } from '@/lib/api'
import { useAsync } from '@/hooks/useAsync'
import type { CatalogPreset, HostingTier, PricingConfig, SimularOut, SimularRequest } from '@/types'

export function usePricingConfig() {
  return useAsync<PricingConfig>(() => api.get<PricingConfig>('/pricing-config'), [])
}

export function useCatalogPresets() {
  return useAsync<CatalogPreset[]>(() => api.get<CatalogPreset[]>('/catalog-presets'), [])
}

export function useHostingTiers() {
  return useAsync<HostingTier[]>(() => api.get<HostingTier[]>('/hosting-tiers'), [])
}

export async function simularPresupuesto(payload: SimularRequest) {
  return api.post<SimularOut>('/calculadora/simular', payload)
}
