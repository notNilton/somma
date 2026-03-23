import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import {
  RefuelingLog,
  User,
  Vehicle,
  VehicleMaintenance,
} from '@mirante/database';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: User): Promise<Vehicle[]> {
    return this.vehiclesService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Vehicle> {
    return this.vehiclesService.findOne(id, user.id);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehiclesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.vehiclesService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<Vehicle> {
    return this.vehiclesService.remove(id, user.id);
  }

  @Get(':id/refuelings')
  getRefuelings(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RefuelingLog[]> {
    return this.vehiclesService.getRefuelings(id, user.id);
  }

  @Get(':id/maintenances')
  getMaintenances(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<VehicleMaintenance[]> {
    return this.vehiclesService.getMaintenances(id, user.id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @CurrentUser() user: User) {
    return this.vehiclesService.getStats(id, user.id);
  }

  @Get(':id/expenses-stats')
  getExpensesStats(@Param('id') id: string, @CurrentUser() user: User) {
    return this.vehiclesService.getExpensesStats(id, user.id);
  }
}
