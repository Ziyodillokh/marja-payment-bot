import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BroadcastService } from '../../broadcast/broadcast.service';
import { CreateBroadcastDto } from '../../broadcast/dto/broadcast.dto';

@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsApiController {
  constructor(private readonly broadcasts: BroadcastService) {}

  @Get()
  async list() {
    return this.broadcasts.list();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.broadcasts.getById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateBroadcastDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.broadcasts.create(dto, admin.sub);
  }

  @Delete(':id')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.broadcasts.cancel(id);
  }
}
