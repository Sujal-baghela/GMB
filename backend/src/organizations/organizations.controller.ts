import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('api/organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  create(@Body() body: { name: string; slug: string }, @Req() req: any) {
    return this.organizationsService.create(body, req.user.sub);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.organizationsService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.organizationsService.update(id, body);
  }
}