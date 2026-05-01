import {
  BadRequestException,
  Body,
  Controller,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Put('me/password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentAdmin() current: JwtPayload,
  ): Promise<{ ok: true }> {
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must differ from old password',
      );
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: current.sub },
    });
    if (!admin) throw new UnauthorizedException();

    const ok = await bcrypt.compare(dto.oldPassword, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Old password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    return { ok: true };
  }
}
