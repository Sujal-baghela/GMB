import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';
import { GoogleService } from '@google/google.service';

@ApiTags('locations')
@Controller('api/locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(
    private locationsService: LocationsService,
    private googleService: GoogleService,
  ) {}

  @Get()
  @ApiQuery({ name: 'workspaceId', required: true })
  findAll(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.locationsService.findAll(workspaceId);
  }

  @Get('stats')
  @ApiQuery({ name: 'workspaceId', required: true })
  getStats(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.locationsService.getStats(workspaceId);
  }

  @Get('connect')
  getConnectUrl(@Req() req: any, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const authUrl = this.googleService.getAuthorizationUrl(
      workspaceId,
      req.user.sub,
    );
    return { authUrl };
  }

  @Post('sync/:accountId')
  async syncLocations(@Param('accountId') accountId: string) {
    const locations = await this.googleService.fetchLocations(accountId);
    return {
      success: true,
      count: locations.length,
      locations,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.locationsService.findOne(id, workspaceId);
  }
}