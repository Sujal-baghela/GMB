# Contributing Guide

## Code of Conduct

We are committed to providing a welcoming and inspiring community. Please read and follow our Code of Conduct.

## Getting Started

### Development Environment Setup

1. **Fork and Clone**
```bash
git clone https://github.com/yourusername/gbp.git
cd gbp
```

2. **Install Dependencies**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **Setup Environment**
```bash
cp .env.example .env
# Configure with your local settings
```

4. **Start Development**
```bash
docker-compose up -d
npm run dev
```

## Making Changes

### Branch Naming
```
feature/short-description       # New features
bugfix/short-description        # Bug fixes
docs/short-description          # Documentation
chore/short-description         # Maintenance
hotfix/short-description        # Production fixes
```

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)

Examples:
- feat(auth): add JWT refresh token rotation
- fix(reviews): correct sentiment analysis calculation
- docs(api): update authentication endpoints
- test(auth): add login security tests
- chore(deps): update dependencies
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (run `npm run format`)
- **Linting**: ESLint (run `npm run lint:fix`)
- **Max Line Length**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Always

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types
async function getUserById(id: string): Promise<User> {
  return this.prisma.user.findUnique({ where: { id } });
}

// ❌ Bad: Implicit any type
async function getUserById(id) {
  return this.prisma.user.findUnique({ where: { id } });
}

// ✅ Good: Error handling
try {
  const user = await this.getUserById(id);
} catch (error) {
  if (error instanceof PrismaClientNotFoundError) {
    throw new NotFoundError('User not found');
  }
  throw error;
}
```

## Testing

### Test Coverage Requirements
- Minimum 80% code coverage
- All public APIs must have tests
- All business logic must be tested
- Security-sensitive code requires security tests

### Writing Tests

```typescript
describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReviewService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createReview', () => {
    it('should create a review with valid input', async () => {
      const dto: CreateReviewDto = { /* ... */ };
      const result = await service.createReview(dto);
      expect(result).toHaveProperty('id');
      expect(prisma.review.create).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should throw ValidationError for invalid rating', async () => {
      const dto: CreateReviewDto = { rating: 6 }; // Invalid
      await expect(service.createReview(dto)).rejects.toThrow(ValidationError);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- ReviewService

# Watch mode
npm run test:watch

# With coverage
npm run test:cov

# E2E tests
npm run e2e
```

## Pull Request Process

### PR Requirements

1. **Description**: Clear explanation of changes
2. **Tests**: New tests for new features
3. **Documentation**: Updated docs for public APIs
4. **Changelog**: Entry in CHANGELOG.md
5. **No Conflicts**: Rebased on main
6. **Checks Pass**: CI/CD pipeline passes
7. **Review Approval**: At least 2 approvals

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Testing
Describe test coverage

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Changelog updated
```

### Code Review Process

Reviewers will check for:
- Code quality and style
- Test coverage
- Security concerns
- Performance implications
- Documentation completeness
- Breaking changes

## Documentation

### Code Documentation

```typescript
/**
 * Create a new review reply
 * 
 * @param reviewId - ID of the review to reply to
 * @param dto - Reply data including content and user ID
 * @returns Created ReviewReply entity
 * @throws NotFoundError if review doesn't exist
 * @throws UnauthorizedError if user lacks permission
 * 
 * @example
 * const reply = await service.createReply(reviewId, {
 *   content: 'Thank you for your feedback!',
 *   userId: 'user-123'
 * });
 */
async createReply(
  reviewId: string,
  dto: CreateReplyDto
): Promise<ReviewReply> {
  // Implementation
}
```

### API Documentation

Update `docs/API.md` for new endpoints:

```markdown
### Create Review Reply
POST /api/reviews/:id/replies
Authorization: Bearer <token>

Request:
{
  "content": "Thank you for your feedback!"
}

Response: 201
{
  "id": "reply-id",
  "reviewId": "review-id",
  "content": "Thank you for your feedback!",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Security

### Reporting Security Issues

Do NOT create public GitHub issues for security vulnerabilities.

1. Email security@example.com with:
   - Vulnerability description
   - Affected versions
   - Reproduction steps
   - Proposed fix (if available)

2. We'll investigate and respond within 48 hours

3. Coordinated disclosure: Fix released before public disclosure

## Database Migrations

### Creating Migrations

```bash
# Create new migration
npm run migrate:create -- --name add_new_column

# Auto-generate from schema changes
npx prisma migrate dev --name add_new_column

# Review migration before applying
cat prisma/migrations/[migration-name]/migration.sql
```

### Migration Guidelines

- **Down migrations**: Always write them
- **Large tables**: Use `CREATE TABLE ... AS SELECT`
- **Data migrations**: Use separate migration file
- **Testing**: Test migration up and down locally
- **Timing**: Consider production impact

## Performance Optimization

### Backend Performance

```typescript
// ❌ Bad: N+1 query problem
const reviews = await this.prisma.review.findMany();
for (const review of reviews) {
  review.author = await this.prisma.user.findUnique({
    where: { id: review.authorId },
  });
}

// ✅ Good: Use include/select
const reviews = await this.prisma.review.findMany({
  include: { author: true },
});
```

### Frontend Performance

```typescript
// ✅ Good: Memoization
const MemoizedReview = React.memo(ReviewComponent);

// ✅ Good: Code splitting
const DashboardPage = dynamic(() => import('./dashboard'), {
  loading: () => <Skeleton />,
});
```

## Deployment

### Staging Deployment

```bash
# Merge to develop branch
git push origin feature/my-feature

# GitHub Actions automatically deploys to staging
# Test at https://staging.example.com
```

### Production Deployment

```bash
# Create release on GitHub
# Version follows semantic versioning: v1.0.0

# GitHub Actions builds and deploys
# Deployment: Kubernetes rolling update
# Rollback available within 1 hour
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [OWASP Security Guidelines](https://owasp.org/)

## Questions?

- GitHub Discussions
- Email: dev@example.com
- Slack: #development channel

Thank you for contributing! 🎉
