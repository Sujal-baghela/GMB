import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@common/prisma/prisma.module';
import { LoggerModule } from '@common/logger/logger.module';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from '@users/users.module';
import { OrganizationsModule } from '@organizations/organizations.module';
import { WorkspacesModule } from '@workspaces/workspaces.module';
import { TeamsModule } from '@teams/teams.module';
import { SubscriptionsModule } from '@subscriptions/subscriptions.module';
import { BillingModule } from '@billing/billing.module';
import { StripeModule } from '@stripe/stripe.module';
import { GoogleModule } from '@google/google.module';
import { LocationsModule } from '@locations/locations.module';
import { ReviewsModule } from '@reviews/reviews.module';
import { PostsModule } from '@posts/posts.module';
import { PhotosModule } from '@photos/photos.module';
import { AnalyticsModule } from '@analytics/analytics.module';
import { NotificationsModule } from '@notifications/notifications.module';
import { AuditModule } from '@audit/audit.module';
import { JobsModule } from '@jobs/jobs.module';
import { HealthModule } from '@health/health.module';
import { MonitoringModule } from '@monitoring/monitoring.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 3600,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    LoggerModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    TeamsModule,
    SubscriptionsModule,
    BillingModule,
    StripeModule,
    GoogleModule,
    LocationsModule,
    ReviewsModule,
    PostsModule,
    PhotosModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
    JobsModule,
    HealthModule,
    MonitoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {};