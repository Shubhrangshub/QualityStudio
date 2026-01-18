# Quality Studio - Complete Setup Guide

## 🌐 How to Access Preview

### In Emergent:
1. Look for the **"Preview"** or **"Open Preview"** button in your Emergent interface (usually top-right)
2. Click it to open the application in a new tab
3. The app is running at: **http://localhost:3000**

### If Preview Button Not Visible:
- The application is accessible at port 3000
- Emergent should automatically expose this port
- Try accessing via the preview URL provided by Emergent

### Verify Services Are Running:
```bash
sudo supervisorctl status quality-studio-backend quality-studio-frontend
```

Both should show "RUNNING" status.

---

## 🤖 AI Integration (OpenAI & Anthropic)

### Current Status:
The application code has **placeholder AI calls** that need real API integration.

### Files with AI Calls:
1. **AIHub.jsx** - AI tools interface
2. **RCAStudio.jsx** - AI-powered RCA suggestions
3. **DefectIntake.jsx** - AI defect classification
4. **CAPAWorkspace.jsx** - AI CAPA suggestions
5. Various AI components in `/src/components/ai/`

### How to Implement AI Integration:

#### Option 1: Use Emergent LLM Key (Recommended for MVP)

Since you're on Emergent platform, you can use the **Universal LLM Key**:

1. **Get the Emergent LLM Key:**
```bash
# This key works with OpenAI, Anthropic, and Google models
```

2. **Install Emergent Integrations Library:**
```bash
cd /app
yarn add @emergent/integrations
# or for backend
cd backend
pip install emergent-integrations
```

3. **Use in Code:**
```javascript
import { emergentLLM } from '@emergent/integrations';

// For OpenAI
const response = await emergentLLM.openai.chat({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Analyze defect...' }]
});

// For Anthropic
const response = await emergentLLM.anthropic.messages({
  model: 'claude-3-opus',
  messages: [{ role: 'user', content: 'Suggest CAPA...' }]
});
```

4. **Backend Integration:**
```python
# backend/services/ai_service.py
from emergent_integrations import EmergentLLM

llm = EmergentLLM()

def analyze_defect(defect_description):
    response = llm.openai.chat.completions.create(
        model="gpt-4",
        messages=[{
            "role": "user", 
            "content": f"Analyze this defect: {defect_description}"
        }]
    )
    return response.choices[0].message.content
```

#### Option 2: Direct API Keys (For Production)

1. **Get API Keys:**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/

2. **Add to Environment:**
```env
# backend/.env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

3. **Install SDKs:**
```bash
# Backend
pip install openai anthropic

# Frontend (if needed)
yarn add openai @anthropic-ai/sdk
```

4. **Create AI Service:**
```python
# backend/services/ai_service.py
from openai import OpenAI
from anthropic import Anthropic

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def get_rca_suggestions(defect_data):
    response = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[{
            "role": "system",
            "content": "You are a quality engineering expert."
        }, {
            "role": "user",
            "content": f"Analyze this defect and suggest root causes: {defect_data}"
        }]
    )
    return response.choices[0].message.content
```

5. **Add API Endpoints:**
```python
# backend/server.py
@app.post("/api/ai/rca-suggestions")
async def get_ai_rca_suggestions(defect_data: dict):
    from services.ai_service import get_rca_suggestions
    suggestions = await get_rca_suggestions(defect_data)
    return {"suggestions": suggestions}

@app.post("/api/ai/classify-defect")
async def classify_defect(image_url: str, description: str):
    # Use OpenAI Vision API
    response = openai_client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "Classify this defect:"},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        }]
    )
    return {"classification": response.choices[0].message.content}
```

#### Option 3: Mock AI for Demo (Quick Start)

For immediate preview without AI costs:

```python
# backend/services/ai_service_mock.py
def get_rca_suggestions(defect_data):
    """Mock AI suggestions for demo"""
    return {
        "suggestions": [
            "Material quality issue - Check supplier batch consistency",
            "Process parameter deviation - Review temperature and pressure settings",
            "Equipment calibration - Verify last maintenance date",
            "Operator training - Review SOP compliance"
        ],
        "confidence": 0.85,
        "model": "mock-demo"
    }

def classify_defect(description):
    """Mock defect classification"""
    keywords = {
        "bubble": "bubbles_voids",
        "delamination": "delamination",
        "scratch": "scratches",
        "haze": "haze"
    }
    for keyword, defect_type in keywords.items():
        if keyword in description.lower():
            return {"type": defect_type, "confidence": 0.9}
    return {"type": "unknown", "confidence": 0.5}
