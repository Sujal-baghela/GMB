import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// Your real workspace ID from earlier
const WORKSPACE_ID = process.env.DEMO_WORKSPACE_ID || 'cmqiykick0005yi9nzwf1a2x1';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const REVIEW_TEMPLATES = [
  { rating: 5, content: 'Excellent service and great quality products. Will definitely come back again!' },
  { rating: 5, content: 'Best store in the area. Staff is very helpful and friendly.' },
  { rating: 4, content: 'Good experience overall, prices are reasonable.' },
  { rating: 5, content: 'Loved the variety of products available. Highly recommend.' },
  { rating: 3, content: 'Decent store but the queue was a bit long during peak hours.' },
  { rating: 4, content: 'Clean store, good parking, and quick billing process.' },
  { rating: 5, content: 'Always fresh stock and fair pricing. My go-to store.' },
  { rating: 2, content: 'Service was slow today, but products were fine.' },
  { rating: 4, content: 'Nice ambience and helpful staff members.' },
  { rating: 5, content: 'Amazing experience, found everything I needed quickly.' },
];

const AUTHOR_NAMES = [
  'Rahul Sharma', 'Priya Verma', 'Amit Singh', 'Sneha Gupta', 'Vikram Rao',
  'Anjali Mehta', 'Rohit Kumar', 'Pooja Yadav', 'Suresh Patel', 'Neha Joshi',
  'Karan Malhotra', 'Divya Nair',
];

