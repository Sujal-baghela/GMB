# Security Implementation Guide

## Overview

This document outlines all security measures implemented in the Google Business Profile Management Platform.

## 1. Authentication Security

### JWT Implementation
- **Access Tokens**: Short-lived (24 hours)
- **Refresh Tokens**: Long-lived (7 days), stored securely
- **Token Rotation**: Automatic on refresh
- **Algorithm**: HS256 with secure key management

```typescript
// Token generation with expiration
const accessToken = jwtService.sign(payload, {
  expiresIn: '24h',
  secret: process.env.JWT_SECRET,
});

const refreshToken = jwtService.sign(payload, {
  expiresIn: '7d',
  secret: process.env.JWT_REFRESH_SECRET,
});
```

### Password Security
- **Hashing Algorithm**: Argon2id
- **Memory Cost**: 19 MB
- **Time Cost**: 2 iterations
- **Parallelism**: 1
- **Never store plaintext passwords**

```typescript
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});
```

### OAuth 2.0 Integration
- **Provider**: Google
- **Scopes**: Minimal and specific
- **Token Exchange**: Server-side only
- **Refresh Token Management**: Automatic rotation
- **Secure Callback**: HTTPS required

## 2. Authorization & Access Control

### Role-Based Access Control (RBAC)

```
ADMIN          - Full system access
OWNER          - Organization owner
MANAGER        - Workspace manager
ANALYST        - View analytics only
VIEWER         - Read-only access
```

### Permission Matrix

| Resource | ADMIN | OWNER | MANAGER | ANALYST | VIEWER |
|----------|-------|-------|---------|---------|--------|
| Users    | CRUD  | CR    | -       | -       | R      |
| Reviews  | CRUD  | CRUD  | CRUD    | R       | R      |
| Posts    | CRUD  | CRUD  | CRUD    | -       | R      |
| Analytics| CRUD  | CRUD  | CRUD    | R       | R      |
| Billing  | CRUD  | CRUD  | -       | -       | R      |

### Implementation
```typescript
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'OWNER')
@Post('reviews/:id/reply')
replyToReview(@Param('id') id: string, @Body() dto: ReplyDto) {
  // Only ADMIN and OWNER can reply
}
```

## 3. Data Protection

### Encryption at Rest
- Application-level encryption for sensitive data
- Encrypted database backups
- Encrypted S3 objects

### Encryption in Transit
- HTTPS/TLS 1.3 mandatory
- Secure cookies with HttpOnly flag
- Certificate pinning ready

### Sensitive Data Masking
```typescript
// API responses mask sensitive data
{
  id: "user-id",
  email: "user@example.com",
  password: undefined, // Never exposed
  paymentMethod: "****1234", // Partially masked
}
```

## 4. Input Validation & Sanitization

### Zod Schema Validation
```typescript
const createReviewSchema = z.object({
  title: z.string().max(100),
  content: z.string().max(5000),
  rating: z.number().min(1).max(5),
  email: z.string().email(),
});
```

### SQL Injection Prevention
- **Prisma ORM**: Parameterized queries only
- **No raw SQL**: Avoid `$queryRaw` unless absolutely necessary
- **Input escape**: Automatic by Prisma

### XSS Protection
- Helmet.js security headers
- DOMPurify on frontend
- Content Security Policy (CSP)
- XSS Protection header

## 5. CSRF Protection

### Implementation
- CSRF tokens on state-changing operations
- SameSite cookies (Strict)
- Token validation on POST/PUT/DELETE

```typescript
// CSRF middleware
app.use(csrf());

// Usage
@Post('sensitive-action')
sensitiveAction(@Body() dto: any, @CsrfToken() csrfToken: string) {
  // CSRF token automatically validated
}
```

## 6. Rate Limiting

### Configuration
- **Window**: 15 minutes
- **Default Limit**: 100 requests
- **Premium Limit**: 1000 requests
- **Storage**: Redis for distributed rate limiting

```typescript
@UseGuards(RateLimitGuard)
@Post('reviews')
createReview(@Body() dto: CreateReviewDto) {
  // Rate limited by IP or user ID
}
```

## 7. API Security

### Request Validation
- Content-Type validation
- Request size limits (20 MB)
- Payload structure validation

### Response Security
- No sensitive data exposure
- Proper HTTP status codes
- Security headers on all responses

### Headers
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## 8. Session Security

### Session Management
- Session timeout: 24 hours
- Secure session storage: Redis
- Session invalidation on logout
- Session rotation on role change

```typescript
const session = {
  id: generateRandomId(),
  userId,
  token,
  expiresAt: Date.now() + 86400000,
  isRevoked: false,
};
```

