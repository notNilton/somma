import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { CreateVehiclePayload, Vehicle } from '../types'

interface VehicleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CreateVehiclePayload) => Promise<void>
  vehicleToEdit?: Vehicle | null
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicleToEdit,
}) => {
  const [formData, setFormData] = useState<CreateVehiclePayload>({
    name: '',
    license_plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    tank_liters: 50,
    fuel_type: 'Gasolina',
    odometer_km: 0,
  })
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
    if (vehicleToEdit) {
      setFormData({
        name: vehicleToEdit.name || '',
        license_plate: vehicleToEdit.license_plate || '',
        brand: vehicleToEdit.brand || '',
        model: vehicleToEdit.model || '',
        year: vehicleToEdit.year || new Date().getFullYear(),
        tank_liters: vehicleToEdit.tank_liters || 50,
        fuel_type: vehicleToEdit.fuel_type || 'Gasolina',
        odometer_km: vehicleToEdit.odometer_km || 0,
      })
    } else {
      setFormData({
        name: '',
        license_plate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        tank_liters: 50,
        fuel_type: 'Gasolina',
        odometer_km: 0,
      })
    }
    setError('')
  }, [vehicleToEdit, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Nome do veículo é obrigatório')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar veículo')
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
            <div className="budget-modal-kicker">VEÍCULO</div>
            <h2 className="veh-modal-title">
              {vehicleToEdit ? 'Editar Veículo' : 'Novo Veículo'}
            </h2>
          </div>
          <button onClick={onClose} className="veh-modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="budget-modal-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Honda Civic"
                className="veh-input"
                required
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Placa</label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1D23"
                className="veh-input uppercase font-mono"
              />
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Marca</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Honda"
                className="veh-input"
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Modelo</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Civic EXL"
                className="veh-input"
              />
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Ano</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
                className="veh-input"
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Combustível</label>
              <select
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                className="veh-select"
              >
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Flex">Flex</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
                <option value="Elétrico">Elétrico</option>
              </select>
            </div>
          </div>

          <div className="veh-form-row">
            <div className="veh-form-field">
              <label className="veh-label">Tanque (L)</label>
              <input
                type="number"
                step="0.5"
                value={formData.tank_liters}
                onChange={(e) => setFormData({ ...formData, tank_liters: parseFloat(e.target.value) || 0 })}
                className="veh-input"
              />
            </div>
            <div className="veh-form-field">
              <label className="veh-label">Odômetro (km)</label>
              <input
                type="number"
                step="1"
                value={formData.odometer_km}
                onChange={(e) => setFormData({ ...formData, odometer_km: parseFloat(e.target.value) || 0 })}
                className="veh-input font-mono"
              />
            </div>
          </div>

          <div className="veh-modal-actions">
            <button type="button" onClick={onClose} className="veh-modal-btn veh-modal-btn-secondary" disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="veh-modal-btn veh-modal-btn-primary" disabled={submitting}>
              {submitting ? 'Salvando...' : vehicleToEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
