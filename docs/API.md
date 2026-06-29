# API Documentation

## Base URL

```
Development: http://localhost:3000
Production: https://api.example.com
```

## Authentication

All API endpoints (except auth) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Response Format

All API responses follow this format:

### Success Response (200, 201)
```json
{
  "id": "unique-id",
  "data": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response (4xx, 5xx)
```json
{
  "statusCode": 400,
  "message": "Error message",
  "timestamp": "2024-01-01T00:00:00Z",
  "path": "/api/endpoint"
}
```

## Auth Endpoints

### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}

Response: 201
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: 200
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

### Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>

Response: 200
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Users Endpoints

### Get User
```
GET /api/users/:id
Authorization: Bearer <access_token>

Response: 200
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://...",
  "phone": "+1234567890",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Users
```
GET /api/users?skip=0&take=10
Authorization: Bearer <access_token>

Response: 200
[
  { ... },
  { ... }
]
```

### Update User
```
PUT /api/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321"
}

Response: 200
{ ... }
```

## Organizations Endpoints

### Create Organization
```
POST /api/organizations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Business",
  "slug": "my-business",
  "description": "My business description",
  "timezone": "America/New_York",
  "locale": "en-US"
}

Response: 201
{
  "id": "org-id",
  "name": "My Business",
  "slug": "my-business",
  "description": "My business description",
  "timezone": "America/New_York",
  "locale": "en-US",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Organizations
```
GET /api/organizations?skip=0&take=10
Authorization: Bearer <access_token>

Response: 200
[
  { ... },
  { ... }
]
```

### Get Organization
```
GET /api/organizations/:id
Authorization: Bearer <access_token>

Response: 200
{ ... }
```

### Update Organization
```
PUT /api/organizations/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}

Response: 200
{ ... }
```

## Pagination

All list endpoints support pagination:

```
GET /api/endpoint?skip=0&take=10&sort=name&order=asc

Query Parameters:
- skip: number (default: 0)
- take: number (default: 10, max: 100)
- sort: string (field to sort by)
- order: 'asc' | 'desc' (default: 'desc')
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limiting

Rate limits are applied per API key:

- **Default**: 100 requests per 15 minutes
- **Premium**: 1000 requests per 15 minutes
- **Enterprise**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640000000
```

## Webhooks

Webhooks are sent to your configured URL for events:

### Webhook Events
- `review.created`
- `review.updated`
- `post.published`
- `photo.uploaded`
- `subscription.activated`
- `subscription.canceled`
- `payment.failed`

### Webhook Payload
```json
{
  "id": "webhook-id",
  "event": "review.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": { ... }
}
```

### Webhook Retry Policy
- Initial attempt: Immediate
- Retry 1: 5 minutes
- Retry 2: 30 minutes
- Retry 3: 2 hours
- Retry 4: 5 hours
- Max retries: 5

## Versioning

API versioning is done through URL path:

```
/api/v1/endpoint
/api/v2/endpoint
```

Current version: `v1`

## SDK

Official SDKs available:
- JavaScript/TypeScript: `npm install @gbp/sdk`
- Python: `pip install gbp-sdk`
- Go: `go get github.com/gbp/sdk-go`
