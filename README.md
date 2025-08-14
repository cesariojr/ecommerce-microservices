# E-commerce Microservices - Demonstração OAuth 2.0

Demonstração prática de autenticação e autorização em microserviços usando OAuth 2.0, JWT tokens e controle de acesso baseado em roles (RBAC).
ATENÇÃO: Essa aplicação é apenas um teste para fins didáticos. Algumas funcionalidades estão "mockadas" e/ou não foram implementadas.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Frontend Service│    │  Auth Service   │    │Product Service  │
│   (Porta 3000)  │    │   (Porta 3001)  │    │   (Porta 3002)  │
│                 │    │                 │    │                 │
│ • Templates EJS │    │ • OAuth 2.0     │    │ • CRUD Produtos │
│ • Interface Web │◄──▶│ • JWT Tokens    │◄──▶│ • Gestão Pedidos│
│ • Auth Cookies  │    │ • Gestão Users  │    │ • Shopping Cart │
│ • UI por Role   │    │ • RBAC          │    │ • Relatórios    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Bancos SQLite │
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

## 👥 Usuários de Demonstração

| Role | Email | Senha | Permissões |
|------|-------|-------|------------|
| **Admin** | admin@ecommerce.com | admin123 | CRUD produtos, visualizar pedidos, relatórios |
| **Viewer** | viewer@ecommerce.com | viewer123 | Visualizar relatórios de vendas |
| **Customer** | customer@ecommerce.com | customer123 | Navegar produtos, fazer compras |

## 🔍 Funcionalidades Demonstradas

### Autenticação OAuth 2.0
- ✅ Login com JWT tokens
- ✅ Validação de tokens entre serviços
- ✅ Renovação automática de tokens
- ✅ Gerenciamento de sessões via cookies

### Autorização RBAC
- ✅ Controle de acesso baseado em roles
- ✅ Permissões baseadas em scopes
- ✅ Autorização a nível de recursos
- ✅ Autenticação service-to-service

### Microserviços
- ✅ Isolamento de serviços
- ✅ Bancos de dados independentes
- ✅ Comunicação via REST API
- ✅ Autenticação distribuída

## 📊 Endpoints da API

### Auth Service (3001)
```
POST /auth/login          - Login de usuário
POST /auth/validate       - Validar token JWT
GET  /auth/profile        - Perfil do usuário
POST /oauth/token         - Endpoint de token OAuth
GET  /oauth/authorize     - Endpoint de autorização OAuth
```

### Product Service (3002)
```
GET    /products          - Listar produtos (público)
POST   /products          - Criar produto (admin)
PUT    /products/:id      - Atualizar produto (admin)
DELETE /products/:id      - Deletar produto (admin)
GET    /orders            - Listar pedidos (autenticado)
POST   /orders/checkout   - Finalizar compra (customer)
GET    /orders/cart       - Ver carrinho (customer)
POST   /orders/cart/add   - Adicionar ao carrinho (customer)
GET    /reports/sales     - Relatórios (viewer/admin)
```

### Frontend Service (3000)
```
GET  /                    - Redireciona para login
GET  /products            - Catálogo de produtos
GET  /login               - Página de login
POST /login               - Processar login
GET  /dashboard           - Dashboard personalizado por role
GET  /cart                - Carrinho de compras
POST /cart/add/:id        - Adicionar produto ao carrinho
POST /checkout            - Finalizar compra
GET  /admin/products      - Gestão de produtos (admin)
GET  /architecture        - Documentação da arquitetura
```

## 🛡️ Segurança Implementada

### Tokens JWT
- **Algoritmo**: HS256 (HMAC SHA-256)
- **Claims**: iss, aud, exp, user_id, role, scopes
- **Validação**: Assinatura + expiração + claims

### Middleware de Autorização
- **Validação de tokens**: Via auth service
- **Verificação de scopes**: Permissões granulares
- **Verificação de roles**: Controle por papel
- **Propriedade de recursos**: Acesso a recursos próprios

### Proteções
- **Rate limiting**: Proteção contra abuso de API
- **CORS**: Configurado para origins específicos
- **Helmet**: Headers de segurança HTTP
- **Validação de entrada**: Sanitização de dados

## 🗄️ Estrutura dos Bancos de Dados

### Auth Service (auth.db)
```sql
users              - Usuários do sistema
```

### Product Service (products.db)
```sql
products           - Catálogo de produtos
orders             - Pedidos dos clientes
order_items        - Itens dos pedidos
cart_items         - Carrinho de compras (implementado via orders)
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

### Fluxos OAuth 2.0
1. **Authorization Code**: Login web tradicional
2. **Client Credentials**: Comunicação service-to-service
3. **Token Refresh**: Renovação automática de tokens

### Estrutura JWT
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
    "scopes": ["read", "write", "admin"],
    "iss": "ecommerce-auth-service",
    "aud": "ecommerce-api",
    "exp": 1640995200
  }
}
```

### Matriz RBAC
| Recurso | Admin | Viewer | Customer |
|---------|-------|--------|----------|
| Produtos (Leitura) | ✅ | ✅ | ✅ |
| Produtos (Escrita) | ✅ | ❌ | ❌ |
| Pedidos (Próprios) | ✅ | ❌ | ✅ |
| Pedidos (Todos) | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ✅ | ❌ |
| Carrinho | ❌ | ❌ | ✅ |

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
  -d '{"token":"SEU_JWT_TOKEN"}'
```

### 2. Teste de Autorização
```bash
# Acessar produtos (público)
curl http://localhost:3002/products

# Criar produto (requer admin)
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste","price":99.99,"category":"Teste"}'

# Ver relatórios (requer viewer/admin)
curl http://localhost:3002/reports/sales \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

### 3. Testes com Postman
Utilize a collection disponível em `/postman/` para testes automatizados:
- **Collection**: `E-commerce_Simple_Tests.postman_collection.json`
- **Environment**: `E-commerce_Environment.postman_environment.json`
- **Guia**: `QUICK_TEST_SCENARIOS.md`

## 🎯 Objetivos Didáticos

Esta aplicação demonstra na prática:

1. **Implementação OAuth 2.0**: Fluxos completos de autorização
2. **Gerenciamento JWT**: Criação, validação e renovação de tokens
3. **Segurança em Microserviços**: Autenticação distribuída
4. **Autorização RBAC**: Controle granular de acesso
5. **Comunicação entre Serviços**: Autenticação service-to-service
6. **Gerenciamento de Sessões**: Cookies e armazenamento de tokens
7. **Segurança de APIs**: Rate limiting, CORS, validação

## 📖 Referências Técnicas

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---
