# ChatGot Reconstruction - TODO

## Fase 1: Análise e Planeamento
- [ ] Análise de requisitos completa
- [ ] Planeamento da arquitetura (backend, frontend, infraestrutura)
- [ ] Definição do esquema de base de dados

## Fase 2: Configuração da Base de Dados
- [ ] Criar tabela `users` (utilizadores com chave de acesso)
- [ ] Criar tabela `conversations` (conversas do utilizador)
- [ ] Criar tabela `messages` (mensagens de chat)
- [ ] Criar tabela `attachments` (ficheiros anexados)
- [ ] Criar tabela `plans` (planos de subscrição)
- [ ] Criar tabela `subscriptions` (subscrições ativas)
- [ ] Criar tabela `usage` (contagem de mensagens por utilizador)
- [ ] Criar tabela `invoices` (faturas Stripe)
- [ ] Criar tabela `audit_logs` (auditoria de ações)
- [ ] Criar tabela `admin_alerts` (alertas ao administrador)
- [ ] Criar tabela `stripe_events` (eventos Stripe processados)
- [ ] Executar migrations na base de dados

## Fase 3: Autenticação e Segurança
- [ ] Implementar autenticação por chave de acesso única
- [ ] Configurar gestão de sessões com cookies seguros
- [ ] Integrar Cloudflare Turnstile CAPTCHA
- [ ] Implementar proteção CSRF
- [ ] Configurar rate limiting

## Fase 4: Integração OpenAI e Upload de Ficheiros
- [ ] Integrar SDK OpenAI com streaming de respostas
- [ ] Implementar endpoint de upload de ficheiros
- [ ] Configurar armazenamento seguro (S3)
- [ ] Gerar URLs assinadas para ficheiros
- [ ] Implementar validação de tipos de ficheiros

## Fase 5: Sistema de Limites e Pagamentos
- [ ] Implementar sistema de contagem de mensagens
- [ ] Configurar planos (gratuito, pago)
- [ ] Integrar Stripe API para checkout
- [ ] Implementar cobrança por excedente (R$0,15 por mensagem)
- [ ] Configurar webhooks Stripe para eventos de pagamento
- [ ] Implementar lógica de renovação de limites

## Fase 6: Interface de Chat React
- [ ] Criar layout principal com sidebar
- [ ] Implementar lista de conversas na sidebar
- [ ] Criar área de mensagens com histórico
- [ ] Implementar renderização de markdown
- [ ] Criar campo de entrada de mensagens
- [ ] Implementar upload de ficheiros na interface
- [ ] Adicionar indicador de carregamento durante streaming

## Fase 7: Painel Administrativo
- [ ] Criar página de dashboard com métricas
- [ ] Implementar gráficos de uso (mensagens, utilizadores)
- [ ] Criar tabela de auditoria de mensagens
- [ ] Implementar gestão de utilizadores (listar, editar, desativar)
- [ ] Criar visualização de faturas e pagamentos
- [ ] Implementar filtros e busca

## Fase 8: Alertas Automáticos
- [ ] Implementar notificação de novo registo
- [ ] Implementar notificação de pagamento processado
- [ ] Implementar notificação de erro crítico
- [ ] Configurar envio de alertas ao administrador

## Fase 9: Repositório GitHub
- [ ] Criar repositório GitHub "chatgotadeployB"
- [ ] Fazer commit do código completo
- [ ] Fazer push para o repositório remoto
- [ ] Configurar branch main como padrão

## Fase 10: Infraestrutura AWS
- [ ] Criar Dockerfile para backend
- [ ] Criar Dockerfile para frontend
- [ ] Criar docker-compose.yml para desenvolvimento local
- [ ] Configurar ECS Task Definition
- [ ] Configurar RDS PostgreSQL
- [ ] Configurar Application Load Balancer
- [ ] Configurar Security Groups
- [ ] Criar pipeline CI/CD GitHub Actions

## Fase 11: Documentação
- [ ] Criar README.md com instruções de setup
- [ ] Criar .env.example com todas as variáveis
- [ ] Documentar API endpoints
- [ ] Criar guia de deployment
- [ ] Criar resumo de entrega

## Fase 12: Deploy e Validação
- [ ] Fazer deploy na AWS (ECS Fargate)
- [ ] Configurar domínio chatgot.com.br
- [ ] Validar funcionamento do sistema
- [ ] Testar fluxo completo de chat
- [ ] Testar pagamentos Stripe
- [ ] Testar painel administrativo
- [ ] Documentar problemas encontrados e soluções

## Requisitos AWS
- Domínio: chatgot.com.br (já configurado)
- Região: sa-east-1 (São Paulo)
- Serviços: ECS Fargate, RDS PostgreSQL, ALB, S3, CloudFront
- CI/CD: GitHub Actions para deploy automático
- Sem dependência de Manus - tudo rodando independentemente
