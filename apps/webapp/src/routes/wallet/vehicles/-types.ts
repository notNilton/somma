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

export interface VehicleStats {
  avgConsumption: number;
  avgCost: number;
  autonomy: number;
}
