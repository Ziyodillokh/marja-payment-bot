import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { BroadcastFilter } from '@prisma/client';

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
