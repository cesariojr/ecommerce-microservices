# Documentação da Arquitetura - E-commerce Microservices

## Visão Geral do Sistema

Este documento fornece documentação detalhada da arquitetura do sistema de microserviços e-commerce habilitado com OAuth 2.0, cobrindo padrões de segurança, interações entre serviços e detalhes de implementação técnica.

## Padrões de Arquitetura

### 1. Arquitetura de Microserviços
```
┌─────────────────────────────────────────────────────────────────┐
│                        Camada Cliente                           │
├─────────────────────────────────────────────────────────────────┤
│  Navegador Web │  App Mobile  │  API Externa  │  Painel Admin  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Camada API Gateway                         │
├─────────────────────────────────────────────────────────────────┤
│              Frontend Service (Porta 3000)                     │
│              • Gerenciamento de Rotas                          │
│              • Manipulação de Sessões                          │
│              • Renderização de UI                              │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Camada de Serviços de Negócio               │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service (3001)    │    Product Service (3002)           │
│  • Servidor OAuth 2.0   │    • Gestão de Produtos             │
│  • Gestão JWT Tokens    │    • Processamento Pedidos          │
│  • Autenticação Users   │    • Shopping Cart                  │
│  • Autorização RBAC     │    • Relatórios de Vendas           │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Camada de Dados                           │
├─────────────────────────────────────────────────────────────────┤
│     auth.db             │         products.db                 │
│     • users             │         • products                  │
│     • oauth_clients     │         • orders                    │
│     • auth_codes        │         • order_items               │
│     • refresh_tokens    │         • cart_items                │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Arquitetura de Segurança

#### Padrão OAuth 2.0 Authorization Server
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente   │    │ Authorization   │    │  Resource       │
│ (Frontend)  │    │ Server          │    │  Server         │
│             │    │ (Auth Service)  │    │ (Product Serv.) │
└─────────────┘    └─────────────────┘    └─────────────────┘
       │                     │                     │
       │ 1. Authorization    │                     │
       │    Request          │                     │
       │────────────────────▶│                     │
       │                     │                     │
       │ 2. Authorization    │                     │
       │    Grant            │                     │
       │◄────────────────────│                     │
       │                     │                     │
       │ 3. Access Token     │                     │
       │    Request          │                     │
       │────────────────────▶│                     │
       │                     │                     │
       │ 4. Access Token     │                     │
       │◄────────────────────│                     │
       │                                           │
       │ 5. Protected Resource Request             │
       │──────────────────────────────────────────▶│
       │                                           │
       │ 6. Protected Resource                     │
       │◄──────────────────────────────────────────│
```

#### Fluxo de Autenticação JWT
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend   │    │  Auth Service   │    │ Product Service │
│  Service    │    │                 │    │                 │
└─────────────┘    └─────────────────┘    └─────────────────┘
       │                     │                     │
       │ 1. Login Request    │                     │
       │────────────────────▶│                     │
       │                     │                     │
       │ 2. JWT Token        │                     │
       │◄────────────────────│                     │
       │                     │                     │
       │ 3. API Request      │                     │
       │    + JWT Token      │                     │
       │──────────────────────────────────────────▶│
       │                     │                     │
       │                     │ 4. Token Validation │
       │                     │◄────────────────────│
       │                     │                     │
       │                     │ 5. User Info        │
       │                     │────────────────────▶│
       │                     │                     │
       │ 6. API Response     │                     │
       │◄──────────────────────────────────────────│
```

## 🔐 Implementação de Segurança

### 1. Autenticação Multi-Camadas

#### Camada 1: Frontend Authentication
- **Session Cookies**: Armazenamento seguro de tokens
- **CSRF Protection**: Proteção contra ataques cross-site
- **Secure Headers**: Helmet.js para headers de segurança

#### Camada 2: Service Authentication
- **JWT Tokens**: Tokens assinados para comunicação
- **Token Validation**: Verificação de assinatura e expiração
- **Service-to-Service**: Autenticação entre microserviços

#### Camada 3: Database Security
- **Prepared Statements**: Proteção contra SQL injection
- **Password Hashing**: bcrypt para senhas
- **Connection Pooling**: Gestão segura de conexões

### 2. Autorização RBAC

#### Definição de Roles
```javascript
const ROLES = {
  ADMIN: {
    name: 'admin',
    scopes: ['read', 'write', 'admin', 'reports'],
    permissions: [
      'products:create',
      'products:read', 
      'products:update',
      'products:delete',
      'orders:read_all',
      'reports:read'
    ]
  },
  VIEWER: {
    name: 'viewer',
    scopes: ['read', 'reports'],
    permissions: [
      'products:read',
      'reports:read'
    ]
  },
  CUSTOMER: {
    name: 'customer', 
    scopes: ['read', 'purchase'],
    permissions: [
      'products:read',
      'orders:read_own',
      'cart:manage'
    ]
  }
};
```

#### Middleware de Autorização
```javascript
// Verificação de Token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  // Validar token via Auth Service
  validateTokenWithAuthService(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Token inválido' });
    });
};

