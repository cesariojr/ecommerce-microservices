# 🧪 Testes de API - Guia Simplificado

## 🚀 Setup Rápido (2 minutos)

### 1. Importar no Postman
1. **Import** → **File** → Selecionar `E-commerce_OAuth2_Tests.postman_collection.json`
2. **Import** → **File** → Selecionar `E-commerce_Environment.postman_environment.json`
3. Selecionar environment **"E-commerce OAuth 2.0 Environment"**

### 2. Verificar Serviços Rodando
```bash
# Verificar se todos os serviços estão ativos:
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Product Service  
curl http://localhost:3000         # Frontend Service
```

---

## 🎯 Cenários de Teste Essenciais

### 📋 Cenário 1: Teste Básico de Autenticação (8 min)
**Objetivo**: Verificar login e JWT funcionando para todos os perfis

**Passos**:
1. `🔐 Login Admin` → Gera token JWT automaticamente
2. `🔐 Login Viewer` → Gera token JWT automaticamente  
3. `🔐 Login Customer` → Gera token JWT automaticamente
4. `✅ Validate Admin Token` → Confirma token e role admin
5. `✅ Validate Viewer Token` → Confirma token e role viewer
6. `✅ Validate Customer Token` → Confirma token e role customer

**Resultado Esperado**:
- ✅ Todos os logins: 200 OK + token salvo
- ✅ Todas as validações: 200 OK + role correto verificado
- ❌ Login inválido: 401 Unauthorized

---

### 📋 Cenário 1.5: Acesso Público (2 min)
**Objetivo**: Verificar que recursos públicos funcionam sem autenticação

**Passos**:
1. `🌐 Public - List Products (No Auth)` → Acesso sem token

**Resultado Esperado**:
- ✅ Listagem pública: 200 OK + produtos retornados

---

### 📋 Cenário 2: Controle de Acesso por Roles (10 min)
**Objetivo**: Demonstrar RBAC funcionando

#### 2A. Admin (Acesso Total)
1. `🔐 Login Admin`
2. `📦 Admin - List Products` → ✅ 200 OK
3. `➕ Admin - Create Product` → ✅ 201 Created
4. `📊 Admin - View Reports` → ✅ 200 OK

#### 2B. Viewer (Somente Leitura + Relatórios)
1. `🔐 Login Viewer`
2. `📦 Viewer - List Products` → ✅ 200 OK
3. `❌ Viewer - Try Create Product` → ❌ 403 Forbidden
4. `📊 Viewer - View Reports` → ✅ 200 OK

#### 2C. Customer (Compras)
1. `🔐 Login Customer`
2. `📦 Customer - List Products` → ✅ 200 OK
3. `🛒 Customer - View Cart` → ✅ 200 OK
4. `➕ Customer - Add to Cart` → ✅ 201 Created
5. `❌ Customer - Try Create Product` → ❌ 403 Forbidden
6. `❌ Customer - Try View Reports` → ❌ 403 Forbidden

---

### 📋 Cenário 3: Testes de Segurança (3 min)
**Objetivo**: Verificar proteções de segurança

**Passos**:
1. `❌ No Token Test` → Requisição sem token
2. `❌ Invalid Token Test` → Token inválido/expirado

**Resultado Esperado**:
- ❌ Ambos: 401 Unauthorized

---

## 🔄 Execução Automatizada

### Via Postman (Recomendado)
1. Clicar na collection **"E-commerce OAuth 2.0 Tests"**
2. Clicar **"Run collection"**
3. Selecionar **todos os folders**
4. Clicar **"Run E-commerce OAuth 2.0 Tests"**

### Via Newman CLI
```bash
cd postman/
chmod +x run-tests.sh
./run-tests.sh
```

---

## 📊 Interpretando Resultados

### ✅ Sucessos Esperados
| Status | Significado | Exemplo |
|--------|-------------|---------|
| **200 OK** | Operação autorizada | Login, listar produtos |
| **201 Created** | Recurso criado | Criar produto (admin) |
| **204 No Content** | Operação sem retorno | Adicionar ao carrinho |

### ❌ Falhas Esperadas (Demonstram Segurança)
| Status | Significado | Exemplo |
|--------|-------------|---------|
| **401 Unauthorized** | Token ausente/inválido | Sem autenticação |
| **403 Forbidden** | Sem permissão | Viewer tentando criar produto |
| **404 Not Found** | Recurso não existe | Produto inexistente |

---

## 🎓 Conceitos Demonstrados

### 🔐 Autenticação JWT
- **Login** → Gera token JWT com claims do usuário
- **Validação** → Verifica assinatura e expiração
- **Headers** → `Authorization: Bearer <token>`

### 🛡️ RBAC (Role-Based Access Control)
- **Admin**: Acesso total (CRUD + relatórios)
- **Viewer**: Leitura + relatórios (sem escrita)
- **Customer**: Compras + carrinho (sem admin)

### 🔒 Segurança de APIs
- **Token obrigatório** para endpoints protegidos
- **Validação de roles** antes de executar ações
- **Mensagens de erro** padronizadas

---

## 🚨 Troubleshooting

### Problema: "Connection refused"
**Solução**: Verificar se os serviços estão rodando
```bash
npm start
```

### Problema: "401 Unauthorized" inesperado
**Solução**: 
1. Executar `Login Admin/Viewer/Customer` primeiro
2. Verificar se token foi salvo automaticamente
3. Verificar se environment está selecionado

### Problema: "403 Forbidden" inesperado
**Solução**: Verificar se está usando o usuário correto:
- **Admin**: `admin@ecommerce.com`
- **Viewer**: `viewer@ecommerce.com`  
- **Customer**: `customer@ecommerce.com`

---

## 📈 Métricas de Sucesso

### Execução Completa Esperada:
- **Total**: ~23 testes
- **✅ Sucessos**: ~16 (70%)
- **❌ Falhas esperadas**: ~7 (30% - demonstram segurança)
- **⏱️ Tempo**: 2-3 minutos

### Principais Validações:
- ✅ Todos os serviços respondem (health checks)
- ✅ Login gera tokens válidos para cada perfil
- ✅ Validação confirma role correto para cada token
- ✅ Admin tem acesso total
- ✅ Viewer tem acesso limitado
- ✅ Customer tem acesso de compra
- ❌ Operações não autorizadas são bloqueadas

---

## 🎯 Resumo dos Endpoints Testados

| Endpoint | Método | Acesso | Descrição |
|----------|--------|--------|-----------|
| `/health` | GET | Público | Health check |
| `/auth/login` | POST | Público | Login usuário |
| `/auth/validate` | POST | Público | Validar token |
| `/products` | GET | Público | Listar produtos |
| `/products` | POST | Admin | Criar produto |
| `/products/:id` | PUT | Admin | Atualizar produto |
| `/products/:id` | DELETE | Admin | Deletar produto |
| `/orders/cart` | GET | Customer | Ver carrinho |
| `/orders/cart/add` | POST | Customer | Adicionar ao carrinho |
| `/reports/sales` | GET | Admin/Viewer | Relatórios de vendas |
