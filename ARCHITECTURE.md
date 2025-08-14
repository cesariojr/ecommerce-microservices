# E-commerce Microservices Architecture Documentation

## System Overview

This document provides detailed architecture documentation for the OAuth 2.0 enabled e-commerce microservices system, covering security patterns, service interactions, and technical implementation details.

## Architecture Patterns

### 1. Microservices Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  External API  │  Admin Panel   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                          │
├─────────────────────────────────────────────────────────────────┤
│              Frontend Service (Port 3000)                      │
│              • Route Management                                │
│              • Session Handling                                │
│              • UI Rendering                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Business Services Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service (3001)    │    Product Service (3002)           │
│  • OAuth 2.0 Server     │    • Product Management             │
│  • JWT Token Mgmt       │    • Order Processing               │
│  • User Authentication  │    • Shopping Cart                  │
│  • RBAC Authorization   │    • Sales Reporting                │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│     auth.db             │         products.db                 │
│     • users             │         • products                  │
│     • oauth_clients     │         • orders                    │
│     • auth_codes        │         • order_items               │
│     • refresh_tokens    │         • cart_items                │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Security Architecture

#### OAuth 2.0 Authorization Server Pattern
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │ Authorization   │    │ Resource Server │
│                 │    │    Server       │    │                 │
│ 1. Auth Request │───▶│                 │    │                 │
│                 │    │ 2. User Login   │    │                 │
│                 │◄───│ 3. Auth Code    │    │                 │
│                 │    │                 │    │                 │
│ 4. Token Req    │───▶│                 │    │                 │
│                 │◄───│ 5. Access Token │    │                 │
│                 │    │                 │    │                 │
│ 6. API Request  │─────────────────────────▶│                 │
│                 │◄─────────────────────────│ 7. Protected    │
│                 │                          │    Resource     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### JWT Token Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Service│    │  Auth Service   │    │Product Service  │
│                 │    │                 │    │                 │
│ 1. Login        │───▶│                 │    │                 │
│                 │◄───│ 2. JWT Token    │    │                 │
│                 │    │                 │    │                 │
│ 3. API Call     │─────────────────────────▶│                 │
│    + JWT        │    │                 │    │ 4. Validate     │
│                 │    │                 │◄───│    Token        │
│                 │    │ 5. User Info    │───▶│                 │
│                 │◄─────────────────────────│ 6. Response     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Service Specifications

### Auth Service (Port 3001)

#### Core Responsibilities
- OAuth 2.0 Authorization Server
- JWT Token Management (Issue, Validate, Refresh)
- User Authentication & Session Management
- RBAC Policy Enforcement

#### API Endpoints
```
Authentication Endpoints:
POST   /auth/login           - User authentication
POST   /auth/validate        - JWT token validation
GET    /auth/profile         - User profile retrieval
POST   /auth/logout          - Session termination

OAuth 2.0 Endpoints:
GET    /oauth/authorize      - Authorization endpoint
POST   /oauth/token          - Token endpoint
POST   /oauth/revoke         - Token revocation

Administrative Endpoints:
GET    /admin/users          - User management (admin only)
POST   /admin/users          - Create user (admin only)
```

#### Database Schema (auth.db)
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth clients
CREATE TABLE oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_secret TEXT NOT NULL,
    redirect_uris TEXT NOT NULL,
    grant_types TEXT NOT NULL,
    scope TEXT NOT NULL
);

-- Authorization codes (temporary)
CREATE TABLE auth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    scope TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    scope TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Product Service (Port 3002)

#### Core Responsibilities
- Product Catalog Management
- Order Processing & Management
- Shopping Cart Operations
- Sales Reporting & Analytics

