import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';
import {
  CreateAutoMessageDto,
  UpdateAutoMessageDto,
} from '../../auto-messages/dto/auto-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('auto-messages')
export class AutoMessagesApiController {
  constructor(private readonly service: AutoMessagesService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  async create(@Body() dto: CreateAutoMessageDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAutoMessageDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}
