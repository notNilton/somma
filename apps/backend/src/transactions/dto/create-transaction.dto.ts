import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TransactionType,
  TransactionClassification,
  TransactionStatus,
  PaymentMethod,
  TransactionChannel,
  FuelType,
  MaintenanceType,
} from '@project-budget/database';

export class CreateTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsEnum(TransactionClassification)
  @IsOptional()
  classification?: TransactionClassification;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsEnum(TransactionChannel)
  @IsOptional()
  channel?: TransactionChannel;

  @IsUUID()
  @IsOptional()
  cardId?: string;

  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(21)
  totalInstallments?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(21)
  paidInstallments?: number;

  @IsDateString()
  date: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currencyCode?: string;

  // Fuel specific fields
  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  station?: string;

  @IsEnum(FuelType)
  @IsOptional()
  fuelType?: FuelType;

  @IsNumber()
  @IsOptional()
  currentKm?: number;

  @IsNumber()
  @IsOptional()
  liters?: number;

  @IsNumber()
  @IsOptional()
  pricePerLiter?: number;

  // Maintenance specific fields
  @IsEnum(MaintenanceType)
  @IsOptional()
  maintenanceType?: MaintenanceType;

  @IsString()
  @IsOptional()
  provider?: string;
}
