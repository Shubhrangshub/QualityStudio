# QualityStudio - Quality Management System

A comprehensive Quality Management System (QMS) for manufacturing, featuring defect tracking, AI-powered root cause analysis, CAPA workflow management, and real-time notifications.

## 📋 Overview

QualityStudio is a full-stack QMS application built with React (frontend) and FastAPI (backend), using MongoDB for data storage. It provides:

- **Customer Complaint Management** - Track and manage customer complaints with full QFIR workflow
- **Defect Tracking** - Comprehensive defect intake and management system
- **Root Cause Analysis (RCA)** - AI-powered RCA with Ishikawa diagrams and 5 Whys
- **CAPA Workflow** - Corrective and Preventive Action planning and tracking
- **Process Monitoring** - Manufacturing/process execution tracking and analysis
- **Golden Batch** - Reference standard batch management and comparison
- **SOP Library** - Standard Operating Procedures management
- **Design of Experiments (DoE)** - Process optimization experiments
- **Knowledge Base** - Searchable documentation and knowledge management
- **Real-time Notifications** - WebSocket-based live alerts
- **Export Reports** - PDF and Excel export for all data
- **Full Traceability** - Complaint → QFIR → Defect → RCA → CAPA chain

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose (recommended)
- OR Node.js 18+, Python 3.11+, MongoDB 7.0+

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd qualitystudio

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:80
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Option 2: Manual Installation

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL and other settings

# Start the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend Setup
```bash
# From root directory
yarn install
# or: npm install

# Start development server
yarn dev
# or: npm run dev
```

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=quality_studio

# Security
SECRET_KEY=your-secure-secret-key

# AI Service (OpenAI GPT-5.2)
EMERGENT_LLM_KEY=your-emergent-llm-key

# Email Notifications (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@qualitystudio.com
```

**Frontend (`.env`):**
```env
VITE_API_BASE_URL=http://localhost:8001/api
```

## 📁 Project Structure

```
qualitystudio/
├── backend/
│   ├── auth/               # Authentication services
│   ├── services/           # Business logic services
│   │   ├── ai_service.py   # AI-powered analysis (GPT-5.2)
│   │   ├── export_service.py    # PDF/Excel generation
│   │   ├── email_service.py     # Email notifications
│   │   ├── websocket_service.py # Real-time notifications
│   │   └── file_upload_service.py
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
├── src/
│   ├── api/                # API client
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn UI components
│   │   ├── ExportButton.jsx
│   │   └── NotificationBell.jsx
│   ├── pages/              # Application pages
│   ├── styles/             # CSS styles
│   ├── App.jsx             # Main application
│   └── Layout.jsx          # Navigation layout
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Frontend container
├── nginx.conf              # Nginx configuration
└── README.md
```

## 🔐 Authentication

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | shubhrangshub@gmail.com | admin123 |
| Admin | admin@qualitystudio.com | admin123 |
| Inspector | inspector@qualitystudio.com | inspector123 |
| Engineer | engineer@qualitystudio.com | engineer123 |
| Sales | sales@qualitystudio.com | sales123 |
| Operator | operator@qualitystudio.com | operator123 |

### Role-Based Access

- **Admin** - Full system access
- **Quality Inspector** - Defect reporting, inspections
- **Quality Engineer** - RCA, CAPA, process optimization
- **Sales** - Customer complaints, quality metrics view
- **Operator** - Production defect reporting, process logging

## 🎯 Key Features

### Dashboard
- Real-time KPIs (Cpk, First Pass Yield, Defect PPM)
- Alert widgets for critical issues
- Workflow overview cards

### AI-Powered Analysis
- GPT-5.2 powered RCA suggestions
- Automated defect classification
- CAPA action generation
- Trend prediction

### Export & Reporting
- PDF reports (defects, complaints, KPIs)
- Excel spreadsheets with multiple sheets
- Full data export

### Real-time Notifications
- WebSocket-based live alerts
- Critical defect notifications
- CAPA overdue alerts

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user

### Data Management
- `/api/customer_complaints` - CRUD
- `/api/defect_tickets` - CRUD
- `/api/rca_records` - CRUD
- `/api/capa_plans` - CRUD
- `/api/process_runs` - CRUD
- `/api/sops` - CRUD
- `/api/kpis` - CRUD

### AI Services
- `POST /api/ai/rca-suggestions` - Get RCA suggestions
- `POST /api/ai/classify-defect` - Classify defects
- `POST /api/ai/generate-capa` - Generate CAPA actions

### Export
- `GET /api/export/defects/pdf` - Defects PDF
- `GET /api/export/defects/excel` - Defects Excel
- `GET /api/export/full/excel` - Full data export

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/list` - List files

### WebSocket
- `WS /ws/notifications` - Real-time notifications

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS + Shadcn UI
- React Router v7
- TanStack Query
- Recharts

### Backend
- FastAPI (Python)
- Motor (async MongoDB driver)
- JWT Authentication
- OpenAI GPT-5.2 (via Emergent LLM)
- ReportLab (PDF) + OpenPyXL (Excel)

### Infrastructure
- MongoDB 7.0
- Docker + Docker Compose
- Nginx (production)

## 🏗️ Production Deployment

### Using Docker Compose

```bash
# Production build
docker-compose -f docker-compose.yml up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Build frontend: `yarn build`
2. Serve `dist/` with Nginx or similar
3. Run backend with Gunicorn/Uvicorn
4. Configure reverse proxy

## 🐛 Troubleshooting

### Cannot connect to MongoDB
- Verify MongoDB is running
- Check `MONGO_URL` in backend/.env
- Ensure network connectivity

### AI features not working
- Verify `EMERGENT_LLM_KEY` is set
- Check backend logs for API errors

### WebSocket disconnecting
- Check firewall settings
- Verify WebSocket proxy configuration

## 📄 License

Proprietary - All rights reserved

---

**Built for Quality Excellence**
