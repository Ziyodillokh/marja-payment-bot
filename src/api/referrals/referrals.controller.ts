import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReferralsService } from '../../referrals/referrals.service';

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsApiController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('top')
  async top(@Query('limit') limit?: string) {
    return this.referrals.getTopReferrers(limit ? Number(limit) : 20);
  }
}