```

### Where AI is Used in the App:

1. **Defect Classification** (DefectIntake.jsx)
   - Auto-classify defect type from image/description
   - Suggest severity level

2. **RCA Suggestions** (RCAStudio.jsx)
   - Generate root cause hypotheses
   - Suggest investigation paths
   - Analyze Ishikawa diagram

3. **CAPA Generation** (CAPAWorkspace.jsx)
   - Suggest corrective actions
   - Recommend preventive measures
   - Effectiveness predictions

4. **Knowledge Search** (KnowledgeSearch.jsx)
   - Semantic search in documents
   - Related issue finder

5. **Predictive Maintenance** (AIHub.jsx)
   - Equipment failure prediction
   - Maintenance scheduling

### Implementation Priority:

**For MVP (Quick Demo):**
✅ Use mock AI service (fastest)
✅ Shows UI/UX working
✅ No API costs

**For Client Preview:**
✅ Use Emergent LLM Key
✅ Real AI responses
✅ Included in Emergent

**For Production:**
✅ Direct API keys
✅ Full control
✅ Custom prompts

---

## 📦 Saving to GitHub

### Method 1: Use Emergent's "Save to GitHub" Feature ⭐ (Recommended)

1. **In Emergent Interface:**
   - Look for **"Save to GitHub"** button or option
   - It's usually in the chat input area or top menu
   - Click and follow the prompts

2. **Connect GitHub:**
   - Authorize Emergent to access your GitHub
   - Select or create a repository
   - Push will happen automatically

3. **What Gets Saved:**
   - All source code (/app directory)
   - Configuration files
   - Documentation
   - .gitignore (sensitive files excluded)

### Method 2: Manual Git Push (Alternative)

If you need manual control:

1. **Create GitHub Repository:**
```bash
# On GitHub: Create new repository "quality-studio"
```

2. **Initialize and Push:**
```bash
cd /app

# Initialize git (if not already)
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/quality-studio.git

# Stage all files
git add .

# Commit
git commit -m "Initial commit: Complete Quality Studio application"

# Push
git branch -M main
git push -u origin main
```

### What Should Be in .gitignore:

Already configured in `/app/.gitignore`:
```gitignore
node_modules/
dist/
.env
*.log
__pycache__/
*.pyc
.DS_Store
```

### Repository Structure for Your Team:

```
quality-studio/
├── backend/              # FastAPI backend
│   ├── server.py
│   ├── requirements.txt
│   ├── .env.example
│   └── services/
├── src/                  # React frontend
│   ├── components/
│   ├── pages/
│   └── ...
├── package.json
├── README.md
├── DEPLOYMENT.md
├── docker-compose.yml    # (To be created)
└── .github/
    └── workflows/        # CI/CD (optional)
```

---

## 🚀 Quick Start for Your DevOps Team

### After Cloning from GitHub:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/quality-studio.git
cd quality-studio

# Setup Backend
cd backend
cp .env.example .env
# Edit .env with MongoDB URL
pip install -r requirements.txt

# Setup Frontend
cd ..
cp .env.example .env
# Edit .env with API URL
yarn install

# Start MongoDB
docker run -d -p 27017:27017 mongo:latest

# Run Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 &

# Run Frontend
cd ..
yarn dev

# Access at http://localhost:3000
```

### Production Deployment:

```bash
# Build Frontend
yarn build

# Serve with nginx or any static host
# Backend runs with gunicorn/uvicorn
# MongoDB on managed service (Atlas, AWS DocumentDB, etc.)
```

---

## ✅ Summary for Your Team

### AI Integration:
- **Option 1:** Mock AI (immediate demo) ✅
- **Option 2:** Emergent LLM Key (quick real AI) ✅
- **Option 3:** Direct API keys (production) ✅

### GitHub:
- **Use Emergent's "Save to GitHub"** feature
- Or use manual git commands
- All code is ready to push

### Preview:
- Click **Preview button** in Emergent
- App is at port 3000
- Both backend (8001) and frontend (3000) running

### Next Steps:
1. ✅ Preview the UI now (click Preview)
2. ✅ Decide on AI integration approach
3. ✅ Save to GitHub for your team
4. ✅ DevOps team can deploy from GitHub

---

Need help with any of these steps? Let me know!
