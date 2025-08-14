# Roteiro de Testes Postman - OAuth 2.0 Microservices

## 📋 Configuração Inicial do Postman

### 1. Criar Nova Collection
- Nome: `E-commerce OAuth 2.0 Tests`
- Descrição: `Testes de autenticação e autorização em microserviços`

### 2. Configurar Variáveis de Environment
```json
{
  "auth_service_url": "http://localhost:3001",
  "product_service_url": "http://localhost:3002",
  "frontend_service_url": "http://localhost:3000",
  "access_token": "",
  "refresh_token": "",
  "user_id": "",
  "client_id": "ecommerce-frontend",
  "client_secret": "frontend-secret-key"
}
```

---

## 🔐 PARTE 1: TESTES DE AUTENTICAÇÃO

### Test 1.1: Health Check dos Serviços
**Objetivo**: Verificar se todos os serviços estão funcionando

#### Request 1: Auth Service Health
```
GET {{auth_service_url}}/health
```
**Expected Response**: 200 OK
```json
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Request 2: Product Service Health
```
GET {{product_service_url}}/health
```
**Expected Response**: 200 OK

---

### Test 1.2: Basic Authentication - Login Direto
**Objetivo**: Testar login tradicional com email/senha

#### Request: Login Admin
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "admin@ecommerce.com",
  "password": "admin123"
}
```

**Expected Response**: 200 OK
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "admin@ecommerce.com",
    "name": "System Administrator",
    "role": "admin"
  }
}
```

**Post-request Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.access_token);
    pm.environment.set("user_id", response.user.id);
    pm.test("Login successful", () => {
        pm.expect(response.access_token).to.not.be.empty;
        pm.expect(response.user.role).to.equal("admin");
    });
}
```

#### Request: Login Viewer
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "viewer@ecommerce.com",
  "password": "viewer123"
}
```

#### Request: Login Customer
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "customer@ecommerce.com",
  "password": "customer123"
}
```

#### Request: Login Inválido
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "invalid@email.com",
  "password": "wrongpassword"
}
```
**Expected Response**: 401 Unauthorized

---

### Test 1.3: JWT Token Validation
**Objetivo**: Verificar validação de tokens JWT

#### Request: Validar Token
```
POST {{auth_service_url}}/auth/validate
Content-Type: application/json

{
  "token": "{{access_token}}"
}
```

**Expected Response**: 200 OK
```json
{
  "valid": true,
  "user": {
    "user_id": 1,
    "email": "admin@ecommerce.com",
    "role": "admin",
    "scopes": ["read", "write", "delete", "admin", "reports"]
  },
  "expires_at": "2024-01-15T10:45:00.000Z"
}
```

#### Request: Token Inválido
```
POST {{auth_service_url}}/auth/validate
Content-Type: application/json

{
  "token": "invalid.jwt.token"
}
```
**Expected Response**: 401 Unauthorized

---

### Test 1.4: OAuth 2.0 Authorization Code Flow
**Objetivo**: Testar fluxo OAuth completo

#### Request 1: Authorization Endpoint
```
GET {{auth_service_url}}/oauth/authorize?client_id={{client_id}}&redirect_uri=http://localhost:3000/callback&response_type=code&scope=read write&state=xyz123
```

**Expected Response**: 200 OK
```json
{
  "message": "Authorization required",
  "client_name": "E-commerce Frontend",
  "scopes": ["read", "write"],
  "authorize_url": "/oauth/authorize/confirm",
  "params": {
    "client_id": "ecommerce-frontend",
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "read write",
    "state": "xyz123"
  }
}
```

#### Request 2: Confirm Authorization
```
POST {{auth_service_url}}/oauth/authorize/confirm
Content-Type: application/json

{
  "client_id": "{{client_id}}",
  "redirect_uri": "http://localhost:3000/callback",
  "scope": "read write",
  "state": "xyz123",
  "user_id": 1
}
```

**Expected Response**: 200 OK
```json
{
  "redirect_url": "http://localhost:3000/callback?code=abc123&state=xyz123",
  "code": "abc123"
}
```

**Post-request Script**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("auth_code", response.code);
}
```

#### Request 3: Exchange Code for Token
```
POST {{auth_service_url}}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={{auth_code}}&redirect_uri=http://localhost:3000/callback&client_id={{client_id}}&client_secret={{client_secret}}
```

