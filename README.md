# Quality Studio - RCA/CAPA Workflow Application

An end-to-end quality management application for window film and PPF lamination, featuring defect tracking, AI-powered root cause analysis, experiment design, and SOP generation.

## 📋 Overview

Quality Studio is a comprehensive Quality Management System (QMS) built with React and powered by Base44. It provides:

- **Customer Complaint Management** - Track and manage customer complaints with full workflow
- **Defect Tracking** - Comprehensive defect intake and management system
- **Root Cause Analysis (RCA)** - AI-powered RCA with Ishikawa diagrams and 5 Whys
- **CAPA Workflow** - Corrective and Preventive Action planning and tracking
- **Process Monitoring** - Manufacturing/process execution tracking and analysis
- **Golden Batch** - Reference standard batch management and comparison
- **SOP Library** - Standard Operating Procedures management
- **Design of Experiments (DoE)** - Process optimization experiments
- **Knowledge Base** - Searchable documentation and knowledge management
- **Equipment Tracking** - Equipment management and maintenance
- **Traceability** - Full traceability from complaint → defect → RCA → CAPA

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Base44 account and App ID
- Git

### Installation

1. **Clone or extract the repository**
   ```bash
   cd quality-studio
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure Base44 credentials**
   
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Base44 credentials:
   ```env
   VITE_BASE44_APP_ID=your-app-id-from-base44
   VITE_BASE44_BACKEND_URL=https://api.base44.com
   ```
   
   **To get your Base44 App ID:**
   - Log in to your Base44 dashboard
   - Navigate to your Quality Studio app
   - Find the App ID in the app settings

4. **Start the development server**
   ```bash
   yarn dev
   # or
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

## 🏗️ Production Deployment

### Build for Production

```bash
yarn build
# or
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Your Cloud

The application can be deployed to any static hosting service:

#### Option 1: Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option 3: AWS S3 + CloudFront
```bash
# Build the app
yarn build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### Option 4: Docker
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables for Production

Make sure to set these environment variables in your hosting platform:

- `VITE_BASE44_APP_ID` - Your Base44 App ID
- `VITE_BASE44_BACKEND_URL` - Base44 API URL (https://api.base44.com)

## 📁 Project Structure

```
quality-studio/
├── src/
│   ├── api/              # Base44 client configuration
│   ├── assets/           # Images, icons, static files
│   ├── components/       # Reusable React components
│   │   ├── ui/          # UI components (buttons, cards, etc.)
│   │   ├── dashboard/   # Dashboard-specific components
│   │   ├── defect/      # Defect tracking components
│   │   ├── capa/        # CAPA workflow components
│   │   ├── rca/         # RCA analysis components
│   │   ├── qfir/        # QFIR form components
│   │   ├── admin/       # Admin panel components
│   │   └── ...          # Other feature components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries and helpers
│   ├── pages/           # Application pages
│   ├── utils/           # Utility functions
│   ├── App.jsx          # Main application component
│   ├── Layout.jsx       # Application layout wrapper
│   ├── main.jsx         # Application entry point
│   └── pages.config.js  # Pages configuration
├── public/              # Public static assets
├── .env                 # Environment variables (not committed)
├── .env.example         # Example environment variables
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── README.md           # This file
```

## 🔧 Configuration

### Base44 Integration

This application uses the Base44 SDK for backend functionality. The configuration is in:
- `src/api/base44Client.js` - Base44 client initialization
- `src/lib/app-params.js` - App parameter management
- `src/lib/entities.js` - Database entity definitions

### Customization

To customize the application:

1. **Branding**: Edit `index.html` to update the title and favicon
2. **Styling**: Modify `src/index.css` and Tailwind configuration in `tailwind.config.js`
3. **Pages**: Add/remove pages in `src/pages.config.js`
4. **Components**: Customize components in `src/components/`

## 🎯 Key Features

### 1. Dashboard
- Real-time quality metrics and KPIs
- Defect Pareto charts
- Process run statistics
- CAPA tracking
- Pending QFIR alerts

### 2. Defect Management
- Multi-step defect intake with images
- AI-powered defect classification
- Severity and root cause tracking
- Link defects to customer complaints

### 3. Root Cause Analysis (RCA)
- Fishbone (Ishikawa) diagrams
- 5 Whys analysis
- AI-powered RCA suggestions
- Hypothesis testing
- Comprehensive RCA reports

### 4. CAPA Workflow
- Corrective and preventive action planning
- Task assignment and tracking
- Effectiveness tracking
- FMEA integration
- PDF export for regulatory compliance

### 5. Process Monitoring
- Process run data upload (CSV/Excel)
- Parameter tracking and analysis
- Golden batch comparison
- SPC capability analysis
- Trend analysis and charts

### 6. Data Management
- Bulk data upload
- Database export
- Traceability views
- Knowledge search

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **UI Components**: Radix UI + Tailwind CSS
- **Routing**: React Router v7
- **State Management**: TanStack Query (React Query)
- **Backend**: Base44 SDK
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animation**: Framer Motion

## 📚 Usage Guide

### For Quality Managers

1. **Monitor Dashboard** - View real-time quality metrics
2. **Review Complaints** - Check pending QFIR forms
3. **Track CAPAs** - Monitor corrective actions
4. **Generate Reports** - Export data for compliance

### For Production Teams

1. **Report Defects** - Use Defect Intake page
2. **Log Process Runs** - Upload process data
3. **Access SOPs** - View standard procedures
4. **Search Knowledge Base** - Find solutions

### For Engineers

1. **Conduct RCA** - Use RCA Studio
2. **Design Experiments** - Use DoE Designer
3. **Analyze Trends** - View SPC charts
4. **Compare Batches** - Golden Batch analysis

## 🔒 Security Notes

- Never commit `.env` file to version control
- Keep Base44 App ID and credentials secure
- Use environment variables for sensitive data
- Enable authentication in Base44 dashboard if needed

## 🐛 Troubleshooting

### Issue: "Cannot connect to Base44"
- Check your `.env` file has correct credentials
- Verify Base44 App ID is correct
- Ensure internet connectivity

### Issue: "Page not found"
- Check routing in `src/pages.config.js`
- Verify all page components exist
- Clear browser cache

### Issue: "Dependencies not installed"
- Run `yarn install` or `npm install`
- Delete `node_modules` and reinstall
- Check Node.js version (16+ required)

## 📞 Support

For Base44-specific issues:
- Base44 Documentation: https://docs.base44.com
- Base44 Support: support@base44.com

For application issues:
- Check GitHub issues
- Contact your development team

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using Base44 Platform**
