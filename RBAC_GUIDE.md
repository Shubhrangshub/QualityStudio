# Quality Studio - Role-Based Access Control Guide

## 🔐 Role-Based Access Control (RBAC) Implementation

Your Quality Studio application now has **complete role-based access control** with 5 different user roles and granular permissions.

---

## 👥 Available Roles

### 1. **Administrator** (`admin`)
- **Full system access** - can do everything
- Manage users and roles
- System configuration
- Export all data
- Approve SOPs and CAPAs

**Typical Users:**
- IT Administrators
- Quality Managers
- System Administrators

**Demo Login:**
- Email: `admin@qualitystudio.com`
- Password: `admin123`

---

### 2. **Quality Inspector** (`quality_inspector`)
- View all quality data
- Create and edit defects
- Create and edit process runs
- Cannot perform RCA or CAPA
- View-only access to analysis

**Typical Users:**
- QC Inspectors
- Quality Technicians
- Production Inspectors

**Demo Login:**
- Email: `inspector@qualitystudio.com`
- Password: `inspector123`

**Permissions:**
```
✅ View complaints
✅ View, create, edit defects
✅ View RCA (read-only)
✅ View CAPA (read-only)
✅ View, create, edit process runs
✅ View golden batch
✅ View SOPs
✅ View knowledge base
✅ View analytics
```

---

### 3. **Quality Engineer** (`quality_engineer`)
- Full quality workflow access
- Perform RCA and create CAPA
- Create golden batches
- Create and edit SOPs
- Export data

**Typical Users:**
- Quality Engineers
- Process Engineers
- Continuous Improvement Leads

**Demo Login:**
- Email: `engineer@qualitystudio.com`
- Password: `engineer123`

**Permissions:**
```
✅ All Quality Inspector permissions PLUS:
✅ Create and edit RCA
✅ Create and edit CAPA
✅ Create and edit golden batches
✅ Create and edit SOPs
✅ Create and edit knowledge documents
✅ Export data
```

---

### 4. **Sales Representative** (`sales`)
- Log customer complaints
- View quality data
- Limited to customer-facing functions

**Typical Users:**
- Sales Representatives
- Account Managers
- Customer Service

**Demo Login:**
- Email: `sales@qualitystudio.com`
- Password: `sales123`

**Permissions:**
```
✅ View, create, edit complaints
✅ View defects (read-only)
✅ View RCA (read-only)
✅ View CAPA (read-only)
✅ View SOPs
✅ View knowledge base
```

---

### 5. **Production Operator** (`operator`)
- Report defects during production
- Log process runs
- View SOPs and procedures

**Typical Users:**
- Machine Operators
- Production Workers
- Line Supervisors

**Demo Login:**
- Email: `operator@qualitystudio.com`
- Password: `operator123`

**Permissions:**
```
✅ View and create defects
✅ View and create process runs
✅ View golden batch
✅ View SOPs
✅ View knowledge base
```

---

## 🔌 API Endpoints

### Authentication

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@qualitystudio.com",
  "password": "admin123"
}

# Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_admin",
    "email": "admin@qualitystudio.com",
    "name": "Admin User",
    "role": "admin",
    "is_active": true
  }
}
```

**Get Current User:**
```bash
GET /api/auth/me
Authorization: Bearer {access_token}

# Response:
{
  "id": "user_admin",
  "email": "admin@qualitystudio.com",
  "name": "Admin User",
  "role": "admin",
  "is_active": true
}
```

**Get User Permissions:**
```bash
GET /api/auth/permissions
Authorization: Bearer {access_token}

# Response:
{
  "role": "quality_engineer",
  "permissions": [
    "view_defects",
    "create_defects",
    "edit_defects",
    "view_rca",
    "create_rca",
    ...
  ]
}
```

**Get All Roles:**
```bash
GET /api/auth/roles

