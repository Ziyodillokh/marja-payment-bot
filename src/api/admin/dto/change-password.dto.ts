import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(4)
  oldPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
