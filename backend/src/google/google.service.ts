import { NotificationsService } from '@notifications/notifications.service';
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { LoggerService } from '@common/logger/logger.service';
import { firstValueFrom } from 'rxjs';

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}

@Injectable()
export class GoogleService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly businessCallbackUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private logger: LoggerService,
    private notificationsService: NotificationsService,

  ) {
    // FIX: use fallback empty string to satisfy TypeScript strict assignment
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    this.businessCallbackUrl = this.configService.get<string>('GOOGLE_BUSINESS_CALLBACK_URL') ?? '';
  }

  async connectAccount(workspaceId: string, _userId: string, code: string) {
    this.logger.debug(`[GoogleService] Connecting account for workspace ${workspaceId}`, 'connectAccount');

    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.businessCallbackUrl,
          grant_type: 'authorization_code',
        }),
      );

      const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      const accountsResponse = await firstValueFrom(
        this.httpService.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
          headers: { Authorization: `Bearer ${access_token}` },
        }),
      );

      const accounts = accountsResponse.data.accounts || [];
      if (accounts.length === 0) {
        throw new BadRequestException('No Google Business accounts found for this user');
      }

      const primaryAccount = accounts[0];
      const googleAccountId = primaryAccount.name.split('/')[1];

      const businessAccount = await this.prisma.businessAccount.upsert({
        where: { googleAccountId },
        update: {
          name: primaryAccount.displayName || 'Google Business Account',
          email: primaryAccount.accountName || '',
        },
        create: {
          workspaceId,
          googleAccountId,
          name: primaryAccount.displayName || 'Google Business Account',
          email: primaryAccount.accountName || '',
        },
      });

      // FIX: correct Prisma casing oAuthToken not oauthToken
      await this.prisma.oAuthToken.upsert({
        where: { businessAccountId: businessAccount.id },
        update: { accessToken: access_token, refreshToken: refresh_token, expiresAt, scope },
        create: {
          businessAccountId: businessAccount.id,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          scope,
        },
      });

      return businessAccount;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to connect account: ${msg}`, 'connectAccount');
      throw error;
    }
  }

  async refreshAccessToken(businessAccountId: string): Promise<string> {
    try {
      // FIX: correct Prisma casing
      const oauthToken = await this.prisma.oAuthToken.findUnique({
        where: { businessAccountId },
      });

      if (!oauthToken) {
        throw new UnauthorizedException('OAuth token not found');
      }

      const now = new Date();
      const refreshThreshold = new Date(now.getTime() + 5 * 60 * 1000);

      if (oauthToken.expiresAt > refreshThreshold) {
        return oauthToken.accessToken;
      }

      const refreshResponse = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          refresh_token: oauthToken.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
      );

      const { access_token, expires_in } = refreshResponse.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // FIX: correct Prisma casing
      await this.prisma.oAuthToken.update({
        where: { businessAccountId },
        data: { accessToken: access_token, expiresAt },
      });

      return access_token;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to refresh access token: ${msg}`, 'refreshAccessToken');
      throw error;
    }
  }

  async getValidToken(businessAccountId: string): Promise<string> {
    return this.refreshAccessToken(businessAccountId);
  }

  async fetchLocations(businessAccountId: string) {
    try {
      const businessAccount = await this.prisma.businessAccount.findUnique({
        where: { id: businessAccountId },
      });

      if (!businessAccount) {
        throw new BadRequestException('BusinessAccount not found');
      }

      const accessToken = await this.getValidToken(businessAccountId);
      const accountName = `accounts/${businessAccount.googleAccountId}`;
      const allLocations: any[] = [];
      let nextPageToken: string | null = null;

      do {
        const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,regularHours,phoneNumbers,latlng${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const locationsResponse = await this.makeGoogleApiCall('GET', url, accessToken, businessAccountId);
        allLocations.push(...(locationsResponse.locations || []));
        nextPageToken = locationsResponse.nextPageToken || null;
      } while (nextPageToken);

      const upsertedLocations = [];
      for (const location of allLocations) {
        const googleLocationId = location.name.split('/')[3];
        const address = location.storefrontAddress || {};
        const latLng = location.latlng || {};
        const phoneNumbers = location.phoneNumbers || [];

        const upsertedLocation = await this.prisma.location.upsert({
          where: { googleLocationId },
          update: {
            name: location.title || location.name,
            address: `${address.addressLines?.[0] || ''} ${address.addressLines?.[1] || ''}`.trim(),
            city: address.locality || '',
            state: address.administrativeArea || '',
            zipCode: address.postalCode || '',
            country: address.regionCode || '',
            phone: phoneNumbers[0] || '',
            website: location.websiteUri || '',
            latitude: latLng.latitude || 0,
            longitude: latLng.longitude || 0,
          },
          create: {
            workspaceId: businessAccount.workspaceId,
            businessAccountId,
            googleLocationId,
            name: location.title || location.name,
            address: `${address.addressLines?.[0] || ''} ${address.addressLines?.[1] || ''}`.trim(),
            city: address.locality || '',
            state: address.administrativeArea || '',
            zipCode: address.postalCode || '',
            country: address.regionCode || '',
            phone: phoneNumbers[0] || '',
            website: location.websiteUri || '',
            latitude: latLng.latitude || 0,
            longitude: latLng.longitude || 0,
          },
        });
        upsertedLocations.push(upsertedLocation);
      }

      return upsertedLocations;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to fetch locations: ${msg}`, 'fetchLocations');
      throw error;
    }
  }

 async fetchReviews(businessAccountId: string, locationId: string): Promise<number> {
  try {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });
 
    if (!location) {
      throw new BadRequestException('Location not found');
    }
 
    const businessAccount = await this.prisma.businessAccount.findUnique({
      where: { id: location.businessAccountId },
    });
 
    if (!businessAccount) {
      throw new BadRequestException('BusinessAccount not found');
    }
 
    const accessToken = await this.getValidToken(businessAccountId);
    const locationName = `accounts/${businessAccount.googleAccountId}/locations/${location.googleLocationId}`;
    const allReviews: any[] = [];
    let nextPageToken: string | null = null;
 
    const ratingMap: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
 
    do {
      const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews${nextPageToken ? `?pageToken=${nextPageToken}` : ''}`;
      const reviewsResponse = await this.makeGoogleApiCall('GET', url, accessToken, businessAccountId);
      allReviews.push(...(reviewsResponse.reviews || []));
      nextPageToken = reviewsResponse.nextPageToken || null;
    } while (nextPageToken);
 
    let newReviewCount = 0;
 
    for (const review of allReviews) {
      const googleReviewId = review.name.split('/')[5];
 
      // Check if this review already exists BEFORE upserting,
      // so we know whether to fire a "new review" notification
      const existing = await this.prisma.review.findUnique({
        where: { googleReviewId },
        select: { id: true },
      });
 
      const rating = ratingMap[review.starRating as string] || 0;
      const authorName = review.reviewer?.displayName || 'Anonymous';
      const content = review.comment || '';
 
      const savedReview = await this.prisma.review.upsert({
        where: { googleReviewId },
        update: {
          authorName,
          rating,
          content,
          publishedAt: review.updateTime ? new Date(review.updateTime) : new Date(),
        },
        create: {
          workspaceId: location.workspaceId,
          locationId,
          googleReviewId,
          authorName,
          rating,
          content,
          publishedAt: review.updateTime ? new Date(review.updateTime) : new Date(),
        },
      });
 
      // Only notify for genuinely NEW reviews, not re-synced/updated ones
      if (!existing) {
        newReviewCount++;
        await this.notifyNewReview(location.workspaceId, location.name, savedReview, authorName, rating, content);
      }
    }
 
    return allReviews.length;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`[GoogleService] Failed to fetch reviews: ${msg}`, 'fetchReviews');
    throw error;
  }
}
 private async notifyNewReview(
  workspaceId: string,
  locationName: string,
  review: { id: string },
  authorName: string,
  rating: number,
  content: string,
) {
  try {
    // Notify OWNER and ADMIN members of the workspace
    const workspaceUsers = await this.prisma.workspaceUser.findMany({
      where: {
        workspaceId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });
 
    const ratingLabel = '⭐'.repeat(rating);
 
    await Promise.all(
      workspaceUsers.map((wu) =>
        this.notificationsService.createNotification({
          userId: wu.userId,
          type: 'REVIEW_RECEIVED',
          title: `New ${rating}-star review from ${authorName}`,
          message: content
            ? `"${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`
            : `${ratingLabel} on ${locationName}`,
          data: {
            reviewId: review.id,
            authorName,
            rating,
            content,
            locationName,
          },
          actionUrl: '/reviews',
        }),
      ),
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`[GoogleService] Failed to create review notification: ${msg}`, 'notifyNewReview');
    // Don't throw — notification failure shouldn't break the review sync
  }
}
 



  async fetchAnalytics(businessAccountId: string, locationId: string, startDate: string, endDate: string) {
    try {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new BadRequestException('Location not found');
      }

      const businessAccount = await this.prisma.businessAccount.findUnique({
        where: { id: location.businessAccountId },
      });

      if (!businessAccount) {
        throw new BadRequestException('BusinessAccount not found');
      }

      const accessToken = await this.getValidToken(businessAccountId);
      const locationName = `accounts/${businessAccount.googleAccountId}/locations/${location.googleLocationId}`;

      const analyticsResponse = await this.makeGoogleApiCall(
        'POST',
        `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetrics`,
        accessToken,
        businessAccountId,
        {
          dailyMetrics: [
            'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
            'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
            'BUSINESS_DIRECTION_REQUESTS',
            'CALL_CLICKS',
            'WEBSITE_CLICKS',
          ],
          dailyRange: {
            startDate: this.parseDate(startDate),
            endDate: this.parseDate(endDate),
          },
        },
      );

      const dailyMetricsInsights = analyticsResponse.dailyMetricsInsights || [];
      const upsertedAnalytics = [];

      for (const insight of dailyMetricsInsights) {
        const date = this.parseDateFromGoogle(insight.date);
        // FIX: typed metricsMap
        const metricsMap: Record<string, number> = {};
        for (const metric of (insight.metrics || [])) {
          metricsMap[metric.metricType as string] = metric.totalValue || 0;
        }

        const analytics = await this.prisma.analytics.upsert({
          where: {
            workspaceId_locationId_date_period: {
              workspaceId: location.workspaceId,
              locationId,
              date,
              period: 'day',
            },
          },
          update: {
            searches: metricsMap['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0,
            directions: metricsMap['BUSINESS_DIRECTION_REQUESTS'] || 0,
            websiteClicks: metricsMap['WEBSITE_CLICKS'] || 0,
            phoneClicks: metricsMap['CALL_CLICKS'] || 0,
          },
          create: {
            workspaceId: location.workspaceId,
            locationId,
            date,
            period: 'day',
            searches: metricsMap['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0,
            directions: metricsMap['BUSINESS_DIRECTION_REQUESTS'] || 0,
            websiteClicks: metricsMap['WEBSITE_CLICKS'] || 0,
            phoneClicks: metricsMap['CALL_CLICKS'] || 0,
          },
        });
        upsertedAnalytics.push(analytics);
      }

      return upsertedAnalytics;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to fetch analytics: ${msg}`, 'fetchAnalytics');
      throw error;
    }
  }

  getAuthorizationUrl(workspaceId: string, userId: string): string {
    const scope = [
  'https://www.googleapis.com/auth/business.manage',
];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.businessCallbackUrl,
      response_type: 'code',
      scope: scope.join(' '),
      state: Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64'),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async listAccounts(workspaceId: string) {
    try {
      return await this.prisma.businessAccount.findMany({
        where: { workspaceId },
        include: { oauthTokens: { select: { expiresAt: true, updatedAt: true } } },

      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to list accounts: ${msg}`, 'listAccounts');
      throw error;
    }
  }

  async disconnectAccount(accountId: string) {
    try {
      // FIX: correct Prisma casing
      await this.prisma.oAuthToken.deleteMany({ where: { businessAccountId: accountId } });
      await this.prisma.businessAccount.delete({ where: { id: accountId } });
      return { success: true, message: 'Account disconnected' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] Failed to disconnect account: ${msg}`, 'disconnectAccount');
      throw error;
    }
  }

  private async makeGoogleApiCall(
    method: string,
    url: string,
    accessToken: string,
    businessAccountId: string,
    data?: any,
  ): Promise<any> {
    try {
      const config = { headers: { Authorization: `Bearer ${accessToken}` } };
      let response: any;

      if (method === 'GET') {
        response = await firstValueFrom(this.httpService.get(url, config));
      } else if (method === 'POST') {
        response = await firstValueFrom(this.httpService.post(url, data, config));
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as any;

      if (axiosError?.response?.status === 401) {
        try {
          const newAccessToken = await this.refreshAccessToken(businessAccountId);
          const newConfig = { headers: { Authorization: `Bearer ${newAccessToken}` } };
          let retryResponse: any;

          if (method === 'GET') {
            retryResponse = await firstValueFrom(this.httpService.get(url, newConfig));
          } else if (method === 'POST') {
            retryResponse = await firstValueFrom(this.httpService.post(url, data, newConfig));
          }

          if (!retryResponse) throw new Error('Retry response was empty');
          return retryResponse.data;
        } catch (retryError: unknown) {
          const msg = retryError instanceof Error ? retryError.message : 'Unknown error';
          this.logger.error(`[GoogleService] Retry after token refresh failed: ${msg}`, 'makeGoogleApiCall');
          throw retryError;
        }
      }

      if (axiosError?.response?.status === 429) {
        const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60', 10);
        throw new RateLimitError(retryAfter);
      }

      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[GoogleService] API call failed: ${msg}`, 'makeGoogleApiCall');
      throw error;
    }
  }

  private parseDate(dateString: string): { year: number; month: number; day: number } {
    const [year, month, day] = dateString.split('-').map(Number);
    return { year, month, day };
  }

  private parseDateFromGoogle(dateObj: any): Date {
    const { year, month, day } = dateObj;
    return new Date(year, month - 1, day);
  }
}