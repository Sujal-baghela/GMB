import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; slug: string }, userId: string) {
    const org = await this.prisma.organization.create({
      data: { name: data.name, slug: data.slug },
    });
    await this.prisma.organizationUser.create({
      data: { organizationId: org.id, userId, role: 'OWNER' },
    });
    return org;
  }

  async findAll(userId: string) {
    const orgUsers = await this.prisma.organizationUser.findMany({
      where: { userId },
      include: { organization: true },
    });
    return orgUsers.map((ou) => ou.organization);
  }

  async findOne(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return this.prisma.organization.update({ where: { id }, data });
  }
}