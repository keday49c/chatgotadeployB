# 🚀 Guia de Deploy ChatGot na AWS

Este guia fornece instruções passo a passo para fazer deploy da aplicação ChatGot na AWS usando ECS Fargate, RDS PostgreSQL e ALB com o domínio chatgot.com.br.

## 📋 Pré-requisitos

- Conta AWS ativa
- AWS CLI configurado com credenciais
- Docker instalado localmente
- GitHub com repositório "chatgotadeployB"
- Domínio chatgot.com.br apontado para Route 53

## 🔑 Credenciais Fornecidas

```
AWS Access Key: AKIAXJE44KOATL2GEAER
AWS Secret Key: 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
AWS Region: sa-east-1 (São Paulo)

Stripe:
- Public: pk_live_51TMZZEC25oWVdDoa2wBjRh8SsN8eDkrIP2b80csCFBXJtPyJ2NEHF9qZDmU6t1uEfMVbzOI8rt2zY9ZTWFQdopr200ZoQ8KxIa
- Secret: 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

OpenAI: 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

Turnstile: 6LdkE88sAAAAAMWYt1cHDRkF86M_9oR2fBdbddyT
```

## 📝 Passo 1: Configurar AWS CLI

```bash
# Configurar credenciais
aws configure

# Quando solicitado, forneça:
# AWS Access Key ID: AKIAXJE44KOATL2GEAER
# AWS Secret Access Key: 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
# Default region: sa-east-1
# Default output format: json

# Verificar configuração
aws sts get-caller-identity
```

## 🗄️ Passo 2: Criar RDS PostgreSQL

```bash
# Criar instância RDS
aws rds create-db-instance \
  --db-instance-identifier chatgot-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.2 \
  --master-username chatgot \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --publicly-accessible false \
  --multi-az false \
  --region sa-east-1

# Aguardar criação (pode levar 5-10 minutos)
aws rds describe-db-instances \
  --db-instance-identifier chatgot-db \
  --region sa-east-1 \
  --query 'DBInstances[0].DBInstanceStatus'

# Obter endpoint
aws rds describe-db-instances \
  --db-instance-identifier chatgot-db \
  --region sa-east-1 \
  --query 'DBInstances[0].Endpoint.Address'
```

## 🔐 Passo 3: Criar Secrets Manager

```bash
# Criar secret para DATABASE_URL
aws secretsmanager create-secret \
  --name chatgot/database-url \
  --secret-string "postgresql://chatgot:YourSecurePassword123!@chatgot-db.XXXXXXXXX.sa-east-1.rds.amazonaws.com:5432/chatgot" \
  --region sa-east-1

# Criar secret para JWT_SECRET
aws secretsmanager create-secret \
  --name chatgot/jwt-secret \
  --secret-string "$(openssl rand -hex 32)" \
  --region sa-east-1

# Criar secret para OPENAI_API_KEY
aws secretsmanager create-secret \
  --name chatgot/openai-api-key \
  --secret-string "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" \
  --region sa-east-1

# Criar secret para STRIPE_SECRET_KEY
aws secretsmanager create-secret \
  --name chatgot/stripe-secret-key \
  --secret-string "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" \
  --region sa-east-1

# Criar secret para STRIPE_PUBLISHABLE_KEY
aws secretsmanager create-secret \
  --name chatgot/stripe-publishable-key \
  --secret-string "pk_live_51TMZZEC25oWVdDoa2wBjRh8SsN8eDkrIP2b80csCFBXJtPyJ2NEHF9qZDmU6t1uEfMVbzOI8rt2zY9ZTWFQdopr200ZoQ8KxIa" \
  --region sa-east-1

# Criar secret para TURNSTILE_SECRET_KEY
aws secretsmanager create-secret \
  --name chatgot/turnstile-secret-key \
  --secret-string "6LdkE88sAAAAAMWYt1cHDRkF86M_9oR2fBdbddyT" \
  --region sa-east-1

# Criar secret para AWS credentials
aws secretsmanager create-secret \
  --name chatgot/aws-access-key-id \
  --secret-string "AKIAXJE44KOATL2GEAER" \
  --region sa-east-1

aws secretsmanager create-secret \
  --name chatgot/aws-secret-access-key \
  --secret-string "G7EwxlRFtwWYF2e/P/wwHBlwS2+wWRfS9ET+kq8Q" \
  --region sa-east-1
```

## 📦 Passo 4: Criar ECR Repositories

```bash
# Criar repositório para backend
aws ecr create-repository \
  --repository-name chatgot-backend \
  --region sa-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES

# Criar repositório para frontend
aws ecr create-repository \
  --repository-name chatgot-frontend \
  --region sa-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES

# Obter Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"
```

## 🐳 Passo 5: Build e Push de Imagens Docker

