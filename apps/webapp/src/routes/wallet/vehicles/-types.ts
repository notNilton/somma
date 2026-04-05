export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  licensePlate?: string;
}

export interface RefuelingLog {
  id: string;
  vehicleId: string;
  transactionId?: string;
  station?: string;
  fuelType: string;
  currentKm: number | string;
  liters: number | string;
  pricePerLiter: number | string;
  createdAt: string;
}

export interface VehicleMaintenanceLog {
  id: string;
  vehicleId: string;
  transactionId?: string;
  maintenanceType: string;
  provider?: string;
  createdAt: string;
}

export interface VehicleStats {
  avgConsumption: number;
  avgCost: number;
  autonomy: number;
}

export interface VehicleExpenseStats {
  totalFuel: number;
  totalMaintenance: number;
  total: number;
}
