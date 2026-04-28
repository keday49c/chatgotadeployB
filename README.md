# ChatGot - AI Chat Platform

Uma plataforma completa de chat com inteligência artificial, construída com Node.js, React, PostgreSQL e integrada com OpenAI, Stripe e AWS.

## 🚀 Funcionalidades

- **Chat com IA**: Interface de chat em tempo real com streaming de respostas via OpenAI
- **Autenticação por Chave Única**: Sistema seguro de autenticação sem OAuth externo
- **Proteção CAPTCHA**: Cloudflare Turnstile nos ecrãs de login e registo
- **Sistema de Limites**: Planos com limites de mensagens (Gratuito, Pro, Enterprise)
- **Pagamentos Stripe**: Integração completa com checkout e webhooks
- **Cobrança por Excedente**: R$0,15 por mensagem extra
- **Upload de Ficheiros**: Suporte para anexos com armazenamento seguro em S3
- **Painel Administrativo**: Métricas, auditoria e gestão de utilizadores
- **Alertas Automáticos**: Notificações para eventos críticos do sistema
- **Deploy AWS**: Infraestrutura em ECS Fargate com RDS PostgreSQL

## 📋 Pré-requisitos

### Local Development
- Node.js 22+
- pnpm 10+
- Docker & Docker Compose
- PostgreSQL 16+

### Production (AWS)
- Conta AWS com permissões para ECS, RDS, ECR, ALB, S3
- Domínio configurado (chatgot.com.br)
- Credenciais de APIs (OpenAI, Stripe, Turnstile)

## 🛠️ Setup Local

### 1. Clonar repositório
```bash
git clone https://github.com/keday49c/chatgotadeployB.git
cd chatgotadeployB
```

### 2. Instalar dependências
```bash
pnpm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

### 4. Iniciar com Docker Compose
```bash
docker-compose up -d
```

### 5. Executar migrations
```bash
pnpm db:push
```

### 6. Acessar aplicação
- Frontend: http://localhost
- Backend API: http://localhost:3000/api
- Adminer (DB): http://localhost:8080

## 🚀 Deploy na AWS

### Pré-requisitos
1. Conta AWS configurada com CLI
2. Repositório GitHub com credenciais
3. Domínio chatgot.com.br apontado para ALB

### 1. Preparar AWS
```bash
# Criar ECR repositories
aws ecr create-repository --repository-name chatgot-backend --region sa-east-1
aws ecr create-repository --repository-name chatgot-frontend --region sa-east-1

# Criar RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier chatgot-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username chatgot \
  --master-user-password your_secure_password \
  --allocated-storage 20 \
  --region sa-east-1
```

### 2. Configurar Secrets Manager
```bash
aws secretsmanager create-secret \
  --name chatgot/database-url \
  --secret-string "postgresql://chatgot:password@endpoint:5432/chatgot" \
  --region sa-east-1

# Repetir para outras credenciais (JWT_SECRET, OPENAI_API_KEY, etc.)
```

### 3. Criar ECS Cluster
```bash
aws ecs create-cluster --cluster-name chatgot-cluster --region sa-east-1
```

### 4. Executar deploy script
```bash
./scripts/deploy-aws.sh
```

### 5. Configurar GitHub Actions
1. Adicionar secrets no repositório:
   - `AWS_ACCOUNT_ID`: Seu ID da conta AWS
   - `AWS_ROLE_TO_ASSUME`: ARN da role para GitHub Actions

2. Push para main branch dispara deploy automático

## 📚 Arquitetura

### Backend (Node.js + Express + tRPC)
- **Autenticação**: Chave de acesso única com JWT
- **Chat**: Integração OpenAI com streaming
- **Pagamentos**: Webhooks Stripe
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Armazenamento**: S3 para ficheiros

### Frontend (React 19 + Tailwind)
- **UI**: shadcn/ui components
- **Chat**: Sidebar com histórico de conversas
- **Admin**: Dashboard com métricas
- **Autenticação**: Login/Registo com CAPTCHA

### Infraestrutura AWS
- **ECS Fargate**: Containers sem gerenciar servidores
- **RDS PostgreSQL**: Banco de dados gerenciado
- **ALB**: Load balancer com SSL
- **S3**: Armazenamento de ficheiros
- **CloudWatch**: Logs e monitoramento

## 🔐 Segurança

- Autenticação por chave única com hashing SHA-256
- Sessões JWT com expiração configurável
- CAPTCHA Turnstile em formulários
- Rate limiting em endpoints
- CORS configurado
- Security headers (CSP, X-Frame-Options, etc.)
- Dados sensíveis em AWS Secrets Manager
- HTTPS obrigatório em produção

## 💳 Planos e Preços

| Plano | Limite Mensal | Preço | Excedente |
|-------|--------------|-------|-----------|
| Gratuito | 10 mensagens | Grátis | R$0,15/msg |
| Pro | 100 mensagens | R$29,90 | R$0,15/msg |
| Enterprise | Ilimitado | Sob consulta | - |

## 📊 Banco de Dados

### Tabelas (11 no total)
- `users`: Utilizadores do sistema
- `conversations`: Conversas de chat
- `messages`: Mensagens individuais
- `attachments`: Ficheiros anexados
- `plans`: Planos de subscrição
- `subscriptions`: Subscrições ativas
- `usage`: Contagem de mensagens
- `invoices`: Faturas Stripe
- `audit_logs`: Auditoria de ações
- `admin_alerts`: Alertas ao administrador
- `stripe_events`: Eventos Stripe processados

## 🔄 CI/CD

GitHub Actions dispara automaticamente:
1. Build de imagens Docker
2. Push para ECR
3. Atualização de ECS Task Definition
4. Deploy para ECS Fargate
5. Validação de saúde

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registar novo utilizador
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/logout` - Fazer logout
- `GET /api/auth/me` - Obter utilizador atual

### Chat
- `POST /api/trpc/chat.createConversation` - Criar conversa
- `GET /api/trpc/chat.getConversations` - Listar conversas
- `GET /api/trpc/chat.getMessages` - Obter mensagens
- `POST /api/trpc/chat.sendMessage` - Enviar mensagem
- `POST /api/trpc/chat.uploadAttachment` - Upload de ficheiro

### Admin
- `GET /api/trpc/admin.getMetrics` - Métricas do sistema
- `GET /api/trpc/admin.getAlerts` - Alertas pendentes
- `GET /api/trpc/admin.getUsers` - Listar utilizadores

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verificar se RDS está acessível
psql -h your-rds-endpoint -U chatgot -d chatgot
```

### Erro de autenticação OpenAI
```bash
# Verificar chave de API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Erro de deploy ECS
```bash
# Verificar logs
aws logs tail /ecs/chatgot-backend --follow
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs em CloudWatch
2. Consultar documentação de APIs
3. Abrir issue no GitHub

## 📄 Licença

MIT License - veja LICENSE.md para detalhes

## 🙏 Agradecimentos

- OpenAI pela API de chat
- Stripe pelos pagamentos
- AWS pela infraestrutura
- Comunidade open source

---

**Desenvolvido com ❤️ para ChatGot**
