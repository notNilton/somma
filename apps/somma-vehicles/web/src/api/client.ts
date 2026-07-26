import { AnalyticsSummary, CreateRefuelingPayload, CreateVehiclePayload, RefuelingLog, Vehicle } from '../types'

const API_BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let errMsg = 'Erro na requisição'
    try {
      const err = await res.json()
      errMsg = err.error || errMsg
    } catch {
      /* ignore */
    }
    throw new Error(errMsg)
  }

  if (res.status === 204) {
    return {} as T
  }

  return res.json()
}

export const api = {
  // Vehicles
  getVehicles: () => fetchJson<Vehicle[]>('/vehicles'),
  getVehicle: (id: string) => fetchJson<Vehicle>(`/vehicles/${id}`),
  createVehicle: (data: CreateVehiclePayload) =>
    fetchJson<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVehicle: (id: string, data: Partial<CreateVehiclePayload>) =>
    fetchJson<Vehicle>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteVehicle: (id: string) =>
    fetchJson<void>(`/vehicles/${id}`, { method: 'DELETE' }),

  // Refuelings
  getRefuelings: (vehicleId?: string) => {
    const query = vehicleId ? `?vehicle_id=${vehicleId}` : ''
    return fetchJson<RefuelingLog[]>(`/refuelings${query}`)
  },
  createRefueling: (data: CreateRefuelingPayload) =>
    fetchJson<RefuelingLog>('/refuelings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRefueling: (id: string, data: Partial<CreateRefuelingPayload>) =>
    fetchJson<RefuelingLog>(`/refuelings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRefueling: (id: string) =>
    fetchJson<void>(`/refuelings/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: () => fetchJson<AnalyticsSummary>('/analytics'),
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatKm(km: number): string {
  return km.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km'
}
