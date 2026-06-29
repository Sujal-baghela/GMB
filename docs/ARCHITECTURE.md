# Architecture Documentation

## System Overview

The Google Business Profile Management Platform is a multi-tenant SaaS application built on modern cloud-native technologies. It follows a clean, modular architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Web Browser   │  │  Mobile App    │  │  API Clients   │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CDN / Load Balancer                          │
│                      (Nginx/ALB)                                │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster / Docker                    │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  Frontend Pods   │              │  Backend Pods    │        │
│  │  (Next.js)       │◄────────────►│  (NestJS)        │        │
│  │  Replicas: 2-n   │              │  Replicas: 3-n   │        │
│  └──────────────────┘              └──────────────────┘        │
│           ↓                                ↓                     │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   Redis Cache    │              │  PostgreSQL DB   │        │
│  │  (Session/Cache) │              │  (Data Store)    │        │
│  └──────────────────┘              └──────────────────┘        │
│                                           ↓                     │
│                                   ┌──────────────────┐          │
│                                   │  BullMQ Jobs     │          │
│                                   │  (Background)    │          │
│                                   └──────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Google APIs │  │  Stripe      │  │  AWS S3      │         │
│  │  (OAuth/GMB) │  │  (Payments)  │  │  (Storage)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Sentry      │  │  SendGrid    │  │  OpenTelemetry
│  │  (Errors)    │  │  (Email)     │  │  (Monitoring)│        │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Layered Architecture

### 1. Presentation Layer (Frontend)
- **Technology**: Next.js 15, React 19, TypeScript
- **Responsibilities**:
  - User interface rendering
  - Client-side validation
  - State management (Zustand)
  - API communication (Axios)
- **Features**:
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Image optimization
  - Code splitting

### 2. API Gateway Layer
- **Technology**: Nginx
- **Responsibilities**:
  - Request routing
  - SSL/TLS termination
  - Request/response logging
  - Security headers
  - Rate limiting (initial)
  - Compression

### 3. Application Layer (Backend)
- **Technology**: NestJS, TypeScript, Node.js
- **Module-based architecture**:

```
src/
├── auth/              # Authentication & authorization
├── users/             # User management
├── organizations/     # Multi-tenant support
├── workspaces/        # Workspace management
├── teams/             # Team collaboration
├── subscriptions/     # Subscription management
├── billing/           # Billing operations
├── stripe/            # Stripe integration
├── google/            # Google Business Profile API
├── locations/         # Business locations
├── reviews/           # Review management
├── posts/             # Post management
├── photos/            # Photo management
├── analytics/         # Analytics engine
├── notifications/     # Notifications
├── audit/             # Audit logging
├── jobs/              # Background jobs
├── health/            # Health checks
├── common/            # Shared utilities
│   ├── filters/       # Exception filters
│   ├── guards/        # Authentication guards
│   ├── decorators/    # Custom decorators
│   ├── utils/         # Helper functions
│   ├── exceptions/    # Exception classes
│   ├── logger/        # Logging service
│   └── prisma/        # Database layer
└── monitoring/        # Monitoring & telemetry
```

### 4. Data Layer
- **Technology**: PostgreSQL, Prisma ORM
- **Features**:
  - Connection pooling
  - Query optimization
  - Migration management
  - Type-safe queries

### 5. Cache Layer
- **Technology**: Redis
- **Uses**:
  - Session storage
  - Query result caching
  - Rate limiting counters
  - Job queue storage

### 6. Job Queue Layer
- **Technology**: BullMQ
- **Responsibilities**:
  - Review sync jobs
  - Analytics sync jobs
  - Email delivery
  - Scheduled tasks
  - Retry logic

## Design Patterns

### 1. Module Pattern
Each feature is self-contained in a module with:
- Controller (HTTP endpoints)
- Service (business logic)
- DTO (data transfer objects)
- Entity (database models)
- Repository (data access)

### 2. Dependency Injection
NestJS provides built-in DI for:
- Service injection
- Configuration management
- Database connection
- External service integration

### 3. Middleware Pattern
Custom middleware for:
- Authentication
- Authorization
- Logging
- Error handling
- Request validation

### 4. Strategy Pattern
For different payment processors and email providers

### 5. Observer Pattern
Event-driven architecture for:
- User notifications
- Audit logging
- Analytics tracking

## Authentication & Authorization

