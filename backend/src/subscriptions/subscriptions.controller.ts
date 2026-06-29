import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  findByOrganization(@Query('organizationId') organizationId: string) {
    return this.subscriptionsService.findByOrganization(organizationId);
  }
}