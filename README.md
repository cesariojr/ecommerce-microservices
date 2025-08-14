# E-commerce Microservices - OAuth 2.0 Demo

Demonstração prática de autenticação e autorização em microserviços usando OAuth 2.0, JWT tokens e controle de acesso baseado em roles (RBAC).

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Service│    │  Auth Service   │    │Product Service  │
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 3002)   │
│                 │    │                 │    │                 │
│ • EJS Templates │    │ • OAuth 2.0     │    │ • Product CRUD  │
│ • User Interface│◄──▶│ • JWT Tokens    │◄──▶│ • Order Mgmt    │
│ • Cookie Auth   │    │ • User Mgmt     │    │ • Shopping Cart │
│ • Role-based UI │    │ • RBAC          │    │ • Reports       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   SQLite DBs    │
                    │                 │
                    │ • auth.db       │
                    │ • products.db   │
                    └─────────────────┘
```

## 🔐 Tipos de Autenticação Implementados

### 1. OAuth 2.0 Grant Types
- **Authorization Code Flow**: Para usuários web
- **Client Credentials Flow**: Para comunicação service-to-service
- **Refresh Token Rotation**: Renovação segura de tokens

### 2. JWT (JSON Web Tokens)
- **Access Tokens**: Curta duração (15 min)
- **Refresh Tokens**: Longa duração (7 dias)
- **Claims customizadas**: user_id, role, scopes

### 3. Autorização RBAC
- **Admin**: CRUD completo, relatórios, gestão de usuários
- **Viewer**: Visualização e relatórios de vendas
- **Customer**: Navegação, compras, carrinho

## 🚀 Como Executar

### Pré-requisitos
- Node.js 16+ 
- npm 8+

### Instalação
```bash
# Clone ou baixe o projeto
cd ecommerce-microservices

# Instale dependências de todos os serviços
npm run install:all

# Inicie todos os serviços
npm start
```

### Acesso
- **Frontend**: http://localhost:3000
- **Auth API**: http://localhost:3001/health
- **Product API**: http://localhost:3002/health

## 👥 Usuários Demo

| Role | Email | Password | Permissões |
|------|-------|----------|------------|
| **Admin** | admin@ecommerce.com | admin123 | CRUD produtos, visualizar pedidos, relatórios |
| **Viewer** | viewer@ecommerce.com | viewer123 | Visualizar relatórios de vendas |
| **Customer** | customer@ecommerce.com | customer123 | Navegar produtos, fazer compras |

## 🔍 Funcionalidades Demonstradas

### Autenticação OAuth 2.0
- ✅ Login com JWT tokens
- ✅ Token validation entre serviços
- ✅ Refresh token rotation
- ✅ Session management via cookies

### Autorização RBAC
- ✅ Role-based access control
- ✅ Scope-based permissions
- ✅ Resource-level authorization
- ✅ Service-to-service auth

### Microserviços
- ✅ Service isolation
- ✅ Independent databases
- ✅ REST API communication
- ✅ Distributed authentication

## 📊 Endpoints da API

### Auth Service (3001)
```
POST /auth/login          - Login de usuário
POST /auth/validate       - Validar token JWT
GET  /auth/profile        - Perfil do usuário
POST /oauth/token         - OAuth token endpoint
GET  /oauth/authorize     - OAuth authorization endpoint
```

### Product Service (3002)
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
```

### Frontend Service (3000)
```
GET  /                    - Catálogo de produtos
GET  /login               - Página de login
POST /login               - Processar login
GET  /dashboard           - Dashboard por role
GET  /cart                - Carrinho de compras
POST /cart/add/:id        - Adicionar ao carrinho
POST /checkout            - Finalizar compra
GET  /admin/products      - Gestão de produtos (admin)
```

## 🛡️ Segurança Implementada

### Tokens JWT
- **Algoritmo**: RS256 (assinatura RSA)
- **Claims**: iss, aud, exp, user_id, role, scopes
- **Validação**: Signature + expiration + claims

### Middleware de Autorização
- **Token validation**: Via auth service
- **Scope checking**: Permissões granulares
- **Role verification**: Controle por papel
- **Resource ownership**: Acesso a recursos próprios

### Proteções
- **Rate limiting**: 100 req/15min por IP
- **CORS**: Configurado para origins específicos
- **Helmet**: Headers de segurança
- **Input validation**: Sanitização de dados

## 🗄️ Estrutura do Banco

### Auth Service (auth.db)
```sql
users              - Usuários do sistema
oauth_clients       - Clientes OAuth registrados
auth_codes         - Códigos de autorização temporários
refresh_tokens     - Tokens de renovação
```

### Product Service (products.db)
```sql
products           - Catálogo de produtos
orders             - Pedidos dos clientes
order_items        - Itens dos pedidos
cart_items         - Carrinho de compras
```

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# Auth Service
JWT_SECRET=your-super-secret-jwt-key
PORT=3001

# Product Service  
AUTH_SERVICE_URL=http://localhost:3001
PORT=3002

# Frontend Service
AUTH_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
PORT=3000
```

## 📚 Conceitos Demonstrados

### OAuth 2.0 Flows
1. **Authorization Code**: Login web tradicional
2. **Client Credentials**: Comunicação service-to-service
3. **Token Refresh**: Renovação automática de tokens

### JWT Structure
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 1,
    "email": "admin@ecommerce.com",
    "role": "admin",
    "scopes": ["read", "write", "admin"],
    "iss": "ecommerce-auth-service",
    "aud": "ecommerce-api",
    "exp": 1640995200
  }
}
```

### RBAC Matrix
| Resource | Admin | Viewer | Customer |
|----------|-------|--------|----------|
| Products (Read) | ✅ | ✅ | ✅ |
| Products (Write) | ✅ | ❌ | ❌ |
| Orders (Own) | ✅ | ❌ | ✅ |
| Orders (All) | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Cart | ❌ | ❌ | ✅ |

## 🧪 Testando a Aplicação

### 1. Teste de Autenticação
```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecommerce.com","password":"admin123"}'

# Validar token
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```

### 2. Teste de Autorização
```bash
# Acessar produtos (público)
curl http://localhost:3002/products

# Criar produto (requer admin)
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99,"category":"Test"}'

# Ver relatórios (requer viewer/admin)
curl http://localhost:3002/reports/sales \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Objetivos Didáticos

Esta aplicação demonstra:

1. **OAuth 2.0 Implementation**: Fluxos completos de autorização
2. **JWT Token Management**: Criação, validação e renovação
3. **Microservices Security**: Autenticação distribuída
4. **RBAC Authorization**: Controle granular de acesso
5. **Service Communication**: Auth entre microserviços
6. **Session Management**: Cookies e token storage
7. **API Security**: Rate limiting, CORS, validation

## 📖 Referências

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---