# Response:
{
  "admin": {
    "title": "Administrator",
    "description": "Full system access",
    "typical_users": ["IT Admin", "Quality Manager"]
  },
  ...
}
```

**Get Demo Users:**
```bash
GET /api/auth/demo-users

# Returns all demo user credentials for testing
```

---

## 💻 Frontend Integration

### 1. Login Component

```jsx
// src/components/Login.jsx
import { useState } from 'react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      // Store token
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/Dashboard';
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password" 
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
```

### 2. Protected Route Component

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredPermission }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  // Check permission if required
  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return <div>Access Denied</div>;
  }
  
  return children;
}
```

### 3. Role-Based UI

```jsx
// Show/hide features based on role
const user = JSON.parse(localStorage.getItem('user') || '{}');

{user.role === 'admin' && (
  <button>Delete</button>
)}

{['admin', 'quality_engineer'].includes(user.role) && (
  <button>Create CAPA</button>
)}

{user.role === 'sales' && (
  <button>Log Complaint</button>
)}
```

---

## 🛠️ How to Add Custom Permissions

### 1. Add New Permission

Edit `/app/backend/auth/permissions.py`:

```python
class Permission(str, Enum):
    # ... existing permissions
    MY_NEW_PERMISSION = "my_new_permission"
```

### 2. Assign to Roles

```python
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.QUALITY_ENGINEER: {
        # ... existing permissions
        Permission.MY_NEW_PERMISSION,
    },
}
```

### 3. Check in API

```python
@app.post("/api/my-endpoint")
async def my_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Get user
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    user_data = get_user_by_id(payload.get("sub"))
    user = User(**user_data)
    
    # Check permission
    if not check_permission(user, Permission.MY_NEW_PERMISSION):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Proceed with operation
    return {"message": "Success"}
```

---

## 📊 Permission Matrix

| Feature | Admin | QE | Inspector | Sales | Operator |
|---------|-------|----|-----------| ------|----------|
| **Customer Complaints** |
| View | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ❌ | ❌ | ✅ | ❌ |
| Edit | ✅ | ❌ | ❌ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Defects** |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ | ✅ |
| Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **RCA** |
| View | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CAPA** |
| View | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Process Runs** |
| View | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ | ✅ |
| Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Golden Batch** |
| View | ✅ | ✅ | ✅ | ❌ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| **SOPs** |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System** |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Config | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 Production Setup

### 1. Change Default Passwords

Edit `/app/backend/auth/auth_service.py` and change all demo passwords or integrate with real database.

### 2. Set Secret Key

```env
# backend/.env
SECRET_KEY=your-very-secret-key-min-32-chars
```

Generate secure key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Enable Database Storage

Instead of `DEMO_USERS` dict, store users in MongoDB:

```python
# Create users collection
users_collection = db["users"]

# Store users
await users_collection.insert_one({
    "email": "admin@company.com",
    "password_hash": pwd_context.hash("secure_password"),
    "role": "admin",
    "is_active": True
})
```

### 4. Token Expiration

Adjust token expiration in `/app/backend/auth/auth_service.py`:

```python
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
# For production: 60 (1 hour) or less
```

---

## 📝 Testing the Authentication

### Test All Demo Users:

```bash
# Admin
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qualitystudio.com","password":"admin123"}'

# Quality Inspector
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"inspector@qualitystudio.com","password":"inspector123"}'

# Quality Engineer
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@qualitystudio.com","password":"engineer123"}'

# Sales
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@qualitystudio.com","password":"sales123"}'

# Operator
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@qualitystudio.com","password":"operator123"}'
```

---

## ✅ Summary

Your Quality Studio now has:
- ✅ 5 pre-configured user roles
- ✅ 40+ granular permissions
- ✅ JWT token authentication
- ✅ Demo users for testing
- ✅ API endpoints for auth
- ✅ Password hashing (bcrypt)
- ✅ Ready for frontend integration

**All demo user credentials are available at:**
```
GET http://localhost:8001/api/auth/demo-users
```
