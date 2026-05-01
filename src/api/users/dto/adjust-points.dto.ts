import { IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

export class AdjustPointsDto {
  @IsInt()
  @NotEquals(0, { message: 'amount must not be zero' })
  amount!: number; // musbat yoki manfiy

  @IsOptional()
  @IsString()
  reason?: string;
}