// Verificação de Role
const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }
    next();
  };
};

// Verificação de Scopes
const authorizeScopes = (requiredScopes) => {
  return (req, res, next) => {
    const hasScope = requiredScopes.some(scope => 
      req.user.scopes.includes(scope)
    );
    
    if (!hasScope) {
      return res.status(403).json({ error: 'Scope insuficiente' });
    }
    next();
  };
};
```

## 🏗️ Detalhes dos Serviços

### Auth Service (Porta 3001)

#### Responsabilidades
- **Autenticação de usuários**: Login/logout
- **Geração de tokens JWT**: Access e refresh tokens
- **Validação de tokens**: Para outros serviços
- **Gerenciamento de usuários**: CRUD de usuários
- **Autorização OAuth 2.0**: Fluxos completos

#### Tecnologias
- **Express.js**: Framework web
- **bcrypt**: Hash de senhas
- **jsonwebtoken**: Geração/validação JWT
- **SQLite**: Banco de dados
- **helmet**: Segurança HTTP

#### Endpoints Principais
```
POST /auth/login          - Autenticar usuário
POST /auth/validate       - Validar token JWT
GET  /auth/profile        - Perfil do usuário
POST /oauth/token         - Token OAuth endpoint
GET  /oauth/authorize     - Authorization endpoint
GET  /health              - Health check
```

### Product Service (Porta 3002)

#### Responsabilidades
- **Gestão de produtos**: CRUD completo
- **Processamento de pedidos**: Carrinho e checkout
- **Relatórios de vendas**: Analytics básicos
- **Controle de estoque**: Gestão de inventário

#### Tecnologias
- **Express.js**: Framework web
- **SQLite**: Banco de dados
- **axios**: Cliente HTTP para auth service
- **express-rate-limit**: Rate limiting
- **cors**: Cross-origin requests

#### Endpoints Principais
```
GET    /products          - Listar produtos (público)
POST   /products          - Criar produto (admin)
PUT    /products/:id      - Atualizar produto (admin)
DELETE /products/:id      - Deletar produto (admin)
GET    /orders            - Listar pedidos (auth)
POST   /orders/checkout   - Finalizar compra (customer)
GET    /orders/cart       - Ver carrinho (customer)
POST   /orders/cart/add   - Adicionar ao carrinho (customer)
GET    /reports/sales     - Relatórios (viewer/admin)
GET    /health            - Health check
```

### Frontend Service (Porta 3000)

#### Responsabilidades
- **Interface do usuário**: Templates EJS
- **Gerenciamento de sessões**: Cookies HTTP
- **Proxy de APIs**: Comunicação com backend
- **Controle de acesso UI**: Baseado em roles

#### Tecnologias
- **Express.js**: Framework web
- **EJS**: Template engine
- **axios**: Cliente HTTP
- **cookie-parser**: Manipulação de cookies
- **Bootstrap 5**: Framework CSS

#### Rotas Principais
```
GET  /                    - Redireciona para login
GET  /products            - Catálogo de produtos
GET  /login               - Página de login
POST /login               - Processar login
GET  /dashboard           - Dashboard por role
GET  /cart                - Carrinho de compras
GET  /admin/products      - Gestão produtos (admin)
GET  /architecture        - Esta documentação
```

## 🗄️ Modelo de Dados

### Auth Service Database (auth.db)

#### Tabela: users
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,           -- bcrypt hash
    role TEXT NOT NULL DEFAULT 'customer',
    scopes TEXT DEFAULT 'read',       -- JSON array como string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Dados Iniciais
```sql
INSERT INTO users (email, password, role, scopes) VALUES 
('admin@ecommerce.com', '$2b$10$...', 'admin', '["read","write","admin","reports"]'),
('viewer@ecommerce.com', '$2b$10$...', 'viewer', '["read","reports"]'),
('customer@ecommerce.com', '$2b$10$...', 'customer', '["read","purchase"]');
```

### Product Service Database (products.db)

#### Tabela: products
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: orders
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'cart',       -- cart, pending, completed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela: order_items
```sql
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

#### Tabela: cart_items (implementada via orders com status='cart')
```sql
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## 🔒 Fluxos de Segurança

### 1. Fluxo de Login (JWT)
```
1. Usuário → Frontend: Credenciais (email/password)
2. Frontend → Auth Service: POST /auth/login
3. Auth Service → Database: Verificar credenciais
4. Auth Service → Auth Service: Gerar JWT token
5. Auth Service → Frontend: JWT token
6. Frontend → Usuário: Set cookie + redirect
```

### 2. Fluxo de Autorização (RBAC)
```
1. Frontend → Product Service: API request + JWT
2. Product Service → Auth Service: Validar token
3. Auth Service → Product Service: User info + roles
4. Product Service → Product Service: Verificar permissões
5. Product Service → Database: Executar operação (se autorizado)
6. Product Service → Frontend: Resposta da API
```

### 3. Fluxo OAuth 2.0 Authorization Code
```
1. Cliente → Auth Service: GET /oauth/authorize
2. Auth Service → Cliente: Redirect para login
3. Cliente → Auth Service: Credenciais
4. Auth Service → Cliente: Authorization code
5. Cliente → Auth Service: POST /oauth/token + code
6. Auth Service → Cliente: Access token + refresh token
```

## 🛡️ Implementação de Segurança

### 1. Validação de Tokens JWT

#### Estrutura do Token
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 1,
    "email": "admin@ecommerce.com",
    "role": "admin",
    "scopes": ["read", "write", "admin", "reports"],
    "iss": "ecommerce-auth-service",
    "aud": "ecommerce-api",
    "iat": 1640995200,
    "exp": 1640999200
  },
  "signature": "HMACSHA256(...)"
}
```

