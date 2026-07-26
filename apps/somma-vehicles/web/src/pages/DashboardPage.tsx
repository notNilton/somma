import { useState, useMemo, useRef } from 'react'
import { StatsOverview } from '../components/StatsOverview'
import { FuelPriceChart } from '../components/FuelPriceChart'
import DayGroupComponent from '../components/DayGroup'
import { RefuelingModal } from '../components/RefuelingModal'
import { AnalyticsSummary, RefuelingLog, Vehicle, CreateRefuelingPayload } from '../types'
import { groupByDay } from '../lib/groupByDay'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

interface DashboardPageProps {
  vehicles: Vehicle[]
  refuelings: RefuelingLog[]
  analytics: AnalyticsSummary | undefined
  loadingVehicles: boolean
  loadingRefuelings: boolean
  onOpenVehicleModal: (vehicle?: Vehicle) => void
  onOpenRefuelingModal: (vehicleId?: string, log?: RefuelingLog) => void
  onDeleteVehicle: (id: string) => void
  onDeleteRefueling: (id: string) => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

export const DashboardPage: React.FC<DashboardPageProps> = ({
  vehicles,
  refuelings,
  analytics,
  loadingVehicles,
  loadingRefuelings,
  onOpenRefuelingModal,
  onDeleteRefueling,
}) => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (data: CreateRefuelingPayload) => api.createRefueling(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['refuelings'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  function goToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  function openModal(date: string) {
    setModalDate(date)
    setModalOpen(true)
    dialogRef.current?.showModal()
  }

  function closeModal() {
    dialogRef.current?.close()
    setModalOpen(false)
  }

  const groups = useMemo(() => groupByDay(refuelings, year, month), [refuelings, year, month])
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]

  return (
    <div className="animate-fade-in">
      <StatsOverview analytics={analytics} loading={loadingVehicles || loadingRefuelings} />
      <FuelPriceChart analytics={analytics} />

      <div className="month-nav">
        <button className="today-chip" onClick={goToday} title="hoje">
          {now.getDate()}
        </button>
        <button className="month-arrow" onClick={prevMonth}>‹</button>
        <span className="month-label">{monthNames[month]}/{String(year).slice(2)}</span>
        <button className="month-arrow" onClick={nextMonth}>›</button>
      </div>

      <div className="veh-table-header">
        <span className="th-dia">DIA</span>
        <span className="th-filter">ABASTECIMENTOS</span>
        <span className="th-total">TOTAL</span>
      </div>

      {groups.map((g) => (
        <DayGroupComponent
          key={g.dateStr}
          group={g}
          isToday={g.dateStr === todayStr}
          onAdd={openModal}
          onEdit={(log) => onOpenRefuelingModal(log.vehicle_id, log)}
          onDelete={onDeleteRefueling}
        />
      ))}

      {refuelings.length === 0 && !loadingRefuelings && (
        <div className="veh-empty">
          <div className="veh-empty-icon">🚗</div>
          <div className="veh-empty-title">Nenhum abastecimento</div>
          <p>Adicione seu primeiro abastecimento clicando em qualquer dia.</p>
        </div>
      )}

      <dialog
        className="budget-dialog"
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) closeModal() }}
      >
        {modalOpen && (
          <RefuelingModal
            isOpen={modalOpen}
            onClose={closeModal}
            onSave={async (data) => {
              await saveMutation.mutateAsync(data)
              closeModal()
            }}
            vehicles={vehicles}
            preselectedVehicleId={vehicles.length > 0 ? vehicles[0].id : ''}
          />
        )}
      </dialog>
    </div>
  )
}
