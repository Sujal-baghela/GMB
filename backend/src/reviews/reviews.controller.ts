import {
  Controller, Get, Post, Param, Query,
  UseGuards, Req, Body, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ReviewsService, CreateReplyDto } from './reviews.service';

@ApiTags('reviews')
@Controller('api/reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'rating', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('locationId') locationId?: string,
    @Query('rating') rating?: string,
    @Query('status') status?: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.reviewsService.findAll({
      workspaceId,
      locationId,
      rating: rating ? parseInt(rating) : undefined,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('stats')
  @ApiQuery({ name: 'workspaceId', required: true })
  getStats(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.reviewsService.getStats(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.reviewsService.findOne(id, workspaceId);
  }

  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateReplyDto,
    @Req() req: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.reviewsService.replyToReview(id, workspaceId, req.user.sub, dto);
  }
}