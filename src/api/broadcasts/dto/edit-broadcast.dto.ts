import { IsOptional, IsString } from 'class-validator';

export class EditBroadcastDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  mediaFileId?: string | null;

  @IsOptional()
  @IsString()
  mediaType?: string | null;
}