async function main() {
  console.log('🌱 Seeding demo Google Business data...');

  const workspace = await prisma.workspace.findUnique({ where: { id: WORKSPACE_ID } });
  if (!workspace) {
    throw new Error(`Workspace ${WORKSPACE_ID} not found. Pass DEMO_WORKSPACE_ID env var with a valid id.`);
  }

 const workspaceUser = await prisma.workspaceUser.findFirst({ where: { workspaceId: WORKSPACE_ID } });
 const fallbackUser = await prisma.user.findUnique({ where: { email: 'sujalbaghela@gmail.com' } });
 const userId = workspaceUser?.userId || fallbackUser?.id;

  // 1. Business Account
  const businessAccount = await prisma.businessAccount.upsert({
    where: { googleAccountId: 'demo-account-001' },
    update: {},
    create: {
      workspaceId: WORKSPACE_ID,
      googleAccountId: 'demo-account-001',
      name: 'Sharma General Store',
      email: 'demo@sharmastore.com',
      verificationState: 'VERIFIED',
    },
  });
  console.log(`✅ BusinessAccount: ${businessAccount.name} (${businessAccount.id})`);

  // 2. Fake OAuth Token — 10yr expiry, never touches real Google
  await prisma.oAuthToken.upsert({
    where: { businessAccountId: businessAccount.id },
    update: {},
    create: {
      businessAccountId: businessAccount.id,
      accessToken: 'demo-access-token-do-not-use',
      refreshToken: 'demo-refresh-token-do-not-use',
      expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      scope: 'https://www.googleapis.com/auth/business.manage',
    },
  });
  console.log('✅ OAuthToken (mock, 10yr expiry)');

  // 3. Locations
  const locationsData = [
    {
      googleLocationId: 'demo-location-001',
      name: 'Sharma General Store - MG Road',
      address: '12 MG Road', city: 'Gwalior', state: 'Madhya Pradesh',
      zipCode: '474001', country: 'IN', phone: '+91 98765 43210',
      website: 'https://sharmastore.example.com', businessType: 'Grocery Store',
      latitude: 26.2183, longitude: 78.1828,
    },
    {
      googleLocationId: 'demo-location-002',
      name: 'Sharma General Store - City Center',
      address: '45 City Center Mall', city: 'Gwalior', state: 'Madhya Pradesh',
      zipCode: '474002', country: 'IN', phone: '+91 98765 43211',
      website: 'https://sharmastore.example.com', businessType: 'Grocery Store',
      latitude: 26.2295, longitude: 78.1995,
    },
  ];

  const locations = [];
  for (const loc of locationsData) {
    const location = await prisma.location.upsert({
      where: { googleLocationId: loc.googleLocationId },
      update: {},
      create: {
        workspaceId: WORKSPACE_ID,
        businessAccountId: businessAccount.id,
        googleLocationId: loc.googleLocationId,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
        country: loc.country,
        phone: loc.phone,
        website: loc.website,
        businessType: loc.businessType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        businessHours: JSON.stringify({
          monday: '9:00 AM - 9:00 PM', tuesday: '9:00 AM - 9:00 PM',
          wednesday: '9:00 AM - 9:00 PM', thursday: '9:00 AM - 9:00 PM',
          friday: '9:00 AM - 9:00 PM', saturday: '9:00 AM - 10:00 PM',
          sunday: '10:00 AM - 8:00 PM',
        }),
        attributes: JSON.stringify({ wheelchairAccessible: true, parking: true, delivery: true }),
        syncedAt: new Date(),
      },
    });
    locations.push(location);
    console.log(`✅ Location: ${location.name} (${location.id})`);
  }

  // 4. Reviews + rating rollup
  for (const location of locations) {
    let ratingSum = 0;
    const reviewCount = randomInt(8, 14);
    for (let i = 0; i < reviewCount; i++) {
      const template = REVIEW_TEMPLATES[randomInt(0, REVIEW_TEMPLATES.length - 1)];
      const author = AUTHOR_NAMES[randomInt(0, AUTHOR_NAMES.length - 1)];
      ratingSum += template.rating;

      await prisma.review.upsert({
        where: { googleReviewId: `demo-review-${location.id}-${i}` },
        update: {},
        create: {
          workspaceId: WORKSPACE_ID,
          locationId: location.id,
          googleReviewId: `demo-review-${location.id}-${i}`,
          authorName: author,
          rating: template.rating,
          content: template.content,
          status: 'APPROVED',
          publishedAt: daysAgo(randomInt(1, 60)),
          synced: true,
        },
      });
    }

    const avgRating = Math.round((ratingSum / reviewCount) * 10) / 10;
    await prisma.location.update({
      where: { id: location.id },
      data: { googleRating: avgRating, googleReviewCount: reviewCount },
    });
    console.log(`✅ ${reviewCount} reviews seeded for ${location.name} (avg rating ${avgRating})`);
  }

  // 5. Analytics — last 30 days per location
  for (const location of locations) {
    for (let i = 30; i >= 0; i--) {
      const date = daysAgo(i);
      date.setHours(0, 0, 0, 0);
      await prisma.analytics.upsert({
        where: {
          workspaceId_locationId_date_period: {
            workspaceId: WORKSPACE_ID, locationId: location.id, date, period: 'day',
          },
        },
        update: {},
        create: {
          workspaceId: WORKSPACE_ID,
          locationId: location.id,
          date,
          period: 'day',
          reviewCount: randomInt(0, 2),
          reviewRating: randomInt(35, 50) / 10,
          searches: randomInt(20, 80),
          directions: randomInt(5, 25),
          websiteClicks: randomInt(3, 20),
          phoneClicks: randomInt(2, 15),
          postImpressions: randomInt(50, 300),
          postEngagement: randomInt(5, 40),
          photoViews: randomInt(10, 100),
          conversions: randomInt(0, 8),
          bookings: randomInt(0, 5),
        },
      });
    }
    console.log(`✅ 31 days of analytics seeded for ${location.name}`);
  }

  // 6. Sample posts + notifications (needs a real userId)
  if (userId) {
    const postsData = [
      { title: 'Weekend Sale!', content: 'Get 20% off on all groceries this weekend. Visit us today!', postType: 'OFFER', status: 'PUBLISHED' as const },
      { title: 'New Stock Arrived', content: 'Fresh vegetables and dairy products just arrived. Come check them out!', postType: 'UPDATE', status: 'PUBLISHED' as const },
      { title: 'Festival Special Combo', content: 'Special festive combo packs now available at great prices.', postType: 'PRODUCT', status: 'DRAFT' as const },
    ];
    for (const [idx, p] of postsData.entries()) {
      const location = locations[idx % locations.length];
      await prisma.post.create({
        data: {
          workspaceId: WORKSPACE_ID,
          locationId: location.id,
          userId,
          title: p.title,
          content: p.content,
          postType: p.postType,
          status: p.status,
          publishedAt: p.status === 'PUBLISHED' ? daysAgo(randomInt(1, 10)) : null,
          views: p.status === 'PUBLISHED' ? randomInt(50, 500) : 0,
          clicks: p.status === 'PUBLISHED' ? randomInt(5, 80) : 0,
        },
      });
    }
    console.log(`✅ ${postsData.length} sample posts created`);

    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.REVIEW_RECEIVED,
        title: 'New 5-star review received',
        message: `${AUTHOR_NAMES[0]} left a 5-star review on ${locations[0].name}`,
        data: JSON.stringify({ locationId: locations[0].id }),
      },
    });
    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.ANALYTICS_REPORT,
        title: 'Weekly analytics report ready',
        message: 'Your weekly performance summary is ready to view.',
      },
    });
    console.log('✅ Sample notifications created');
  } else {
    console.log('⚠️  No WorkspaceUser found — skipped posts/notifications');
  }

  console.log('\n🎉 Demo seed complete!');
  console.log(`   BusinessAccount ID: ${businessAccount.id}`);
  console.log(`   Locations: ${locations.map(l => l.id).join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });