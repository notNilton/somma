import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateRefuelingLogDto } from './dto/create-refueling-log.dto';
import {
  Vehicle,
  RefuelingLog,
  Prisma,
  VehicleMaintenance,
  TransactionClassification,
} from '@mirante/database';

@Injectable()
export class VehiclesService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(userId: string): Promise<Vehicle[]> {
    return this.database.vehicle.findMany({
      where: { userId, isActive: true },
    });
  }

  async findOne(id: string, userId: string): Promise<Vehicle> {
    const vehicle = await this.database.vehicle.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    return this.database.vehicle.create({
      data: {
        ...dto,
        tank: dto.tank ? new Prisma.Decimal(dto.tank) : undefined,
        userId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    await this.findOne(id, userId);

    return this.database.vehicle.update({
      where: { id },
      data: {
        ...dto,
        tank: dto.tank ? new Prisma.Decimal(dto.tank) : undefined,
      },
    });
  }

  async remove(id: string, userId: string): Promise<Vehicle> {
    await this.findOne(id, userId);

    return this.database.vehicle.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async addRefueling(
    vehicleId: string,
    transactionId: string,
    dto: CreateRefuelingLogDto,
  ): Promise<RefuelingLog> {
    return this.database.refuelingLog.create({
      data: {
        ...dto,
        vehicleId,
        transactionId,
      },
    });
  }

  async getMaintenances(
    vehicleId: string,
    userId: string,
  ): Promise<VehicleMaintenance[]> {
    await this.findOne(vehicleId, userId);

    return this.database.vehicleMaintenance.findMany({
      where: {
        vehicleId,
        transaction: { isActive: true },
      },
      include: {
        transaction: {
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ transaction: { date: 'desc' } }, { odometer: 'desc' }],
    });
  }

  async getExpensesStats(vehicleId: string, userId: string) {
    await this.findOne(vehicleId, userId);

    const [fuelTransactions, maintenanceTransactions] = await Promise.all([
      this.database.transaction.findMany({
        where: {
          userId,
          isActive: true,
          classification: TransactionClassification.FUEL,
          refuelingLog: {
            vehicleId,
          },
        },
        select: { amount: true },
      }),
      this.database.transaction.findMany({
        where: {
          userId,
          isActive: true,
          classification: TransactionClassification.MAINTENANCE,
          maintenanceLog: {
            vehicleId,
          },
        },
        select: { amount: true },
      }),
    ]);

    const totalFuel = fuelTransactions.reduce(
      (acc, t) => acc + Number(t.amount),
      0,
    );
    const totalMaintenance = maintenanceTransactions.reduce(
      (acc, t) => acc + Number(t.amount),
      0,
    );

    const total = totalFuel + totalMaintenance;

    return {
      totalFuel: parseFloat(totalFuel.toFixed(2)),
      totalMaintenance: parseFloat(totalMaintenance.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  }

  async getRefuelings(
    vehicleId: string,
    userId: string,
  ): Promise<RefuelingLog[]> {
    await this.findOne(vehicleId, userId);

    return this.database.refuelingLog.findMany({
      where: {
        vehicleId,
        transaction: { isActive: true },
      },
      include: { transaction: true },
      orderBy: [{ transaction: { date: 'desc' } }, { odometer: 'desc' }],
    });
  }

  async getStats(vehicleId: string, userId: string) {
    const vehicle = await this.findOne(vehicleId, userId);

    const logs = await this.database.refuelingLog.findMany({
      where: {
        vehicleId,
        transaction: { isActive: true },
      },
      orderBy: [{ transaction: { date: 'desc' } }, { odometer: 'desc' }],
      take: 10,
      include: { transaction: true },
    });

    if (logs.length < 2) {
      return {
        avgConsumption: 0,
        avgCost: 0,
        avgPricePerLiter: 0,
        autonomy: 0,
      };
    }

    // Average Consumption (KM/L)
    let totalKm = 0;
    let totalLiters = 0;
    for (let i = 0; i < logs.length - 1; i++) {
      const diff = Number(logs[i].odometer) - Number(logs[i + 1].odometer);
      if (diff > 0) {
        totalKm += diff;
        totalLiters += Number(logs[i].fuelLiters);
      }
    }
    const avgConsumption = totalLiters > 0 ? totalKm / totalLiters : 0;

    // Average Cost (per refueling)
    const avgCost =
      logs.reduce((acc, log) => acc + Number(log.transaction.amount), 0) /
      logs.length;

    // Average Price per Liter
    const avgPricePerLiter =
      logs.reduce((acc, log) => acc + Number(log.pricePerLiter), 0) /
      logs.length;

    // Autonomy (Estimated based on vehicle tank capacity)
    const autonomy = avgConsumption * Number(vehicle.tank || 50);

    return {
      avgConsumption: parseFloat(avgConsumption.toFixed(2)),
      avgCost: parseFloat(avgCost.toFixed(2)),
      avgPricePerLiter: parseFloat(avgPricePerLiter.toFixed(2)),
      autonomy: Math.round(autonomy),
    };
  }
}
