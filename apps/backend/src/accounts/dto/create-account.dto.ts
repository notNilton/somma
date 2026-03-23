import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { AccountType, AccountOwnership } from '@project-budget/database';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType;

  @IsEnum(AccountOwnership)
  @IsOptional()
  ownership?: AccountOwnership;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(14)
  cpf?: string;

  @IsString()
  @IsOptional()
  @MaxLength(18)
  cnpj?: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @IsBoolean()
  @IsOptional()
  hasDebit?: boolean;

  @IsBoolean()
  @IsOptional()
  hasPix?: boolean;

  @IsBoolean()
  @IsOptional()
  hasCredit?: boolean;

  @IsBoolean()
  @IsOptional()
  includeInTotal?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(28)
  closingDay?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(28)
  dueDay?: number;
}