**Expected Response**: 200 OK
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "scope": "read write"
}
```

---

### Test 1.5: OAuth 2.0 Client Credentials Flow
**Objetivo**: Testar autenticação service-to-service

#### Request: Client Credentials Grant
```
POST {{auth_service_url}}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{client_id}}&client_secret={{client_secret}}&scope=read
```

**Expected Response**: 200 OK
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read"
}
```

---

### Test 1.6: Refresh Token Flow
**Objetivo**: Testar renovação de tokens

#### Request: Refresh Token
```
POST {{auth_service_url}}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={{refresh_token}}
```

**Expected Response**: 200 OK
```json
{
  "access_token": "new.jwt.token",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "new-refresh-token",
  "scope": "read write"
}
```

---

## 🛡️ PARTE 2: TESTES DE AUTORIZAÇÃO RBAC

### Test 2.1: Admin Role - Full Access
**Objetivo**: Verificar permissões completas do admin

#### Request 1: Listar Produtos (Admin)
```
GET {{product_service_url}}/products
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 2: Criar Produto (Admin Only)
```
POST {{product_service_url}}/products
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Test Product Admin",
  "description": "Product created by admin",
  "price": 99.99,
  "category": "Test",
  "stock_quantity": 10,
  "image_url": "https://via.placeholder.com/300x300?text=Test"
}
```
**Expected Response**: 201 Created

#### Request 3: Atualizar Produto (Admin Only)
```
PUT {{product_service_url}}/products/1
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Updated Product",
  "description": "Updated by admin",
  "price": 149.99,
  "category": "Electronics",
  "stock_quantity": 15
}
```
**Expected Response**: 200 OK

#### Request 4: Deletar Produto (Admin Only)
```
DELETE {{product_service_url}}/products/9
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 5: Ver Todos os Pedidos (Admin)
```
GET {{product_service_url}}/orders
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 6: Relatórios de Vendas (Admin)
```
GET {{product_service_url}}/reports/sales
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

---

### Test 2.2: Viewer Role - Read Only + Reports
**Objetivo**: Verificar permissões limitadas do viewer

**Pré-requisito**: Fazer login como viewer primeiro
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "viewer@ecommerce.com",
  "password": "viewer123"
}
```

#### Request 1: Listar Produtos (Viewer)
```
GET {{product_service_url}}/products
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 2: Tentar Criar Produto (Viewer - Deve Falhar)
```
POST {{product_service_url}}/products
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Unauthorized Product",
  "price": 99.99,
  "category": "Test"
}
```
**Expected Response**: 403 Forbidden
```json
{
  "error": "access_denied",
  "message": "Required role: admin"
}
```

#### Request 3: Relatórios de Vendas (Viewer)
```
GET {{product_service_url}}/reports/sales
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 4: Tentar Ver Carrinho (Viewer - Deve Falhar)
```
GET {{product_service_url}}/orders/cart
Authorization: Bearer {{access_token}}
```
**Expected Response**: 403 Forbidden

---

### Test 2.3: Customer Role - Shopping Only
**Objetivo**: Verificar permissões de compra do customer

**Pré-requisito**: Fazer login como customer
```
POST {{auth_service_url}}/auth/login
Content-Type: application/json

