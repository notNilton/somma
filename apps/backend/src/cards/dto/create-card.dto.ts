import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CardType } from '@mirante/database';

export class CreateCardDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4)
  last4?: string;

  @IsEnum(CardType)
  @IsNotEmpty()
  type: CardType;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsNumber()
  @IsOptional()
  closingDay?: number;

  @IsNumber()
  @IsOptional()
  dueDay?: number;
}
