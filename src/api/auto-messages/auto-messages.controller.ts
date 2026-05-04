import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';
import {
  CreateAutoMessageDto,
  UpdateAutoMessageDto,
} from '../../auto-messages/dto/auto-message.dto';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';

@UseGuards(JwtAuthGuard)
@Controller('auto-messages')
export class AutoMessagesApiController {
  constructor(private readonly service: AutoMessagesService) {}

  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list({
      from: parseDateQuery(from, 'start'),
      to: parseDateQuery(to, 'end'),
    });
  }

  @Post()
  async create(@Body() dto: CreateAutoMessageDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAutoMessageDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }
}
