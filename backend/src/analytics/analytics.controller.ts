import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get()
  @ApiQuery({ name: 'workspaceId', required: true })
  findAll(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.analyticsService.findAll(workspaceId);
  }

  @Get('summary')
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'days', required: false })
  getSummary(
    @Query('workspaceId') workspaceId: string,
    @Query('days') days?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.analyticsService.getSummary(workspaceId, days ? parseInt(days) : 30);
  }

  @Get('insights')
  @ApiQuery({ name: 'workspaceId', required: true })
  getInsights(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.analyticsService.getInsights(workspaceId);
  }

  @Get('location')
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'locationId', required: true })
  findByLocation(
    @Query('workspaceId') workspaceId: string,
    @Query('locationId') locationId: string,
  ) {
    if (!workspaceId || !locationId)
      throw new BadRequestException('workspaceId and locationId are required');
    return this.analyticsService.findByLocation(workspaceId, locationId);
  }
}