#### API Endpoints
```
Product Management:
GET    /products             - List products (public)
POST   /products             - Create product (admin)
PUT    /products/:id         - Update product (admin)
DELETE /products/:id         - Delete product (admin)
GET    /products/:id         - Get product details (public)

Order Management:
GET    /orders               - List user orders (authenticated)
POST   /orders/checkout      - Process checkout (customer)
GET    /orders/:id           - Get order details (owner/admin)

Shopping Cart:
GET    /orders/cart          - Get cart contents (customer)
POST   /orders/cart/add      - Add item to cart (customer)
PUT    /orders/cart/:id      - Update cart item (customer)
DELETE /orders/cart/:id      - Remove cart item (customer)

Reporting:
GET    /reports/sales        - Sales reports (viewer/admin)
GET    /reports/inventory    - Inventory reports (admin)
```

#### Database Schema (products.db)
```sql
-- Products table
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Shopping cart
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Frontend Service (Port 3000)

#### Core Responsibilities
- User Interface Rendering (EJS Templates)
- Session Management via Cookies
- API Gateway for Client Requests
- Role-based UI Components

#### Route Structure
```
Public Routes:
GET    /                     - Product catalog
GET    /login                - Login page
POST   /login                - Process login
GET    /logout               - Logout

Authenticated Routes:
GET    /dashboard            - Role-based dashboard
GET    /profile              - User profile
GET    /cart                 - Shopping cart
POST   /cart/add/:id         - Add to cart
POST   /checkout             - Process checkout

Admin Routes:
GET    /admin/products       - Product management
POST   /admin/products       - Create product
PUT    /admin/products/:id   - Update product
DELETE /admin/products/:id   - Delete product

Viewer Routes:
GET    /reports              - Sales reports
```

## Security Implementation

### JWT Token Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "auth-service-key-1"
  },
  "payload": {
    "iss": "ecommerce-auth-service",
    "aud": "ecommerce-api",
    "sub": "user-123",
    "user_id": 1,
    "email": "admin@ecommerce.com",
    "role": "admin",
    "scopes": ["read", "write", "admin"],
    "iat": 1640995200,
    "exp": 1640996100,
    "jti": "token-unique-id"
  }
}
```

### RBAC Permission Matrix
```
┌─────────────────┬───────┬────────┬──────────┐
│ Resource/Action │ Admin │ Viewer │ Customer │
├─────────────────┼───────┼────────┼──────────┤
│ Products Read   │   ✅   │   ✅    │    ✅     │
│ Products Write  │   ✅   │   ❌    │    ❌     │
│ Products Delete │   ✅   │   ❌    │    ❌     │
│ Orders Read Own │   ✅   │   ❌    │    ✅     │
│ Orders Read All │   ✅   │   ❌    │    ❌     │
│ Orders Create   │   ✅   │   ❌    │    ✅     │
│ Cart Management │   ❌   │   ❌    │    ✅     │
│ Sales Reports   │   ✅   │   ✅    │    ❌     │
│ User Management │   ✅   │   ❌    │    ❌     │
└─────────────────┴───────┴────────┴──────────┘
```

### Security Middleware Stack
```javascript
// Auth Service Security Stack
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));          // CORS policy
app.use(rateLimit(rateLimitConfig)); // Rate limiting
app.use(express.json({ limit: '1mb' })); // Body parsing
app.use(validateInput);              // Input validation
app.use(authenticateToken);          // JWT validation
app.use(authorizeRole);              // RBAC enforcement
```

## Inter-Service Communication

### Service Discovery
```javascript
// Static service registry (development)
const services = {
  auth: 'http://localhost:3001',
  product: 'http://localhost:3002',
  frontend: 'http://localhost:3000'
};

// Health check endpoints
GET /health - Service health status
GET /metrics - Service metrics (Prometheus format)
```

### Authentication Flow Between Services
```
1. Frontend receives user request
2. Frontend checks session cookie
3. If no session, redirect to /login
4. User authenticates with Auth Service
5. Auth Service issues JWT token
6. Frontend stores token in secure cookie
7. Frontend makes API call to Product Service with JWT
8. Product Service validates JWT with Auth Service
9. Auth Service returns user info and permissions
10. Product Service processes request based on permissions
11. Response returned to Frontend
12. Frontend renders appropriate UI based on user role
```

## Data Flow Diagrams

