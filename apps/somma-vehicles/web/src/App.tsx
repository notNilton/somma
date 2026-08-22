import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from './components/AppLayout'
import { VehicleModal } from './components/VehicleModal'
import { RefuelingModal } from './components/RefuelingModal'
import { DashboardPage } from './pages/DashboardPage'
import { ExpandedDataPage } from './pages/ExpandedDataPage'
import { api } from './api/client'
import { CreateRefuelingPayload, CreateVehiclePayload, RefuelingLog, Vehicle } from './types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
})

function VehiclesAppContent() {
  // Modals state
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false)
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null)

  const [refuelingModalOpen, setRefuelingModalOpen] = useState(false)
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string>('')
  const [refuelingToEdit, setRefuelingToEdit] = useState<RefuelingLog | null>(null)

  const qc = useQueryClient()

  // Queries
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.getVehicles,
  })

  const { data: refuelings = [], isLoading: loadingRefuelings } = useQuery({
    queryKey: ['refuelings'],
    queryFn: () => api.getRefuelings(),
  })

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: api.getAnalytics,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    qc.invalidateQueries({ queryKey: ['refuelings'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
  }

  // Mutations
  const createVehicleMutation = useMutation({
    mutationFn: (data: CreateVehiclePayload) =>
      vehicleToEdit ? api.updateVehicle(vehicleToEdit.id, data) : api.createVehicle(data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.deleteVehicle(id),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const createRefuelingMutation = useMutation({
    mutationFn: (data: CreateRefuelingPayload) =>
      refuelingToEdit ? api.updateRefueling(refuelingToEdit.id, data) : api.createRefueling(data),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const deleteRefuelingMutation = useMutation({
    mutationFn: (id: string) => api.deleteRefueling(id),
    onSuccess: () => {
      invalidateAll()
    },
  })

  const handleOpenVehicleModal = (vehicle?: Vehicle) => {
    setVehicleToEdit(vehicle || null)
    setVehicleModalOpen(true)
  }

  const handleOpenRefuelingModal = (vehicleId?: string, log?: RefuelingLog) => {
    setPreselectedVehicleId(vehicleId || '')
    setRefuelingToEdit(log || null)
    setRefuelingModalOpen(true)
  }

  return (
    <AppLayout>
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              vehicles={vehicles}
              refuelings={refuelings}
              analytics={analytics}
              loadingVehicles={loadingVehicles}
              loadingRefuelings={loadingRefuelings}
              onOpenVehicleModal={handleOpenVehicleModal}
              onOpenRefuelingModal={handleOpenRefuelingModal}
              onDeleteVehicle={(id) => deleteVehicleMutation.mutate(id)}
              onDeleteRefueling={(id) => deleteRefuelingMutation.mutate(id)}
            />
          }
        />
        <Route
          path="/bi"
          element={
            <ExpandedDataPage
              vehicles={vehicles}
              refuelings={refuelings}
              analytics={analytics}
              loading={loadingVehicles || loadingRefuelings || loadingAnalytics}
            />
          }
        />
      </Routes>

      {/* Modals */}
      <VehicleModal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        onSave={async (data) => {
          await createVehicleMutation.mutateAsync(data)
          setVehicleModalOpen(false)
        }}
        vehicleToEdit={vehicleToEdit}
      />

      <RefuelingModal
        isOpen={refuelingModalOpen}
        onClose={() => setRefuelingModalOpen(false)}
        onSave={async (data) => {
          await createRefuelingMutation.mutateAsync(data)
          setRefuelingModalOpen(false)
        }}
        vehicles={vehicles}
        preselectedVehicleId={preselectedVehicleId}
        refuelingToEdit={refuelingToEdit}
      />
    </AppLayout>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <VehiclesAppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