#### Processo de Validação
1. **Verificar assinatura**: HMAC SHA-256
2. **Verificar expiração**: Campo `exp`
3. **Verificar issuer**: Campo `iss`
4. **Verificar audience**: Campo `aud`
5. **Extrair claims**: user_id, role, scopes

### 2. Controle de Acesso RBAC

#### Matriz de Permissões
| Recurso | Operação | Admin | Viewer | Customer |
|---------|----------|-------|--------|----------|
| Products | GET | ✅ | ✅ | ✅ |
| Products | POST | ✅ | ❌ | ❌ |
| Products | PUT | ✅ | ❌ | ❌ |
| Products | DELETE | ✅ | ❌ | ❌ |
| Orders | GET (own) | ✅ | ❌ | ✅ |
| Orders | GET (all) | ✅ | ❌ | ❌ |
| Cart | GET/POST | ❌ | ❌ | ✅ |
| Reports | GET | ✅ | ✅ | ❌ |

#### Implementação de Middleware
```javascript
// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    // Validar token com Auth Service
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, {
      token: token
    });

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Falha na validação do token' });
  }
};

// Middleware de autorização por role
const authorizeRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        required_role: requiredRole,
        user_role: req.user.role
      });
    }
    next();
  };
};

// Middleware de autorização por scopes
const authorizeScopes = (requiredScopes) => {
  return (req, res, next) => {
    const userScopes = req.user.scopes || [];
    const hasRequiredScope = requiredScopes.some(scope => 
      userScopes.includes(scope)
    );

    if (!hasRequiredScope) {
      return res.status(403).json({ 
        error: 'Scope insuficiente',
        required_scopes: requiredScopes,
        user_scopes: userScopes
      });
    }
    next();
  };
};
```

## 🔄 Comunicação entre Serviços

### 1. Service Discovery
- **Configuração estática**: URLs via environment variables
- **Health checks**: Endpoints `/health` em todos os serviços
- **Retry logic**: Tentativas automáticas em caso de falha

### 2. Autenticação Service-to-Service
```javascript
// Product Service validando token com Auth Service
const validateToken = async (token) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate`, {
      token: token
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    throw new Error('Token validation failed');
  }
};
```

### 3. Error Handling
```javascript
// Padronização de respostas de erro
const errorResponse = (res, status, error, message) => {
  res.status(status).json({
    error: error,
    message: message,
    timestamp: new Date().toISOString(),
    service: 'product-service'
  });
};
```

## 📊 Monitoramento e Observabilidade

### 1. Health Checks
Cada serviço implementa endpoint `/health`:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00Z",
  "dependencies": {
    "database": "healthy"
  }
}
```

### 2. Logging
- **Structured logging**: JSON format
- **Request tracking**: Correlation IDs
- **Error logging**: Stack traces em desenvolvimento
- **Security events**: Login attempts, token validation

### 3. Métricas
- **Response times**: Latência de APIs
- **Error rates**: Taxa de erros por endpoint
- **Authentication events**: Logins, token validation
- **Authorization failures**: Tentativas de acesso negado

## 🧪 Estratégia de Testes

### 1. Testes Unitários
- **Auth middleware**: Validação de tokens
- **RBAC logic**: Verificação de permissões
- **Database operations**: CRUD operations
- **JWT utilities**: Token generation/validation

### 2. Testes de Integração
- **Service communication**: Auth ↔ Product
- **Database integration**: SQLite operations
- **API endpoints**: Request/response validation
- **Error scenarios**: Failure handling

### 3. Testes de Segurança
- **Token validation**: Invalid/expired tokens
- **Role enforcement**: Unauthorized access attempts
- **Input validation**: SQL injection, XSS
- **Rate limiting**: Abuse prevention

## 📚 Padrões Implementados

### 1. Security Patterns
- **Token-based authentication**: JWT tokens
- **Role-based authorization**: RBAC
- **Secure communication**: HTTPS em produção
- **Input validation**: Sanitização de dados
- **Error handling**: Respostas padronizadas

### 2. Microservices Patterns
- **Service isolation**: Bancos independentes
- **API Gateway**: Frontend como proxy
- **Circuit breaker**: Fallback em falhas
- **Health checks**: Monitoramento de serviços
- **Configuration management**: Environment variables

### 3. Data Patterns
- **Database per service**: Isolamento de dados

---

## 📖 Referências Técnicas

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
