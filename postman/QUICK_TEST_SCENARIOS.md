# Cenários de Teste Rápidos - Postman

## 🚀 Setup Rápido (5 minutos)

### 1. Importar no Postman
1. Abrir Postman
2. Import → File → Selecionar `E-commerce_OAuth2_Tests.postman_collection.json`
3. Import → File → Selecionar `E-commerce_Environment.postman_environment.json`
4. Selecionar environment "E-commerce OAuth 2.0 Environment"

### 2. Verificar Serviços
Execute primeiro os requests de "Health Checks" para confirmar que todos os serviços estão rodando.

---

## 🎯 Cenários de Teste por Conceito

### Cenário 1: Autenticação Básica (JWT)
**Objetivo**: Demonstrar login tradicional e validação de JWT

**Sequência**:
1. `Login Admin` → Salva token automaticamente
2. `Validate Token` → Confirma token válido
3. `Login Invalid Credentials` → Demonstra falha de autenticação

**Conceitos Demonstrados**:
- ✅ Autenticação com credenciais
- ✅ Geração de JWT tokens
- ✅ Validação de tokens
- ✅ Tratamento de credenciais inválidas

---

### Cenário 2: OAuth 2.0 Authorization Code Flow
**Objetivo**: Demonstrar fluxo OAuth completo

**Sequência**:
1. `OAuth Authorization Request` → Solicita autorização
2. `OAuth Authorization Confirm` → Simula aprovação do usuário
3. `OAuth Token Exchange` → Troca código por token

**Conceitos Demonstrados**:
- ✅ OAuth 2.0 Authorization Code Grant
- ✅ Separação entre autorização e token
- ✅ Redirect URIs e state parameter
- ✅ Client authentication

---

### Cenário 3: RBAC - Admin (Acesso Total)
**Objetivo**: Demonstrar permissões completas do administrador

**Pré-requisito**: Execute `Login Admin` primeiro

**Sequência**:
1. `Admin - List Products` → Visualizar produtos
2. `Admin - Create Product` → Criar novo produto
3. `Admin - View All Orders` → Ver todos os pedidos
4. `Admin - View Sales Reports` → Acessar relatórios

**Conceitos Demonstrados**:
- ✅ Role-based access control
- ✅ Permissões de CRUD completo
- ✅ Acesso a dados administrativos
- ✅ Scopes de autorização

---

### Cenário 4: RBAC - Viewer (Somente Leitura + Relatórios)
**Objetivo**: Demonstrar permissões limitadas do viewer

**Pré-requisito**: Execute `Login Viewer` primeiro

**Sequência**:
1. `Viewer - List Products` → ✅ Pode visualizar
2. `Viewer - Try Create Product` → ❌ Deve falhar (403)
3. `Viewer - View Sales Reports` → ✅ Pode acessar relatórios

**Conceitos Demonstrados**:
- ✅ Permissões de leitura
- ✅ Bloqueio de operações de escrita
- ✅ Acesso específico a relatórios
- ✅ Controle granular de acesso

---

### Cenário 5: RBAC - Customer (Compras)
**Objetivo**: Demonstrar permissões de compra do cliente

**Pré-requisito**: Execute `Login Customer` primeiro

**Sequência**:
1. `Customer - List Products` → ✅ Pode visualizar catálogo
2. `Customer - View Cart` → ✅ Pode ver carrinho
3. `Customer - Add to Cart` → ✅ Pode adicionar produtos
4. `Customer - Try Create Product` → ❌ Deve falhar (403)
5. `Customer - Try View Reports` → ❌ Deve falhar (403)

**Conceitos Demonstrados**:
- ✅ Permissões específicas de cliente
- ✅ Acesso ao carrinho de compras
- ✅ Bloqueio de funções administrativas
- ✅ Isolamento de recursos por usuário

---

### Cenário 6: Testes de Segurança
**Objetivo**: Demonstrar proteções de segurança

**Sequência**:
1. `Invalid Token Test` → Token inválido rejeitado
2. `No Token Test` → Requisição sem token rejeitada

**Conceitos Demonstrados**:
- ✅ Validação de tokens JWT
- ✅ Proteção contra acesso não autorizado
- ✅ Tratamento de erros de segurança

---

## 🔄 Fluxos Completos de Teste

### Fluxo A: Demonstração Completa OAuth 2.0
```
1. Health Checks (todos os serviços)
2. OAuth Authorization Request
3. OAuth Authorization Confirm  
4. OAuth Token Exchange
5. Client Credentials Grant
6. Token validation
```

### Fluxo B: Demonstração RBAC Completa
```
1. Login Admin → Test admin permissions
2. Login Viewer → Test viewer permissions  
3. Login Customer → Test customer permissions
4. Security tests (invalid tokens)
```

### Fluxo C: Jornada do Cliente (E-commerce)
```
1. Login Customer
2. List Products (browse catalog)
3. Add to Cart
4. View Cart
5. Try unauthorized actions (should fail)
```

---

## 📊 Interpretando os Resultados

### ✅ Sucessos Esperados
- **200 OK**: Operações autorizadas
- **201 Created**: Recursos criados com sucesso
- **302 Found**: Redirects OAuth

### ❌ Falhas Esperadas (Demonstram Segurança)
- **401 Unauthorized**: Token inválido/ausente
- **403 Forbidden**: Permissões insuficientes
- **429 Too Many Requests**: Rate limiting

### 🔍 Validações Automáticas
Cada request inclui testes automáticos que verificam:
- Status codes corretos
- Estrutura de resposta
- Presença de tokens
- Roles e scopes corretos
- Mensagens de erro apropriadas

---

## 🎓 Conceitos Didáticos por Teste

| Teste | Conceito OAuth 2.0 | Conceito RBAC | Conceito Segurança |
|-------|-------------------|---------------|-------------------|
| Login Admin | JWT Generation | Admin Role | Credential Validation |
| OAuth Flow | Authorization Code Grant | - | Client Authentication |
| Admin Create Product | Bearer Token | Write Permission | Scope Validation |
| Viewer Try Create | - | Role Restriction | Access Denied |
| Customer Cart | - | Resource Ownership | User Isolation |
| Invalid Token | Token Validation | - | Security Enforcement |

---

## 🚀 Executar Todos os Testes

### Via Postman GUI
1. Selecionar collection "E-commerce OAuth 2.0 Tests"
2. Clicar "Run" 
3. Selecionar todos os folders
4. Clicar "Run E-commerce OAuth 2.0 Tests"

### Via Newman CLI
```bash
cd postman/
./run-tests.sh
```

### Resultado Esperado
- ✅ ~25 testes executados
- ✅ ~20 sucessos (operações autorizadas)
- ✅ ~5 falhas esperadas (demonstram segurança)
- 📊 Relatório HTML gerado

---

## 🎯 Pontos de Aprendizado

Após executar os testes, os alunos terão visto na prática:

1. **OAuth 2.0 Authorization Framework**
   - Authorization Code Grant
   - Client Credentials Grant
   - Token validation e introspection

2. **JWT (JSON Web Tokens)**
   - Estrutura e claims
   - Assinatura e validação
   - Lifecycle management

3. **RBAC (Role-Based Access Control)**
   - Diferentes níveis de acesso
   - Controle granular de permissões
   - Isolamento de recursos

4. **Microservices Security**
   - Service-to-service authentication
   - Distributed authorization
   - Token-based communication

5. **API Security Best Practices**
   - Token validation
   - Error handling
   - Rate limiting
   - Input validation

