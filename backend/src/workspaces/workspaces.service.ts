import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId, isActive: true },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });
    if (!workspace) throw new NotFoundException(`Workspace ${id} not found`);
    return workspace;
  }

  async create(data: { organizationId: string; name: string; slug: string }) {
    return this.prisma.workspace.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
        isDefault: true,
      },
    });
  }

  async update(id: string, data: { name: string }) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) throw new NotFoundException(`Workspace ${id} not found`);
    return this.prisma.workspace.update({
      where: { id },
      data: { name: data.name },
    });
  }
}