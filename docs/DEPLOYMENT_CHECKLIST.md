# QualityStudio - Cloud Deployment Checklist

## Pre-Deployment Requirements

### From Development Team (Already Done ✅)
- [x] Dockerfiles for frontend and backend
- [x] docker-compose.yml for local testing
- [x] nginx.conf for frontend routing
- [x] Environment variable templates (.env.example)
- [x] Health check endpoints (/api/health)
- [x] Deployment documentation

### Client DevOps Team Needs to Provide
- [ ] Cloud account (AWS/Azure) with admin access
- [ ] Domain name for the application
- [ ] SSL certificate or ability to provision one
- [ ] SMTP credentials for email notifications (optional)
- [ ] MongoDB Atlas account OR preference for managed DB

---

## Deployment Checklist

### 1. Infrastructure Setup
- [ ] Create cloud resource group/VPC
- [ ] Set up container registry (ECR/ACR)
- [ ] Configure networking (subnets, security groups)
- [ ] Set up secrets management (Secrets Manager/Key Vault)

### 2. Database Setup
- [ ] Create MongoDB cluster (Atlas or managed service)
- [ ] Configure network access/VPC peering
- [ ] Create database user with appropriate permissions
- [ ] Import existing data (if migrating)
- [ ] Store connection string in secrets manager

### 3. Container Deployment
- [ ] Build and push Docker images to registry
- [ ] Create container orchestration (ECS/AKS/Container Apps)
- [ ] Configure environment variables and secrets
- [ ] Set up health checks and auto-scaling
- [ ] Configure load balancer

### 4. Networking & Security
- [ ] Configure DNS (Route 53/Azure DNS)
- [ ] Set up SSL/TLS certificates (ACM/App Service)
- [ ] Configure CDN (CloudFront/Front Door) - optional
- [ ] Set up WAF rules - optional
- [ ] Enable HTTPS redirect

### 5. Storage
- [ ] Create blob/S3 storage for file uploads
- [ ] Configure CORS for storage
- [ ] Update backend with storage credentials

### 6. Monitoring & Logging
- [ ] Set up log aggregation (CloudWatch/Azure Monitor)
- [ ] Configure alerting for critical metrics
- [ ] Set up application performance monitoring

### 7. CI/CD Pipeline
- [ ] Configure GitHub Actions or Azure DevOps
- [ ] Set up automated builds on push to main
- [ ] Configure deployment approvals for production

### 8. Final Verification
- [ ] Test all API endpoints
- [ ] Verify authentication flow
- [ ] Test file uploads
- [ ] Verify AI features working
- [ ] Test WebSocket notifications
- [ ] Verify export functionality
- [ ] Load testing (optional)

---

## Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| MONGO_URL | MongoDB connection string | mongodb+srv://user:pass@cluster.mongodb.net |
| DB_NAME | Database name | quality_studio |
| SECRET_KEY | JWT signing key | random-32-char-string |
| EMERGENT_LLM_KEY | AI service API key | sk-emergent-xxx |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| SMTP_HOST | Email server | smtp.gmail.com |
| SMTP_PORT | Email port | 587 |
| SMTP_USER | Email username | - |
| SMTP_PASSWORD | Email password | - |
| EMAIL_FROM | Sender email | noreply@qualitystudio.com |
| UPLOAD_DIR | File upload path | /app/uploads |
| MAX_FILE_SIZE | Max upload size | 52428800 (50MB) |

---

## Estimated Cloud Costs

### AWS (ECS + MongoDB Atlas)
| Service | Monthly Cost |
|---------|-------------|
| ECS Fargate (2 tasks) | ~$30 |
| ALB | ~$20 |
| MongoDB Atlas M10 | ~$60 |
| S3 (10GB) | ~$1 |
| CloudWatch | ~$10 |
| **Total** | **~$120** |

### Azure (Container Apps + Cosmos DB)
| Service | Monthly Cost |
|---------|-------------|
| Container Apps (2 apps) | ~$40 |
| Cosmos DB Serverless | ~$25 |
| Blob Storage (10GB) | ~$1 |
| Key Vault | ~$3 |
| Monitor | ~$5 |
| **Total** | **~$75** |

---

## Support Contacts

- **Application Issues**: Contact development team
- **AWS Support**: https://aws.amazon.com/support
- **Azure Support**: https://azure.microsoft.com/support
- **MongoDB Atlas**: https://www.mongodb.com/support

---

## Documentation Files

- `/docs/DEPLOY_AWS.md` - Detailed AWS deployment guide
- `/docs/DEPLOY_AZURE.md` - Detailed Azure deployment guide
- `/README.md` - Application overview and local setup
- `/backend/.env.example` - Backend environment template
