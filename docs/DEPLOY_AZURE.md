# QualityStudio - Azure Deployment Guide

This guide covers deploying QualityStudio to Microsoft Azure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Azure DNS   │───▶│ Front Door   │───▶│ Application      │  │
│  │              │    │   (CDN)      │    │ Gateway          │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                    │            │
│         ┌──────────────────────────────────────────┼──────┐     │
│         │                   VNet                   │      │     │
│         │  ┌─────────────────┴─────────────────┐  │      │     │
│         │  │     AKS / Container Apps           │  │      │     │
│         │  │  ┌───────────┐    ┌───────────┐   │  │      │     │
│         │  │  │ Frontend  │    │  Backend  │   │  │      │     │
│         │  │  │ Container │    │ Container │   │  │      │     │
│         │  │  └───────────┘    └─────┬─────┘   │  │      │     │
│         │  └─────────────────────────┼─────────┘  │      │     │
│         │                            │            │      │     │
│         │  ┌─────────────────────────▼─────────┐  │      │     │
│         │  │    Cosmos DB (MongoDB API)        │  │      │     │
│         │  └───────────────────────────────────┘  │      │     │
│         └─────────────────────────────────────────┘      │     │
│                                                          │     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │     │
│  │ Blob Storage │  │   Monitor    │  │  Key Vault   │   │     │
│  │  (Uploads)   │  │  (Logging)   │  │  (Secrets)   │   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘   │     │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Azure Container Apps (Recommended for Simplicity)

#### Step 1: Create Resource Group and Container Registry

```bash
# Set variables
RESOURCE_GROUP="qualitystudio-rg"
LOCATION="eastus"
ACR_NAME="qualitystudioacr"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create container registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# Get ACR credentials
az acr credential show --name $ACR_NAME
```

#### Step 2: Build and Push Docker Images

```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push backend
cd backend
az acr build --registry $ACR_NAME --image qualitystudio-backend:latest .

# Build and push frontend
cd ..
az acr build --registry $ACR_NAME --image qualitystudio-frontend:latest .
```

#### Step 3: Create Container Apps Environment

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name qualitystudio-logs

# Get workspace credentials
LOG_ANALYTICS_WORKSPACE_CLIENT_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name qualitystudio-logs \
  --query customerId -o tsv)

LOG_ANALYTICS_WORKSPACE_CLIENT_SECRET=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group $RESOURCE_GROUP \
  --workspace-name qualitystudio-logs \
  --query primarySharedKey -o tsv)

# Create Container Apps environment
az containerapp env create \
  --name qualitystudio-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --logs-workspace-id $LOG_ANALYTICS_WORKSPACE_CLIENT_ID \
  --logs-workspace-key $LOG_ANALYTICS_WORKSPACE_CLIENT_SECRET
```

#### Step 4: Create Key Vault and Secrets

```bash
# Create Key Vault
az keyvault create \
  --name qualitystudio-kv \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Add secrets
az keyvault secret set --vault-name qualitystudio-kv --name mongo-url --value "mongodb+srv://..."
az keyvault secret set --vault-name qualitystudio-kv --name secret-key --value "your-secret-key"
az keyvault secret set --vault-name qualitystudio-kv --name llm-key --value "your-emergent-llm-key"
```

#### Step 5: Deploy Backend Container App

```bash
# Get ACR credentials
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Deploy backend
az containerapp create \
  --name qualitystudio-backend \
  --resource-group $RESOURCE_GROUP \
  --environment qualitystudio-env \
  --image $ACR_NAME.azurecr.io/qualitystudio-backend:latest \
  --target-port 8001 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 5 \
  --env-vars \
    DB_NAME=quality_studio \
    MONGO_URL=secretref:mongo-url \
    SECRET_KEY=secretref:secret-key \
    EMERGENT_LLM_KEY=secretref:llm-key \
  --secrets \
    mongo-url=keyvaultref:https://qualitystudio-kv.vault.azure.net/secrets/mongo-url \
    secret-key=keyvaultref:https://qualitystudio-kv.vault.azure.net/secrets/secret-key \
    llm-key=keyvaultref:https://qualitystudio-kv.vault.azure.net/secrets/llm-key
