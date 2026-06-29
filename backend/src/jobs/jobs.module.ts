import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [PrismaModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}