```bash
# Clonar repositório
git clone https://github.com/keday49c/chatgotadeployB.git
cd chatgotadeployB

# Configurar variáveis
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="sa-east-1"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Login no ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build backend
docker build -f Dockerfile.backend -t $ECR_REGISTRY/chatgot-backend:latest .
docker push $ECR_REGISTRY/chatgot-backend:latest

# Build frontend
docker build -f Dockerfile.frontend -t $ECR_REGISTRY/chatgot-frontend:latest .
docker push $ECR_REGISTRY/chatgot-frontend:latest
```

## 🎯 Passo 6: Criar ECS Cluster

```bash
# Criar cluster
aws ecs create-cluster \
  --cluster-name chatgot-cluster \
  --region sa-east-1

# Criar CloudWatch log groups
aws logs create-log-group \
  --log-group-name /ecs/chatgot-backend \
  --region sa-east-1

aws logs create-log-group \
  --log-group-name /ecs/chatgot-frontend \
  --region sa-east-1
```

## 📋 Passo 7: Registrar Task Definition

```bash
# Atualizar ACCOUNT_ID no ecs-task-definition.json
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" ecs-task-definition.json

# Registrar task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region sa-east-1
```

## 🔗 Passo 8: Criar ALB e Target Groups

```bash
# Criar security group para ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name chatgot-alb-sg \
  --description "Security group for ChatGot ALB" \
  --vpc-id vpc-xxxxxxxx \
  --region sa-east-1 \
  --query 'GroupId' \
  --output text)

# Permitir HTTP e HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region sa-east-1

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 \
  --region sa-east-1

# Criar ALB
ALB=$(aws elbv2 create-load-balancer \
  --name chatgot-alb \
  --subnets subnet-xxxxxxxx subnet-xxxxxxxx \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --region sa-east-1 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Criar target group
TG=$(aws elbv2 create-target-group \
  --name chatgot-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxxxxx \
  --target-type ip \
  --region sa-east-1 \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Criar listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG \
  --region sa-east-1
```

## 🚀 Passo 9: Criar ECS Service

```bash
# Criar service
aws ecs create-service \
  --cluster chatgot-cluster \
  --service-name chatgot-service \
  --task-definition chatgot-app:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx,subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TG,containerName=chatgot-frontend,containerPort=80 \
  --region sa-east-1
```

## 🌐 Passo 10: Configurar Domínio

```bash
# Obter DNS do ALB
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names chatgot-alb \
  --region sa-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Criar record Route 53 (CNAME)
# Apontar chatgot.com.br para $ALB_DNS
```

## 🔒 Passo 11: Configurar SSL/TLS

```bash
# Solicitar certificado ACM
aws acm request-certificate \
  --domain-name chatgot.com.br \
  --subject-alternative-names "*.chatgot.com.br" \
  --validation-method DNS \
  --region sa-east-1

# Validar certificado (seguir instruções de DNS)
# Depois criar listener HTTPS no ALB
```

## ✅ Passo 12: Verificar Deployment

```bash
# Verificar status do service
aws ecs describe-services \
  --cluster chatgot-cluster \
  --services chatgot-service \
  --region sa-east-1

# Verificar tasks
aws ecs list-tasks \
  --cluster chatgot-cluster \
  --region sa-east-1

# Verificar logs
aws logs tail /ecs/chatgot-backend --follow --region sa-east-1

# Testar aplicação
curl https://chatgot.com.br/api/health
```

## 🔄 Atualizações Futuras

Para atualizar a aplicação:

```bash
# 1. Fazer push para main branch
git push origin main

# 2. GitHub Actions dispara automaticamente
# 3. Verificar deployment
aws ecs describe-services \
  --cluster chatgot-cluster \
  --services chatgot-service \
  --region sa-east-1
```

## 📊 Monitoramento

```bash
# CloudWatch Metrics
aws cloudwatch list-metrics \
  --namespace AWS/ECS \
  --region sa-east-1

# CloudWatch Logs
aws logs describe-log-groups --region sa-east-1
aws logs tail /ecs/chatgot-backend --follow --region sa-east-1
```

## 🐛 Troubleshooting

### Erro: "Task failed to start"
```bash
# Verificar logs
aws ecs describe-tasks \
  --cluster chatgot-cluster \
  --tasks <task-arn> \
  --region sa-east-1

# Verificar security groups
aws ec2 describe-security-groups --region sa-east-1
```

### Erro: "Cannot pull image"
```bash
# Verificar ECR
aws ecr describe-repositories --region sa-east-1

# Verificar credenciais IAM
aws iam get-role --role-name ecsTaskExecutionRole
```

### Erro: "Database connection failed"
```bash
# Verificar RDS
aws rds describe-db-instances \
  --db-instance-identifier chatgot-db \
  --region sa-east-1

# Verificar security group
aws ec2 describe-security-groups --region sa-east-1
```

## 📞 Suporte

Para mais informações:
- Documentação AWS: https://docs.aws.amazon.com/
- README.md do projeto
- CloudWatch Logs para diagnóstico

---

**Desenvolvido com ❤️ para ChatGot**