### JWT-Based Authentication
```
Flow:
1. User logs in with email/password
2. Backend validates and generates JWT tokens
3. Client stores access token (short-lived) & refresh token (long-lived)
4. Client includes access token in Authorization header
5. On expiry, client uses refresh token to get new access token
6. Backend validates tokens and enforces role-based access
```

### Role-Based Access Control (RBAC)
- **Roles**: ADMIN, OWNER, MANAGER, ANALYST, VIEWER
- **Permissions**: Granular permissions per role
- **Enforcement**: Guards and decorators on endpoints

## Multi-Tenancy

### Tenant Isolation
- Data isolation at database level
- Organization-based query filtering
- Workspace-scoped operations
- Row-level security (RLS) ready

### Tenant Structure
```
Organization
  ├── Workspaces (logical groupings)
  │   ├── Teams
  │   │   ├── Team Members
  │   │   └── Permissions
  │   └── Business Accounts
  │       ├── Locations
  │       ├── Reviews
  │       ├── Posts
  │       └── Photos
  └── Subscription
      ├── Billing
      ├── Invoices
      └── Payments
```

## Data Flow

### Review Creation/Update Flow
```
Google API (Event)
       ↓
Sync Job (BullMQ)
       ↓
Google Service (Fetch)
       ↓
Database (Store)
       ↓
WebSocket (Push Update)
       ↓
Frontend (Display)
```

### Analytics Aggregation Flow
```
Raw Events (Reviews, Posts, Searches)
       ↓
Analytics Service (Aggregate)
       ↓
Cache (Redis)
       ↓
Database (Persist)
       ↓
Charts/Graphs (Display)
```

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Load balancing across pods
- Database connection pooling
- Redis as shared cache

### Vertical Scaling
- Resource requests/limits
- Pod disruption budgets
- Memory optimization
- CPU throttling

### Database Optimization
- Connection pooling
- Query indexing
- Caching layer
- Pagination for large datasets
- Background job offloading

## Security Architecture

### Network Security
- HTTPS/TLS encryption
- CORS configuration
- CSRF protection
- Security headers (Helmet)
- Rate limiting

### Application Security
- Input validation (Zod)
- SQL injection prevention (Prisma)
- XSS protection
- OWASP guidelines
- Secure password hashing (Argon2)

### Data Security
- Encryption at rest (application-level)
- Encryption in transit (TLS)
- Sensitive data masking
- Audit logging

## External Integrations

### Google Business Profile API
- OAuth 2.0 authentication
- Token refresh management
- Rate limiting (600 req/min)
- Batch operations
- Error retry logic
- Pagination support

### Stripe Payment Processing
- PCI-DSS compliance
- Webhook handling
- Subscription management
- Invoice generation
- Customer data sync

### AWS S3 Storage
- File upload/download
- Presigned URLs
- Image optimization
- CDN integration
- Lifecycle policies

### Monitoring & Observability
- **Sentry**: Error tracking & performance monitoring
- **OpenTelemetry**: Distributed tracing
- **Health Checks**: Readiness & liveness probes
- **Structured Logging**: JSON logs for analysis

## Deployment Architecture

### Development
- Docker Compose for local development
- PostgreSQL container
- Redis container
- Nginx container

### Staging
- Kubernetes cluster
- 2 frontend replicas
- 2 backend replicas
- Managed PostgreSQL
- Elasticache Redis

### Production
- Kubernetes cluster (3+ node HA)
- 3-10 frontend replicas (auto-scaling)
- 3-10 backend replicas (auto-scaling)
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis (Multi-AZ)
- ALB load balancer
- CloudFront CDN

## Performance Optimization

### Caching Strategy
- Query result caching (5 min TTL)
- Session caching (Redis)
- Static asset caching (1 year)
- Browser caching (ETag)

### Database Optimization
- Indexes on frequently queried fields
- Lazy loading relationships
- Query optimization
- Connection pooling

### Frontend Optimization
- Code splitting
- Image optimization
- CSS-in-JS optimization
- Lazy loading components
- Service worker caching

## Monitoring & Observability

### Metrics
- Request latency
- Error rate
- Database query time
- Cache hit rate
- Job queue depth
- Pod resource usage

### Logging
- Structured logging (JSON)
- Log aggregation (ELK/CloudWatch)
- Log levels (error, warn, info, debug)
- Request tracing IDs

### Alerting
- Error rate threshold
- Latency SLA violations
- Pod restart alerts
- Database connection pool exhaustion
- Disk space warnings
