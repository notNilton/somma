import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from './components/AppLayout'
import { VehicleModal } from './components/VehicleModal'
import { RefuelingModal } from './components/RefuelingModal'
import { DashboardPage } from './pages/DashboardPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { RefuelingsPage } from './pages/RefuelingsPage'
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vehicles' | 'refuelings'>('dashboard')

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

  const { data: analytics } = useQuery({
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

  const saveRefuelingMutation = useMutation({
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

  // Handlers
  const handleOpenVehicleModal = (v?: Vehicle) => {
    setVehicleToEdit(v || null)
    setVehicleModalOpen(true)
  }

  const handleOpenRefuelingModal = (vehicleId?: string, log?: RefuelingLog) => {
    setPreselectedVehicleId(vehicleId || '')
    setRefuelingToEdit(log || null)
    setRefuelingModalOpen(true)
  }

  const handleDeleteVehicle = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo? Todos os abastecimentos vinculados também serão removidos.')) {
      await deleteVehicleMutation.mutateAsync(id)
    }
  }

  const handleDeleteRefueling = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este abastecimento? A despesa também será removida do Expenses.')) {
      await deleteRefuelingMutation.mutateAsync(id)
    }
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenNewRefueling={() => handleOpenRefuelingModal()}
    >
      <div className="veh-page">
        {activeTab === 'dashboard' && (
          <DashboardPage
            vehicles={vehicles}
            refuelings={refuelings}
            analytics={analytics}
            loadingVehicles={loadingVehicles}
            loadingRefuelings={loadingRefuelings}
            onOpenVehicleModal={handleOpenVehicleModal}
            onOpenRefuelingModal={handleOpenRefuelingModal}
            onDeleteVehicle={handleDeleteVehicle}
            onDeleteRefueling={handleDeleteRefueling}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesPage
            vehicles={vehicles}
            loading={loadingVehicles}
            onOpenVehicleModal={handleOpenVehicleModal}
            onOpenRefuelingModal={(vId) => handleOpenRefuelingModal(vId)}
            onDeleteVehicle={handleDeleteVehicle}
          />
        )}

        {activeTab === 'refuelings' && (
          <RefuelingsPage
            refuelings={refuelings}
            vehicles={vehicles}
            loading={loadingRefuelings}
            onOpenRefuelingModal={handleOpenRefuelingModal}
            onDeleteRefueling={handleDeleteRefueling}
          />
        )}
      </div>

      {/* Modals */}
      <VehicleModal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        onSave={async (data) => {
          await createVehicleMutation.mutateAsync(data)
        }}
        vehicleToEdit={vehicleToEdit}
      />

      <RefuelingModal
        isOpen={refuelingModalOpen}
        onClose={() => setRefuelingModalOpen(false)}
        onSave={async (data) => {
          await saveRefuelingMutation.mutateAsync(data)
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
      <VehiclesAppContent />
    </QueryClientProvider>
  )
}

export default App