### User Authentication Flow
```
User ──┐
       │ 1. Login Request
       ▼
Frontend Service ──┐
                   │ 2. Validate Credentials
                   ▼
              Auth Service ──┐
                             │ 3. Check Database
                             ▼
                        SQLite (auth.db)
                             │
                             │ 4. User Found
                             ▼
              Auth Service ──┐
                             │ 5. Generate JWT
                             ▼
Frontend Service ──┐
                   │ 6. Set Cookie
                   ▼
                 User
```

### Product Purchase Flow
```
User ──┐
       │ 1. Add to Cart
       ▼
Frontend Service ──┐
                   │ 2. API Call + JWT
                   ▼
Product Service ──┐
                  │ 3. Validate Token
                  ▼
             Auth Service
                  │
                  │ 4. User Info
                  ▼
Product Service ──┐
                  │ 5. Update Cart
                  ▼
            SQLite (products.db)
                  │
                  │ 6. Success
                  ▼
Frontend Service ──┐
                   │ 7. Update UI
                   ▼
                 User
```

## Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────────────────────┐
│                    Local Development                            │
├─────────────────────────────────────────────────────────────────┤
│  Process 1: Auth Service (3001)                                │
│  Process 2: Product Service (3002)                             │
│  Process 3: Frontend Service (3000)                            │
│  Database: SQLite files (auth.db, products.db)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Production Architecture (Recommended)
```
┌─────────────────────────────────────────────────────────────────┐
│                      Load Balancer                             │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Service (Multiple Instances)                         │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service (Multiple Instances)                             │
│  Product Service (Multiple Instances)                          │
├─────────────────────────────────────────────────────────────────┤
│  Database Cluster (PostgreSQL/MySQL)                           │
│  Redis Cache (Session Storage)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Caching Strategy
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Application     │    │ Redis Cache     │    │ Database        │
│                 │    │                 │    │                 │
│ 1. Check Cache  │───▶│ 2. Cache Hit?   │    │                 │
│                 │◄───│                 │    │                 │
│                 │    │                 │    │                 │
│ 3. Query DB     │─────────────────────────▶│ 4. Data         │
│                 │◄─────────────────────────│                 │
│                 │    │                 │    │                 │
│ 5. Store Cache  │───▶│ 6. Cache Set    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Cache Keys:
- user:profile:{user_id}
- products:list:{category}
- orders:user:{user_id}
- reports:sales:{date_range}
```

### Rate Limiting Configuration
```javascript
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
};
```

## Monitoring and Observability

### Health Check Endpoints
```
GET /health
Response: {
  "status": "healthy",
  "timestamp": "2024-08-11T00:00:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy",
    "auth_service": "healthy"
  }
}
```

### Logging Strategy
```javascript
// Structured logging format
{
  "timestamp": "2024-08-11T00:00:00Z",
  "level": "INFO",
  "service": "auth-service",
  "trace_id": "abc123",
  "user_id": "user-123",
  "action": "login_attempt",
  "result": "success",
  "duration_ms": 150
}
```

## Security Best Practices Implemented

### Token Security
- RS256 algorithm for JWT signing
- Short-lived access tokens (15 minutes)
- Refresh token rotation
- Secure cookie storage with HttpOnly flag

### API Security
- Input validation and sanitization
- Rate limiting per IP address
- CORS policy enforcement
- Security headers via Helmet.js

### Database Security
- Parameterized queries (SQL injection prevention)
- Password hashing with bcrypt
- Database connection encryption
- Principle of least privilege

## Future Enhancements

### Scalability Improvements
- Service mesh implementation (Istio)
- Container orchestration (Kubernetes)
- Database sharding strategy
- Event-driven architecture with message queues

### Security Enhancements
- OAuth 2.1 compliance
- PKCE for all flows
- Certificate-based client authentication
- Advanced threat detection

### Monitoring Enhancements
- Distributed tracing (Jaeger)
- Metrics collection (Prometheus)
- Log aggregation (ELK Stack)
- Real-time alerting

---
