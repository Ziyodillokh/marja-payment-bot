import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TriggerType } from '@prisma/client';

export class CustomButtonDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsUrl({ require_protocol: true })
  url!: string;
}

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
  videoIsNote?: boolean;

  @IsOptional()
  @IsBoolean()
  payButton?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomButtonDto)
  customButtons?: CustomButtonDto[];

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
  videoIsNote?: boolean;

  @IsOptional()
  @IsBoolean()
  payButton?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomButtonDto)
  customButtons?: CustomButtonDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
