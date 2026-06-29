import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@common/prisma/prisma.module';
import { LoggerModule } from '@common/logger/logger.module';
import { AuthModule } from '@auth/auth.module';
import { NotificationsModule } from '@notifications/notifications.module';
import { GoogleService } from './google.service';
import { GoogleController } from './google.controller';

@Module({
  imports: [PrismaModule, LoggerModule, HttpModule, AuthModule, NotificationsModule],
  providers: [GoogleService],
  controllers: [GoogleController],
  exports: [GoogleService],
})
export class GoogleModule {}