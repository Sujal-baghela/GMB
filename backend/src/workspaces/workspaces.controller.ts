import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('api/workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Get()
  findAll(@Query('organizationId') organizationId: string) {
    return this.workspacesService.findAll(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Post()
  create(@Body() body: { organizationId: string; name: string; slug: string }) {
    return this.workspacesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.workspacesService.update(id, body);
  }
}