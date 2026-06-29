import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.roleEntity.deleteMany();

  // Create roles
  const adminRole = await prisma.roleEntity.create({
    data: {
      name: 'ADMIN',
      description: 'Full system access',
    },
  });

  const ownerRole = await prisma.roleEntity.create({
    data: {
      name: 'OWNER',
      description: 'Organization owner',
    },
  });

  const managerRole = await prisma.roleEntity.create({
    data: {
      name: 'MANAGER',
      description: 'Workspace manager',
    },
  });

  const analystRole = await prisma.roleEntity.create({
    data: {
      name: 'ANALYST',
      description: 'Data analyst',
    },
  });

  const viewerRole = await prisma.roleEntity.create({
    data: {
      name: 'VIEWER',
      description: 'Read-only access',
    },
  });

  // Create permissions
  const permissionsList = [
    // User permissions
    { name: 'user.create', category: 'user', description: 'Create users' },
    { name: 'user.read', category: 'user', description: 'View users' },
    { name: 'user.update', category: 'user', description: 'Update users' },
    { name: 'user.delete', category: 'user', description: 'Delete users' },

    // Organization permissions
    { name: 'organization.create', category: 'organization', description: 'Create organizations' },
    { name: 'organization.read', category: 'organization', description: 'View organizations' },
    { name: 'organization.update', category: 'organization', description: 'Update organizations' },
    { name: 'organization.delete', category: 'organization', description: 'Delete organizations' },

    // Review permissions
    { name: 'review.create', category: 'review', description: 'Create reviews' },
    { name: 'review.read', category: 'review', description: 'View reviews' },
    { name: 'review.update', category: 'review', description: 'Update reviews' },
    { name: 'review.delete', category: 'review', description: 'Delete reviews' },
    { name: 'review.reply', category: 'review', description: 'Reply to reviews' },

    // Location permissions
    { name: 'location.create', category: 'location', description: 'Create locations' },
    { name: 'location.read', category: 'location', description: 'View locations' },
    { name: 'location.update', category: 'location', description: 'Update locations' },
    { name: 'location.delete', category: 'location', description: 'Delete locations' },

    // Post permissions
    { name: 'post.create', category: 'post', description: 'Create posts' },
    { name: 'post.read', category: 'post', description: 'View posts' },
    { name: 'post.update', category: 'post', description: 'Update posts' },
    { name: 'post.delete', category: 'post', description: 'Delete posts' },
    { name: 'post.publish', category: 'post', description: 'Publish posts' },

    // Analytics permissions
    { name: 'analytics.read', category: 'analytics', description: 'View analytics' },
    { name: 'analytics.export', category: 'analytics', description: 'Export analytics' },

    // Billing permissions
    { name: 'billing.read', category: 'billing', description: 'View billing' },
    { name: 'billing.update', category: 'billing', description: 'Update billing' },
    { name: 'billing.manage', category: 'billing', description: 'Manage subscriptions' },

    // Settings permissions
    { name: 'settings.read', category: 'settings', description: 'View settings' },
    { name: 'settings.update', category: 'settings', description: 'Update settings' },
  ];

  const permissions = await Promise.all(
    permissionsList.map((p) =>
      prisma.permission.create({
        data: p,
      })
    )
  );

  // Assign permissions to roles
  const adminPermissions = permissions; // All permissions
  const ownerPermissions = permissions.filter((p) => p.name !== 'user.delete' && p.name !== 'organization.delete');
  const managerPermissions = permissions.filter(
    (p) =>
      p.category === 'review' ||
      p.category === 'location' ||
      p.category === 'post' ||
      p.category === 'analytics'
  );
  const analystPermissions = permissions.filter((p) => p.category === 'analytics');
  const viewerPermissions = permissions.filter((p) => p.name.includes('.read'));

  // Admin permissions
  for (const perm of adminPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Owner permissions
  for (const perm of ownerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: ownerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Manager permissions
  for (const perm of managerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: managerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Analyst permissions
  for (const perm of analystPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: analystRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Viewer permissions
  for (const perm of viewerPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: viewerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Create subscription plans
  const freePlan = await prisma.plan.create({
    data: {
      name: 'FREE',
      displayName: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      maxLocations: 1,
      maxTeamMembers: 1,
      maxApiKeys: 1,
      features: ['Basic reviews management', 'Limited analytics', 'Community support'],
    },
  });

  const starterPlan = await prisma.plan.create({
    data: {
      name: 'STARTER',
      displayName: 'Starter',
      description: 'For small businesses',
      price: 2999, // $29.99
      maxLocations: 5,
      maxTeamMembers: 3,
      maxApiKeys: 2,
      features: [
        'Reviews management',
        'Posts and photos',
        'Basic analytics',
        'Email support',
        'API access',
      ],
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'PRO',
      displayName: 'Pro',
      description: 'For growing businesses',
      price: 7999, // $79.99
      maxLocations: 50,
      maxTeamMembers: 10,
      maxApiKeys: 10,
      features: [
        'Reviews management',
        'Posts and photos',
        'Advanced analytics',
        'Team management',
        'Priority support',
        'API access',
        'Scheduled posts',
        'Bulk operations',
      ],
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'ENTERPRISE',
      displayName: 'Enterprise',
      description: 'For large organizations',
      price: 0, // Custom pricing
      maxLocations: 0, // Unlimited
      maxTeamMembers: 0,
      maxApiKeys: 0,
      features: [
        'Unlimited everything',
        'Advanced analytics',
        'Team management',
        'Custom integrations',
        'Dedicated support',
        'API access',
        'White-label options',
        'SSO/SAML',
        'SLA guarantee',
      ],
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`📋 Created ${permissions.length} permissions`);
  console.log(`👥 Created 5 roles`);
  console.log(`💳 Created 4 subscription plans`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
