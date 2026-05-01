import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreateAutoMessageDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(TriggerType)
  triggerType!: TriggerType;

  @IsInt()
  @Min(1)
  triggerAfter!: number; // soniyada

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  mediaFileId?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAutoMessageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @IsOptional()
  @IsInt()
  @Min(1)
  triggerAfter?: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  mediaFileId?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