## 9. API Key Security

### Generation & Storage
- Generated with cryptographic randomness
- Hashed before storage (similar to passwords)
- Prefix for identification: `sk_` or `pk_`
- Expiration support

```typescript
const apiKey = {
  id: generateId(),
  keyHash: await hash(generatedKey),
  lastUsedAt: new Date(),
  expiresAt: addMonths(new Date(), 12),
};
```

### Usage
```bash
# Request with API Key
curl -H "X-API-Key: sk_live_abc123..." https://api.example.com/api/...
```

## 10. Audit Logging

### Logged Events
- User login/logout
- Permission changes
- Data modifications (Create, Update, Delete)
- Failed authentication attempts
- Admin actions
- Billing changes
- API key usage

### Audit Log Structure
```typescript
{
  id: uuid,
  organizationId: string,
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN',
  resourceType: 'USER' | 'REVIEW' | 'LOCATION',
  resourceId: string,
  changes: {
    before: {},
    after: {},
  },
  ipAddress: string,
  userAgent: string,
  timestamp: DateTime,
  status: 'SUCCESS' | 'FAILURE',
}
```

## 11. Multi-Tenancy Security

### Tenant Isolation
- Query filtering by organization/workspace
- Row-level security ready
- No cross-tenant data leakage
- Separate backup per tenant

```typescript
// All queries filtered by organization
async getReviews(organizationId: string) {
  return this.prisma.review.findMany({
    where: { workspace: { organizationId } },
  });
}
```

### Data Segregation
- Different encryption keys per tenant (optional)
- Separate storage per tenant (optional)
- No shared caches without isolation key

## 12. Third-Party Integration Security

### Google OAuth
- ClientSecret never exposed
- Token exchange server-side only
- Scope limitation
- Token refresh on expiry

### Stripe Integration
- PCI-DSS compliant
- No credit card handling (Stripe handles)
- Secure webhook signature verification
- Idempotency keys for operations

### AWS S3
- Presigned URLs with expiration
- Bucket policies restrict access
- Server-side encryption
- Access logging enabled

## 13. Infrastructure Security

### Network Security
- VPC isolation
- Security groups/Network policies
- NACLs for subnet protection
- WAF rules for DDoS protection

### Container Security
- Non-root user in containers
- Read-only root filesystem
- Resource limits
- Security scanning on images

### Kubernetes Security
- Pod Security Policies
- Network policies
- RBAC for service accounts
- Secrets encryption at rest
- Audit logging enabled

## 14. Monitoring & Alerting

### Security Monitoring
- Failed login attempts
- Anomalous behavior detection
- Rate limit violations
- Permission escalation attempts
- Unusual data access patterns

### Alerting
```typescript
// Alert on suspicious activity
if (failedLoginCount > 5 && timeWindow < 15 * 60 * 1000) {
  await sendSecurityAlert('Brute force attempt detected');
  await lockAccount(userId);
}
```

## 15. Compliance

### Standards
- OWASP Top 10
- GDPR compliant data handling
- SOC 2 ready architecture
- HIPAA compatible (if needed)

### Data Handling
- Data retention policies
- GDPR right to be forgotten
- Export functionality
- Secure deletion

## 16. Security Best Practices

### Code Review
- Security-focused peer reviews
- Static analysis (Semgrep)
- Dependency scanning (npm audit)
- SAST scanning

### Incident Response
- Incident response plan
- Security contact: security@example.com
- Vulnerability disclosure policy
- Regular security training

### Regular Updates
- Dependency updates weekly
- Security patches immediately
- Framework updates quarterly
- Infrastructure updates as needed

## 17. Testing Security

### Security Tests
```typescript
describe('Auth Security', () => {
  it('should not expose password in response', async () => {
    const response = await api.post('/auth/register', { ... });
    expect(response.body.user.password).toBeUndefined();
  });

  it('should validate CSRF token', async () => {
    const response = await api.post('/reviews', { ... });
    expect(response.status).toBe(403);
  });

  it('should rate limit excessive requests', async () => {
    for (let i = 0; i < 101; i++) {
      await api.get('/reviews');
    }
    const response = await api.get('/reviews');
    expect(response.status).toBe(429);
  });
});
```

## 18. Incident Response Procedures

### Security Incident
1. **Detect** - Monitoring and alerting systems
2. **Respond** - Isolate affected systems
3. **Contain** - Prevent further damage
4. **Investigate** - Root cause analysis
5. **Recover** - Restore systems
6. **Communicate** - Notify affected parties
7. **Improve** - Implement preventative measures

### Contact
- Security Email: security@example.com
- Escalation: On-call security team
- Reporting: security@example.com with [SECURITY] prefix