{
  "email": "customer@ecommerce.com",
  "password": "customer123"
}
```

#### Request 1: Listar Produtos (Customer)
```
GET {{product_service_url}}/products
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 2: Ver Carrinho (Customer)
```
GET {{product_service_url}}/orders/cart
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

#### Request 3: Adicionar ao Carrinho (Customer)
```
POST {{product_service_url}}/orders/cart/add
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```
**Expected Response**: 201 Created

#### Request 4: Tentar Criar Produto (Customer - Deve Falhar)
```
POST {{product_service_url}}/products
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Unauthorized Product",
  "price": 99.99
}
```
**Expected Response**: 403 Forbidden

#### Request 5: Tentar Ver Relatórios (Customer - Deve Falhar)
```
GET {{product_service_url}}/reports/sales
Authorization: Bearer {{access_token}}
```
**Expected Response**: 403 Forbidden

#### Request 6: Finalizar Compra (Customer)
```
POST {{product_service_url}}/orders/checkout
Authorization: Bearer {{access_token}}
```
**Expected Response**: 201 Created

#### Request 7: Ver Próprios Pedidos (Customer)
```
GET {{product_service_url}}/orders
Authorization: Bearer {{access_token}}
```
**Expected Response**: 200 OK

---

## 🔒 PARTE 3: TESTES DE SEGURANÇA

### Test 3.1: Token Expiration
**Objetivo**: Verificar expiração de tokens

#### Request: Usar Token Expirado
```
GET {{product_service_url}}/products
Authorization: Bearer expired.jwt.token.here
```
**Expected Response**: 401 Unauthorized

### Test 3.2: Invalid Scopes
**Objetivo**: Testar acesso com scopes insuficientes

#### Request: Token sem Scope Necessário
```
GET {{product_service_url}}/reports/sales
Authorization: Bearer token.without.reports.scope
```
**Expected Response**: 403 Forbidden

### Test 3.3: Cross-User Access
**Objetivo**: Verificar isolamento entre usuários

#### Request: Customer Tentando Ver Pedidos de Outro
```
GET {{product_service_url}}/orders?user_id=999
Authorization: Bearer {{customer_token}}
```
**Expected Response**: 403 Forbidden

### Test 3.4: Rate Limiting
**Objetivo**: Testar limitação de requisições

#### Request: Múltiplas Requisições Rápidas
```
# Execute 101 vezes rapidamente
GET {{auth_service_url}}/health
```
**Expected Response**: 429 Too Many Requests (após 100 requests)

---

## 📊 PARTE 4: TESTES DE INTEGRAÇÃO

### Test 4.1: Fluxo Completo de Compra
**Objetivo**: Testar jornada completa do customer

#### Sequência:
1. Login como customer
2. Listar produtos
3. Adicionar produtos ao carrinho
4. Ver carrinho
5. Finalizar compra
6. Ver pedido criado

### Test 4.2: Fluxo Admin Completo
**Objetivo**: Testar gestão completa pelo admin

#### Sequência:
1. Login como admin
2. Criar produto
3. Atualizar produto
4. Ver todos os pedidos
5. Ver relatórios
6. Deletar produto

---

## 🧪 SCRIPTS DE AUTOMAÇÃO POSTMAN

### Pre-request Script Global
```javascript
// Set timestamp for requests
pm.globals.set("timestamp", new Date().toISOString());

// Auto-refresh token if expired
const token = pm.environment.get("access_token");
if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
        console.log("Token expired, need to refresh");
        // Trigger refresh token flow
    }
}
```

### Test Script Global
```javascript
// Common test assertions
pm.test("Response time is less than 2000ms", () => {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Response has correct content-type", () => {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

// Log response for debugging
if (pm.response.code >= 400) {
    console.log("Error Response:", pm.response.text());
}
```

---

## 📋 CHECKLIST DE TESTES

### ✅ Autenticação
- [ ] Login com credenciais válidas (admin, viewer, customer)
- [ ] Login com credenciais inválidas
- [ ] Validação de token JWT
- [ ] OAuth Authorization Code Flow
- [ ] OAuth Client Credentials Flow
- [ ] Refresh Token Flow
- [ ] Token expiration handling

### ✅ Autorização RBAC
- [ ] Admin: CRUD produtos, ver todos pedidos, relatórios
- [ ] Viewer: ver produtos, relatórios (sem CRUD)
- [ ] Customer: ver produtos, carrinho, próprios pedidos
- [ ] Negação de acesso para roles inadequados
- [ ] Isolamento de recursos entre usuários

### ✅ Segurança
- [ ] Tokens inválidos rejeitados
- [ ] Scopes insuficientes bloqueados
- [ ] Rate limiting funcionando
- [ ] Cross-user access bloqueado
- [ ] Headers de segurança presentes

### ✅ Integração
- [ ] Comunicação entre serviços
- [ ] Fluxo completo de compra
- [ ] Gestão completa de produtos
- [ ] Relatórios e analytics

---

## 🚀 EXECUTANDO OS TESTES

### 1. Importar Collection
- Criar requests baseados neste roteiro
- Configurar environment variables
- Adicionar scripts de automação

### 2. Executar Sequencialmente
1. Health checks
2. Testes de autenticação
3. Testes de autorização por role
4. Testes de segurança
5. Testes de integração

### 3. Executar via Newman (CLI)
```bash
newman run ecommerce-oauth-tests.postman_collection.json \
  -e ecommerce-environment.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

---

**📝 Nota**: Este roteiro cobre todos os aspectos de autenticação OAuth 2.0 e autorização RBAC implementados no sistema de microserviços, fornecendo uma base completa para validação das funcionalidades de segurança.
