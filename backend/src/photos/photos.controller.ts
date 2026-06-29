import {
  Controller, Get, Post, Delete,
  Param, Query, Body, UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PhotosService } from './photos.service';

@ApiTags('photos')
@Controller('api/photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(private photosService: PhotosService) {}

  @Get()
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'locationId', required: false })
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('locationId') locationId?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.photosService.findAll(workspaceId, locationId);
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.photosService.getStats(workspaceId);
  }

  @Post()
  create(
    @Body() body: { locationId: string; url: string; thumbnailUrl?: string; caption?: string },
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.photosService.create({
      workspaceId,
      locationId: body.locationId,
      userId: req.user.sub,
      url: body.url,
      thumbnailUrl: body.thumbnailUrl,
      caption: body.caption,
    });
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.photosService.delete(id, workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.photosService.findOne(id, workspaceId);
  }
}