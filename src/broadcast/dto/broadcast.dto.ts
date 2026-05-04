import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BroadcastFilter } from '@prisma/client';

export class CustomButtonDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsUrl({ require_protocol: true })
  url!: string;
}

export class CreateBroadcastDto {
  @IsString()
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
  @IsString()
  parseMode?: string;

  @IsEnum(BroadcastFilter)
  filterType!: BroadcastFilter;

  @ValidateIf((o: CreateBroadcastDto) => o.filterType === BroadcastFilter.SPECIFIC)
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  scheduledAt?: Date;
}
