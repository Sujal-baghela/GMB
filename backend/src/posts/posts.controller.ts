import {
  Controller, Get, Post, Delete, Patch,
  Param, Query, Body, UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PostsService, CreatePostDto } from './posts.service';

@ApiTags('posts')
@Controller('api/posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.findAll(workspaceId, locationId, status);
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.getStats(workspaceId);
  }

  @Post()
  create(
    @Body() dto: CreatePostDto,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.create(workspaceId, req.user.sub, dto);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.publish(id, workspaceId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.delete(id, workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.postsService.findOne(id, workspaceId);
  }
}