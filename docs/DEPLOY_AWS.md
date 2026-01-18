# QualityStudio - AWS Deployment Guide

This guide covers deploying QualityStudio to Amazon Web Services (AWS).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Route 53   │───▶│ CloudFront   │───▶│   ALB/NLB        │  │
│  │   (DNS)      │    │   (CDN)      │    │ (Load Balancer)  │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                    │            │
│         ┌──────────────────────────────────────────┼──────┐     │
│         │                    VPC                   │      │     │
│         │  ┌─────────────────┴─────────────────┐  │      │     │
│         │  │           ECS/EKS Cluster          │  │      │     │
│         │  │  ┌───────────┐    ┌───────────┐   │  │      │     │
│         │  │  │ Frontend  │    │  Backend  │   │  │      │     │
│         │  │  │ Container │    │ Container │   │  │      │     │
│         │  │  └───────────┘    └─────┬─────┘   │  │      │     │
│         │  └─────────────────────────┼─────────┘  │      │     │
│         │                            │            │      │     │
│         │  ┌─────────────────────────▼─────────┐  │      │     │
│         │  │     MongoDB Atlas / DocumentDB    │  │      │     │
│         │  └───────────────────────────────────┘  │      │     │
│         └─────────────────────────────────────────┘      │     │
│                                                          │     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │     │
│  │     S3       │  │  CloudWatch  │  │   Secrets    │   │     │
│  │  (Uploads)   │  │  (Logging)   │  │   Manager    │   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘   │     │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: AWS ECS (Recommended for Simplicity)

#### Step 1: Create ECR Repositories

```bash
# Create repositories for frontend and backend
aws ecr create-repository --repository-name qualitystudio-frontend
aws ecr create-repository --repository-name qualitystudio-backend

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 2: Build and Push Docker Images

```bash
# Build and push backend
cd backend
docker build -t qualitystudio-backend .
docker tag qualitystudio-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-backend:latest

