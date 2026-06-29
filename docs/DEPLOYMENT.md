# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [AWS Deployment](#aws-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Database Migration](#database-migration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker & Docker Compose
- Kubernetes 1.24+ (for K8s deployment)
- kubectl 1.24+
- AWS CLI (for AWS deployment)
- PostgreSQL client tools
- Node.js 20+

## Local Development

### Setup

```bash
# Clone repository
git clone <repo-url>
cd gbp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with local development values

# Start services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# Access application
# Frontend: http://localhost:3001
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

### Development Workflow

```bash
# Backend development
cd backend
npm run start:dev

# Frontend development
cd frontend
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## Docker Deployment

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

### Production Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Docker

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres-host:5432/gbp
REDIS_URL=redis://redis-host:6379
JWT_SECRET=<generate-strong-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
STRIPE_SECRET_KEY=<from-stripe-dashboard>
```

## Kubernetes Deployment

### Prerequisites

```bash
# Ensure kubectl is configured
kubectl config current-context

# Create namespace
kubectl create namespace gbp

# Or apply namespace manifest
kubectl apply -f infrastructure/kubernetes/namespace.yaml
```

### Deploy Secrets

```bash
# Create base64 encoded secrets
echo -n "jwt-secret-value" | base64
echo -n "database-url" | base64

# Update secrets.yaml with base64 values
vim infrastructure/kubernetes/secrets.yaml

# Apply secrets
kubectl apply -f infrastructure/kubernetes/secrets.yaml
```

### Deploy ConfigMap

```bash
kubectl apply -f infrastructure/kubernetes/configmap.yaml
```

### Deploy Backend

```bash
# Apply backend deployment and service
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/backend-service.yaml

# Monitor rollout
kubectl rollout status deployment/gbp-backend -n gbp
```

### Deploy Frontend

```bash
# Apply frontend deployment and service
kubectl apply -f infrastructure/kubernetes/frontend-deployment.yaml
kubectl apply -f infrastructure/kubernetes/frontend-service.yaml

# Monitor rollout
kubectl rollout status deployment/gbp-frontend -n gbp
```

### Deploy Ingress

```bash
# Install Nginx Ingress Controller (if not installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Apply ingress
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Monitor ingress
kubectl get ingress -n gbp
```

### Deploy Auto-Scaling

```bash
# Apply HPA
kubectl apply -f infrastructure/kubernetes/hpa.yaml

# Monitor HPA
kubectl get hpa -n gbp -w
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n gbp

# Check services
kubectl get svc -n gbp

# Check ingress
kubectl get ingress -n gbp

# Check events
kubectl describe pod <pod-name> -n gbp

# View logs
kubectl logs -f deployment/gbp-backend -n gbp
```

## AWS Deployment

### Using ECS

```bash
# Push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag gbp-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/gbp-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/gbp-backend:latest

# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create ECS service
aws ecs create-service --cluster gbp-cluster --service-name gbp-backend --task-definition gbp-backend --desired-count 3
```

### Using EKS

```bash
# Create EKS cluster
eksctl create cluster --name gbp-cluster --region us-east-1 --nodes 3 --node-type t3.medium

# Update kubeconfig
aws eks update-kubeconfig --name gbp-cluster --region us-east-1

# Deploy to EKS
kubectl apply -f infrastructure/kubernetes/
```

### RDS Setup

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier gbp-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --allocated-storage 20 \
  --storage-type gp3

# Get connection string
aws rds describe-db-instances --query 'DBInstances[0].Endpoint'
```

### ElastiCache Setup

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id gbp-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

## Environment Configuration

### Development Environment

```env
NODE_ENV=development
DEBUG=gbp:*
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gbp_dev
REDIS_URL=redis://localhost:6379
```

### Staging Environment

```env
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@staging-db.rds.amazonaws.com:5432/gbp
REDIS_URL=redis://staging-redis.ng.0001.use1.cache.amazonaws.com:6379
SENTRY_DSN=<staging-sentry-dsn>
```

### Production Environment

```env
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://user:pass@prod-db.rds.amazonaws.com:5432/gbp
REDIS_URL=redis://prod-redis.ng.0001.use1.cache.amazonaws.com:6379
SENTRY_DSN=<prod-sentry-dsn>
SECURE_COOKIES=true
SAME_SITE_COOKIES=strict
```

## Database Migration

### Local Migration

```bash
# Create migration
npm run migrate:create -- --name add_new_table

# Run migrations
npm run migrate:deploy

# Reset database (development only)
npm run migrate:reset
```

### Production Migration

```bash
# Backup database
pg_dump -h prod-db.rds.amazonaws.com -U admin gbp > backup.sql

# Run migrations
kubectl exec -it deployment/gbp-backend -n gbp -- npm run migrate:deploy

# Verify migration
kubectl exec -it deployment/gbp-backend -n gbp -- npm run migrate:status
```

## Monitoring & Logging

### CloudWatch Logs

```bash
# View logs
aws logs tail /gbp/backend --follow

# View logs with filter
aws logs filter-log-events --log-group-name /gbp/backend --filter-pattern "ERROR"
```

### Kubernetes Logging

```bash
# View pod logs
kubectl logs -f pod/gbp-backend-xxx -n gbp

# View deployment logs
kubectl logs -f deployment/gbp-backend -n gbp

# View logs from last hour
kubectl logs --since=1h deployment/gbp-backend -n gbp
```

### Sentry Monitoring

```bash
# Initialize Sentry
sentry-cli login

# Create release
sentry-cli releases create -p gbp-backend 1.0.0

# Upload source maps
sentry-cli releases files 1.0.0 upload-sourcemaps ./dist
```

## Backup & Recovery

### PostgreSQL Backup

```bash
# Full backup
pg_dump -h prod-db.rds.amazonaws.com -U admin gbp > gbp-backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h prod-db.rds.amazonaws.com -U admin gbp | gzip > gbp-backup-$(date +%Y%m%d).sql.gz

# Restore from backup
psql -h prod-db.rds.amazonaws.com -U admin gbp < gbp-backup.sql
```

### RDS Automated Backups

```bash
# Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier gbp-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"

# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier gbp-db \
  --db-snapshot-identifier gbp-backup-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier gbp-db-restored \
  --db-snapshot-identifier gbp-backup-20240101
```

## Troubleshooting

### Kubernetes Issues

```bash
# Pod not starting
kubectl describe pod <pod-name> -n gbp

# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pod -n gbp

# Get pod events
kubectl get events -n gbp --sort-by='.lastTimestamp'
```

### Database Issues

```bash
# Connect to database
psql -h db-host -U admin -d gbp

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

# Restart connection pool
kubectl exec -it deployment/gbp-backend -n gbp -- npm run db:reset-pool
```

### Application Issues

```bash
# View application logs
kubectl logs -f deployment/gbp-backend -n gbp --tail=100

# Check health
kubectl exec -it pod/gbp-backend-xxx -n gbp -- curl http://localhost:3000/api/health

# Check environment variables
kubectl exec pod/gbp-backend-xxx -n gbp -- env | grep GBP

# Restart pods
kubectl rollout restart deployment/gbp-backend -n gbp
```

### Performance Issues

```bash
# Monitor node CPU/memory
kubectl top nodes

# Monitor pod resources
kubectl top pod -n gbp

# Check HPA status
kubectl get hpa -n gbp -o wide

# Check pod limits
kubectl describe node node-name
```
