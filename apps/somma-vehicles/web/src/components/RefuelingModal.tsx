import React, { useState, useEffect, useRef } from 'react'
import { X, Zap } from 'lucide-react'
import { CreateRefuelingPayload, RefuelingLog, Vehicle } from '../types'

interface RefuelingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateRefuelingPayload) => Promise<void>
  vehicles: Vehicle[]
  preselectedVehicleId?: string
  refuelingToEdit?: RefuelingLog | null
}

export const RefuelingModal: React.FC<RefuelingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  preselectedVehicleId,
  refuelingToEdit,
}) => {
  const [vehicleId, setVehicleId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [station, setStation] = useState('')
  const [fuelType, setFuelType] = useState('Gasolina')
  const [currentKm, setCurrentKm] = useState<number | ''>('')
  const [liters, setLiters] = useState<number | ''>('')
  const [pricePerLiterReais, setPricePerLiterReais] = useState<number | ''>('')
  const [totalAmountReais, setTotalAmountReais] = useState<number | ''>('')
  const [isFullTank, setIsFullTank] = useState(true)
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  useEffect(() => {
    if (refuelingToEdit) {
      setVehicleId(refuelingToEdit.vehicle_id)
      setDate(refuelingToEdit.date ? refuelingToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0])
      setStation(refuelingToEdit.station || '')
      setFuelType(refuelingToEdit.fuel_type || 'Gasolina')
      setCurrentKm(refuelingToEdit.current_km || '')
      setLiters(refuelingToEdit.liters || '')
      setPricePerLiterReais(refuelingToEdit.price_per_liter_cents ? refuelingToEdit.price_per_liter_cents / 100 : '')
      setTotalAmountReais(refuelingToEdit.total_amount_cents ? refuelingToEdit.total_amount_cents / 100 : '')
      setIsFullTank(refuelingToEdit.is_full_tank ?? true)
      setNotes(refuelingToEdit.notes || '')
    } else {
      setVehicleId(preselectedVehicleId || (vehicles.length > 0 ? vehicles[0].id : ''))
      setDate(new Date().toISOString().split('T')[0])
      setStation('')
      setFuelType('Gasolina')
      setCurrentKm('')
      setLiters('')
      setPricePerLiterReais('')
      setTotalAmountReais('')
      setIsFullTank(true)
      setNotes('')
    }
    setError('')
  }, [refuelingToEdit, preselectedVehicleId, vehicles, isOpen])

  useEffect(() => {
    if (vehicleId && !refuelingToEdit) {
      const selected = vehicles.find((v) => v.id === vehicleId)
      if (selected) {
        if (selected.fuel_type) setFuelType(selected.fuel_type)
        if (selected.odometer_km) setCurrentKm(selected.odometer_km)
      }
    }
  }, [vehicleId, vehicles, refuelingToEdit])

  const handleLitersChange = (val: number | '') => {
    setLiters(val)
    if (typeof val === 'number' && typeof pricePerLiterReais === 'number' && val > 0 && pricePerLiterReais > 0) {
      setTotalAmountReais(parseFloat((val * pricePerLiterReais).toFixed(2)))
    }
  }

  const handlePriceChange = (val: number | '') => {
    setPricePerLiterReais(val)
    if (typeof val === 'number' && typeof liters === 'number' && val > 0 && liters > 0) {
      setTotalAmountReais(parseFloat((val * liters).toFixed(2)))
    }
  }

  const handleTotalChange = (val: number | '') => {
    setTotalAmountReais(val)
    if (typeof val === 'number' && typeof liters === 'number' && val > 0 && liters > 0) {
      setPricePerLiterReais(parseFloat((val / liters).toFixed(3)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!vehicleId) {
      setError('Selecione um veículo')
      return
    }
    if (!liters || liters <= 0) {
      setError('Informe a quantidade de litros')
      return
    }
    if (!currentKm || currentKm <= 0) {
      setError('Informe o odômetro atual (KM)')
      return
    }

    const priceCents = pricePerLiterReais ? Math.round(Number(pricePerLiterReais) * 100) : 0
    const totalCents = totalAmountReais ? Math.round(Number(totalAmountReais) * 100) : priceCents * Number(liters)

    if (totalCents <= 0) {
      setError('Informe o preço por litro ou valor total')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onSave({
        vehicle_id: vehicleId,
        date: new Date(date).toISOString(),
        station,
        fuel_type: fuelType,
        current_km: Number(currentKm),
        liters: Number(liters),
        price_per_liter_cents: priceCents,
        total_amount_cents: totalCents,
        is_full_tank: isFullTank,
        notes,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar abastecimento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      className="budget-dialog"
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="veh-modal">
        <div className="veh-modal-header">
          <div>
            <div className="budget-modal-kicker">ABASTECIMENTO</div>
            <h2 className="veh-modal-title">
              {refuelingToEdit ? 'Editar Abastecimento' : 'Novo Abastecimento'}
            </h2>
          </div>
          <button onClick={onClose} className="veh-modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="budget-modal-subtitle flex items-start gap-2 mb-4">
          <Zap className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
          Sincronizado automaticamente com o Expenses.
        </div>

        {error && (
          <div className="budget-modal-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Veículo *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="veh-select"
                required
              >
                <option value="">Selecione</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.license_plate ? `(${v.license_plate})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="veh-input"
                required
              />
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Litros (L) *</label>
              <input
                type="number"
                step="0.001"
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="40.0"
                className="veh-input font-mono"
                required
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Preço / Litro (R$)</label>
              <input
                type="number"
                step="0.001"
                value={pricePerLiterReais}
                onChange={(e) => handlePriceChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="5.89"
                className="veh-input font-mono"
              />
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={totalAmountReais}
                onChange={(e) => handleTotalChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="235.60"
                className="veh-input font-mono font-bold"
                required
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Odômetro (KM) *</label>
              <input
                type="number"
                step="1"
                value={currentKm}
                onChange={(e) => setCurrentKm(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="45800"
                className="veh-input font-mono"
                required
              />
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Combustível</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="veh-select"
              >
                <option value="Gasolina">Gasolina</option>
                <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel S10</option>
                <option value="GNV">GNV</option>
              </select>
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Posto</label>
              <input
                type="text"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="Posto Shell"
                className="veh-input"
              />
            </div>
          </div>

          <div className="veh-form-field">
            <label className="veh-label">Observações</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Abastecimento de viagem"
              className="veh-input"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text)] mb-4">
            <input
              type="checkbox"
              checked={isFullTank}
              onChange={(e) => setIsFullTank(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)]"
            />
            Tanque cheio
          </label>

          <div className="veh-modal-actions">
            <button type="button" onClick={onClose} className="veh-modal-btn veh-modal-btn-secondary" disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="veh-modal-btn veh-modal-btn-primary" disabled={submitting}>
              {submitting ? 'Registrando...' : refuelingToEdit ? 'Salvar' : 'Lançar'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
