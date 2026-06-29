# Google Business Profile Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)

> Enterprise-grade SaaS platform for managing Google Business Profile accounts, reviews, analytics, and customer engagement at scale.

## 🚀 Features

### Core Functionality
- **Multi-Account Management** - Manage multiple Google Business Profile accounts and locations from a single dashboard
- **Reviews Management** - View, monitor, and reply to customer reviews with sentiment analysis
- **Content Management** - Create, schedule, and publish posts and photos to business profiles
- **Advanced Analytics** - Real-time analytics on reviews, search visibility, and customer actions
- **Team Collaboration** - Invite team members, assign roles, and manage permissions
- **Billing Management** - Subscription management, invoicing, and payment processing with Stripe

### Enterprise Features
- **Multi-Tenant Architecture** - Complete tenant isolation and data security
- **Role-Based Access Control** - Fine-grained permissions management
- **Audit Logging** - Complete audit trail of all system actions
- **OAuth 2.0 Integration** - Secure Google authentication with token refresh
- **API Access** - RESTful API with rate limiting and authentication
- **Health Monitoring** - Real-time health checks and performance monitoring
- **Horizontal Scaling** - Kubernetes-ready for production deployments

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- Git

## 🏗️ Tech Stack

### Frontend
- Next.js 15 with React 19
- TypeScript with strict mode
- Tailwind CSS for styling
- React Query for data fetching
- Zustand for state management
- Zod for validation
- React Hook Form for forms

### Backend
- NestJS with TypeScript
- Prisma ORM for database
- PostgreSQL for data persistence
- Redis for caching and jobs
- BullMQ for background jobs
- JWT authentication
- Google OAuth 2.0

### Infrastructure
- Docker for containerization
- Kubernetes for orchestration
- Nginx as reverse proxy
- GitHub Actions for CI/CD
- Sentry for error tracking
- OpenTelemetry for monitoring

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd gbp
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start services with Docker**
```bash
docker-compose up -d
```

4. **Initialize database**
```bash
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

5. **Access the application**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

### Available Commands

```bash
# Development
npm run dev              # Start all services
docker-compose up -d    # Start Docker services
docker-compose down     # Stop Docker services

# Database
npm run migrate         # Run migrations
npm run seed           # Seed initial data
npm run migrate:reset  # Reset database

# Testing
npm test               # Run tests
npm run test:cov      # Run tests with coverage
npm run test:watch    # Watch mode

# Linting
npm run lint          # Lint code
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier

# Build
npm run build         # Build for production
npm start             # Start production server
```

## 📚 Documentation

- [API Documentation](./docs/API.md) - RESTful API endpoints and schemas
- [Architecture](./docs/ARCHITECTURE.md) - System design and architecture decisions
- [Database Schema](./docs/DATABASE.md) - Database structure and relationships
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Security Guide](./docs/SECURITY.md) - Security implementation details
- [Contributing Guide](./docs/CONTRIBUTING.md) - Contribution guidelines

## 🔒 Security

This platform implements comprehensive security measures:

- **Authentication**: JWT with access/refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encrypted sensitive data at rest
- **Network Security**: CORS, CSRF, XSS protection
- **API Security**: Rate limiting, request validation
- **Infrastructure**: Helmet.js, security headers
- **Audit Logging**: Complete action audit trail
- **Password Security**: Argon2 hashing with salt

See [Security Guide](./docs/SECURITY.md) for detailed information.

## 🗄️ Database Schema

The platform uses PostgreSQL with Prisma ORM. Key entities:

- **Users** - User accounts with authentication
- **Organizations** - Tenant organizations
- **Workspaces** - Logical groupings within organizations
- **Teams** - Collaborative teams
- **Locations** - Google Business Profile locations
- **Reviews** - Customer reviews
- **Posts** - Business posts and updates
- **Photos** - Business photos
- **Analytics** - Performance metrics
- **Subscriptions** - Billing and subscription management

## 🔗 API Examples

### Authentication
```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword123"
}

# Refresh Token
POST /api/auth/refresh
{
  "refreshToken": "..."
}
```

### Organizations
```bash
# Create organization
POST /api/organizations
{
  "name": "My Business",
  "slug": "my-business",
  "timezone": "America/New_York"
}

# List organizations
GET /api/organizations

# Get organization
GET /api/organizations/:id
```

## 🐳 Docker Deployment

```bash
# Build images
docker-compose build

# Run services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☸️ Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/secrets.yaml
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/frontend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Check deployment status
kubectl get pods -n gbp
kubectl get services -n gbp
kubectl get ingress -n gbp
```

## 📊 Monitoring

The platform includes health checks and monitoring:

```bash
# Health check
GET /api/health

# Response
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "database": "connected"
}
```

## 🧪 Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode
npm run test:watch

# E2E tests
npm run e2e
```

## 📈 Performance

Optimizations included:

- Query result caching with Redis
- Database connection pooling
- Gzip compression
- CDN-ready static assets
- Horizontal pod autoscaling
- Request rate limiting
- Database indexing on frequently queried fields

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please:
1. Check the [documentation](./docs)
2. Review [existing issues](https://github.com/gbp/platform/issues)
3. Create a new issue with detailed information

## 🗺️ Roadmap

- [ ] Advanced AI-powered review sentiment analysis
- [ ] Bulk review operations
- [ ] Social media integration
- [ ] Custom reporting engine
- [ ] White-label support
- [ ] Mobile application
- [ ] Advanced webhook system
- [ ] Multi-language support

## 📞 Contact

- Email: support@example.com
- Website: https://example.com
- Twitter: @gbp_platform