# Build and push frontend
cd ..
docker build -t qualitystudio-frontend .
docker tag qualitystudio-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-frontend:latest
```

#### Step 3: Create ECS Task Definitions

**backend-task-definition.json:**
```json
{
  "family": "qualitystudio-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-backend:latest",
      "portMappings": [
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DB_NAME", "value": "quality_studio"}
      ],
      "secrets": [
        {
          "name": "MONGO_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:qualitystudio/mongo-url"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:qualitystudio/secret-key"
        },
        {
          "name": "EMERGENT_LLM_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:qualitystudio/llm-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/qualitystudio-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Step 4: Create ECS Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name qualitystudio-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://backend-task-definition.json

# Create service
aws ecs create-service \
  --cluster qualitystudio-cluster \
  --service-name qualitystudio-backend \
  --task-definition qualitystudio-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:<account-id>:targetgroup/qualitystudio-backend/xxx,containerName=backend,containerPort=8001"
```

### Option 2: AWS EKS (Kubernetes)

#### Kubernetes Manifests

**k8s/namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: qualitystudio
```

**k8s/backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qualitystudio-backend
  namespace: qualitystudio
spec:
  replicas: 2
  selector:
    matchLabels:
      app: qualitystudio-backend
  template:
    metadata:
      labels:
        app: qualitystudio-backend
    spec:
      containers:
      - name: backend
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-backend:latest
        ports:
        - containerPort: 8001
        env:
        - name: DB_NAME
          value: "quality_studio"
        - name: MONGO_URL
          valueFrom:
            secretKeyRef:
              name: qualitystudio-secrets
              key: mongo-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: qualitystudio-secrets
              key: secret-key
        - name: EMERGENT_LLM_KEY
          valueFrom:
            secretKeyRef:
              name: qualitystudio-secrets
              key: llm-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: qualitystudio-backend
  namespace: qualitystudio
spec:
  selector:
    app: qualitystudio-backend
  ports:
  - port: 8001
    targetPort: 8001
  type: ClusterIP
```

**k8s/frontend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qualitystudio-frontend
  namespace: qualitystudio
spec:
  replicas: 2
  selector:
    matchLabels:
      app: qualitystudio-frontend
  template:
    metadata:
      labels:
        app: qualitystudio-frontend
    spec:
      containers:
      - name: frontend
        image: <account-id>.dkr.ecr.us-east-1.amazonaws.com/qualitystudio-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: qualitystudio-frontend
  namespace: qualitystudio
spec:
  selector:
    app: qualitystudio-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

**k8s/ingress.yaml:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: qualitystudio-ingress
  namespace: qualitystudio
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:<account-id>:certificate/xxx
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
  - host: qualitystudio.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: qualitystudio-backend
            port:
              number: 8001
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: qualitystudio-backend
            port:
              number: 8001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: qualitystudio-frontend
            port:
              number: 80
```

## Database Options

### Option A: MongoDB Atlas (Recommended)

1. Create MongoDB Atlas account at https://cloud.mongodb.com
2. Create a new cluster (M10 or higher for production)
3. Configure network access (whitelist AWS VPC CIDR or use VPC Peering)
4. Create database user
5. Get connection string and store in AWS Secrets Manager

### Option B: Amazon DocumentDB (MongoDB-compatible)

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier qualitystudio-db \
  --engine docdb \
  --master-username admin \
  --master-user-password <password> \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name qualitystudio-subnet-group

# Create instance
aws docdb create-db-instance \
  --db-instance-identifier qualitystudio-db-1 \
  --db-instance-class db.r5.large \
  --engine docdb \
  --db-cluster-identifier qualitystudio-db
```

## File Storage (S3)

### Create S3 Bucket for Uploads

```bash
# Create bucket
aws s3 mb s3://qualitystudio-uploads-<account-id>

# Configure CORS
aws s3api put-bucket-cors --bucket qualitystudio-uploads-<account-id> --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://qualitystudio.yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'
```

### Update Backend for S3

Add to backend environment:
```env
AWS_S3_BUCKET=qualitystudio-uploads-<account-id>
AWS_REGION=us-east-1
```

## SSL/TLS Certificates

### Using AWS Certificate Manager (ACM)

```bash
# Request certificate
aws acm request-certificate \
  --domain-name qualitystudio.yourdomain.com \
  --validation-method DNS \
  --subject-alternative-names "*.qualitystudio.yourdomain.com"
```

## CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push backend
      run: |
        docker build -t $ECR_REGISTRY/qualitystudio-backend:${{ github.sha }} ./backend
        docker push $ECR_REGISTRY/qualitystudio-backend:${{ github.sha }}

    - name: Build and push frontend
      run: |
        docker build -t $ECR_REGISTRY/qualitystudio-frontend:${{ github.sha }} .
        docker push $ECR_REGISTRY/qualitystudio-frontend:${{ github.sha }}

    - name: Update ECS service
      run: |
        aws ecs update-service --cluster qualitystudio-cluster --service qualitystudio-backend --force-new-deployment
        aws ecs update-service --cluster qualitystudio-cluster --service qualitystudio-frontend --force-new-deployment
```

## Monitoring & Logging

### CloudWatch Dashboard

```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/qualitystudio-backend
aws logs create-log-group --log-group-name /ecs/qualitystudio-frontend

# Set retention
aws logs put-retention-policy --log-group-name /ecs/qualitystudio-backend --retention-in-days 30
```

### CloudWatch Alarms

```bash
# CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name qualitystudio-backend-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:<account-id>:alerts
```

## Cost Estimation (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| ECS Fargate | 2 tasks, 0.5 vCPU, 1GB | ~$30 |
| ALB | 1 load balancer | ~$20 |
| MongoDB Atlas | M10 cluster | ~$60 |
| S3 | 10GB storage | ~$1 |
| CloudWatch | Logs & metrics | ~$10 |
| **Total** | | **~$120/month** |

## Security Checklist

- [ ] VPC with private subnets for backend
- [ ] Security groups with minimal access
- [ ] Secrets in AWS Secrets Manager
- [ ] SSL/TLS enabled on all endpoints
- [ ] WAF rules on ALB
- [ ] CloudTrail enabled for auditing
- [ ] IAM roles with least privilege
- [ ] Encryption at rest for S3 and database

## Support

For deployment assistance, contact your DevOps team or AWS support.
