import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GoogleService } from './google.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('google')
@Controller('api/google')
export class GoogleController {
  constructor(private googleService: GoogleService) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getAuthorizationUrl(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const workspace = workspaceId || req.user.workspaceId;
    if (!workspace) {
      throw new BadRequestException('workspaceId is required');
    }
    const authUrl = this.googleService.getAuthorizationUrl(workspace, req.user.sub);
    return { authUrl };
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    if (!code) throw new BadRequestException('Authorization code is required');
    if (!state) throw new BadRequestException('State parameter is required');

    let workspaceId: string;
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      workspaceId = decoded.workspaceId;
      userId = decoded.userId;
    } catch {
      throw new BadRequestException('Invalid state parameter');
    }

    return await this.googleService.connectAccount(workspaceId, userId, code);
  }

  @Post('accounts/:accountId/sync/locations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async syncLocations(@Param('accountId') accountId: string) {
    const locations = await this.googleService.fetchLocations(accountId);
    return { success: true, count: locations.length, locations };
  }

  @Post('accounts/:accountId/sync/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async syncReviews(@Param('accountId') accountId: string) {
    const locations = await this.googleService.fetchLocations(accountId);
    let totalReviews = 0;
    for (const location of locations) {
      const count = await this.googleService.fetchReviews(accountId, location.id);
      totalReviews += count;
    }
    return { success: true, totalReviews, locationsProcessed: locations.length };
  }

  @Post('accounts/:accountId/sync/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @HttpCode(HttpStatus.OK)
  async syncAnalytics(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const locations = await this.googleService.fetchLocations(accountId);
    let totalAnalyticsRecords = 0;
    // FIX: typed map
    const analyticsPerLocation: Record<string, number> = {};

    for (const location of locations) {
      const analytics = await this.googleService.fetchAnalytics(accountId, location.id, startDate, endDate);
      totalAnalyticsRecords += analytics.length;
      analyticsPerLocation[location.id] = analytics.length;
    }

    return { success: true, totalAnalyticsRecords, locationsProcessed: locations.length, analyticsPerLocation };
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listAccounts(@Req() req: any, @Query('workspaceId') workspaceId?: string) {
    const workspace = workspaceId || req.user.workspaceId;
    if (!workspace) throw new BadRequestException('workspaceId is required');
    const accounts = await this.googleService.listAccounts(workspace);
    return { success: true, count: accounts.length, accounts };
  }

  @Delete('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async disconnectAccount(@Param('accountId') accountId: string) {
    return await this.googleService.disconnectAccount(accountId);
  }
}