```

#### Step 6: Deploy Frontend Container App

```bash
# Get backend URL
BACKEND_URL=$(az containerapp show \
  --name qualitystudio-backend \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# Deploy frontend
az containerapp create \
  --name qualitystudio-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment qualitystudio-env \
  --image $ACR_NAME.azurecr.io/qualitystudio-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 1 \
  --max-replicas 3
```

### Option 2: Azure Kubernetes Service (AKS)

#### Step 1: Create AKS Cluster

```bash
# Create AKS cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name qualitystudio-aks \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name qualitystudio-aks
```

#### Step 2: Apply Kubernetes Manifests

**k8s/namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: qualitystudio
```

**k8s/secrets.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: qualitystudio-secrets
  namespace: qualitystudio
type: Opaque
stringData:
  mongo-url: "mongodb+srv://..."
  secret-key: "your-secret-key"
  llm-key: "your-emergent-llm-key"
```

**k8s/backend.yaml:**
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
        image: qualitystudioacr.azurecr.io/qualitystudio-backend:latest
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

**k8s/frontend.yaml:**
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
        image: qualitystudioacr.azurecr.io/qualitystudio-frontend:latest
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
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - qualitystudio.yourdomain.com
    secretName: qualitystudio-tls
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

#### Step 3: Apply Manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## Database Options

### Option A: MongoDB Atlas (Recommended)

1. Create MongoDB Atlas account at https://cloud.mongodb.com
2. Create a new cluster
3. Configure network access (whitelist Azure VNet or use Private Link)
4. Create database user
5. Get connection string and store in Key Vault

### Option B: Azure Cosmos DB (MongoDB API)

```bash
# Create Cosmos DB account with MongoDB API
az cosmosdb create \
  --name qualitystudio-cosmos \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --server-version 4.2 \
  --default-consistency-level Session \
  --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=false

# Create database
az cosmosdb mongodb database create \
  --account-name qualitystudio-cosmos \
  --resource-group $RESOURCE_GROUP \
  --name quality_studio

# Get connection string
az cosmosdb keys list \
  --name qualitystudio-cosmos \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings
```

## File Storage (Blob Storage)

### Create Storage Account

```bash
# Create storage account
az storage account create \
  --name qualitystudiofiles \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for uploads
az storage container create \
  --name uploads \
  --account-name qualitystudiofiles \
  --public-access blob

# Configure CORS
az storage cors add \
  --account-name qualitystudiofiles \
  --services b \
  --methods GET PUT POST DELETE \
  --origins "https://qualitystudio.yourdomain.com" \
  --allowed-headers "*" \
  --exposed-headers "*"
```

## SSL/TLS Certificates

### Using Azure App Service Managed Certificate

```bash
# For Container Apps with custom domain
az containerapp hostname add \
  --name qualitystudio-frontend \
  --resource-group $RESOURCE_GROUP \
  --hostname qualitystudio.yourdomain.com

# Bind certificate
az containerapp hostname bind \
  --name qualitystudio-frontend \
  --resource-group $RESOURCE_GROUP \
  --hostname qualitystudio.yourdomain.com \
  --environment qualitystudio-env \
  --validation-method CNAME
```

## CI/CD Pipeline (Azure DevOps)

**azure-pipelines.yml:**
```yaml
trigger:
  branches:
    include:
    - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  acrName: 'qualitystudioacr'
  resourceGroup: 'qualitystudio-rg'

stages:
- stage: Build
  jobs:
  - job: BuildAndPush
    steps:
    - task: Docker@2
      displayName: 'Build and push backend'
      inputs:
        containerRegistry: 'ACR Connection'
        repository: 'qualitystudio-backend'
        command: 'buildAndPush'
        Dockerfile: 'backend/Dockerfile'
        tags: |
          $(Build.BuildId)
          latest

    - task: Docker@2
      displayName: 'Build and push frontend'
      inputs:
        containerRegistry: 'ACR Connection'
        repository: 'qualitystudio-frontend'
        command: 'buildAndPush'
        Dockerfile: 'Dockerfile'
        tags: |
          $(Build.BuildId)
          latest

- stage: Deploy
  dependsOn: Build
  jobs:
  - deployment: DeployToAzure
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureCLI@2
            displayName: 'Update Container Apps'
            inputs:
              azureSubscription: 'Azure Subscription'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az containerapp update \
                  --name qualitystudio-backend \
                  --resource-group $(resourceGroup) \
                  --image $(acrName).azurecr.io/qualitystudio-backend:$(Build.BuildId)
                
                az containerapp update \
                  --name qualitystudio-frontend \
                  --resource-group $(resourceGroup) \
                  --image $(acrName).azurecr.io/qualitystudio-frontend:$(Build.BuildId)
```

## CI/CD Pipeline (GitHub Actions)

**.github/workflows/azure-deploy.yml:**
```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

env:
  AZURE_CONTAINER_REGISTRY: qualitystudioacr
  RESOURCE_GROUP: qualitystudio-rg

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Build and push to ACR
      run: |
        az acr login --name ${{ env.AZURE_CONTAINER_REGISTRY }}
        
        docker build -t ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-backend:${{ github.sha }} ./backend
        docker push ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-backend:${{ github.sha }}
        
        docker build -t ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-frontend:${{ github.sha }} .
        docker push ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-frontend:${{ github.sha }}

    - name: Deploy to Container Apps
      run: |
        az containerapp update \
          --name qualitystudio-backend \
          --resource-group ${{ env.RESOURCE_GROUP }} \
          --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-backend:${{ github.sha }}
        
        az containerapp update \
          --name qualitystudio-frontend \
          --resource-group ${{ env.RESOURCE_GROUP }} \
          --image ${{ env.AZURE_CONTAINER_REGISTRY }}.azurecr.io/qualitystudio-frontend:${{ github.sha }}
```

## Monitoring & Logging

### Azure Monitor

```bash
# Create Application Insights
az monitor app-insights component create \
  --app qualitystudio-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Create alerts
az monitor metrics alert create \
  --name cpu-alert \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/qualitystudio-backend" \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Insights/actionGroups/alerts"
```

## Cost Estimation (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Container Apps | 2 apps, 0.5 vCPU, 1GB | ~$40 |
| Cosmos DB | Serverless, 1000 RU/s | ~$25 |
| Blob Storage | 10GB | ~$1 |
| Key Vault | Standard | ~$3 |
| Log Analytics | 5GB/month | ~$5 |
| **Total** | | **~$75/month** |

## Security Checklist

- [ ] VNet integration for Container Apps
- [ ] Private endpoints for Cosmos DB
- [ ] Secrets in Key Vault (not environment variables)
- [ ] Managed Identity for service-to-service auth
- [ ] SSL/TLS on all endpoints
- [ ] Azure Front Door with WAF
- [ ] Azure AD authentication (optional)
- [ ] Network Security Groups configured
- [ ] Diagnostic logs enabled

## Support

For deployment assistance, contact your DevOps team or Azure support.
