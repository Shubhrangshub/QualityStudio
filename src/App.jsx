import { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { pagesConfig } from './pages.config';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

// Initialize demo users in localStorage if not exists
const initializeDemoUsers = () => {
  const stored = localStorage.getItem('qualitystudio_users');
  if (!stored) {
    const demoUsers = {
      'shubhrangshub@gmail.com': { 
        email: 'shubhrangshub@gmail.com',
        password: 'admin123', 
        name: 'Shubhrangshu', 
        role: 'admin' 
      },
      'admin@qualitystudio.com': { 
        email: 'admin@qualitystudio.com',
        password: 'admin123', 
        name: 'Admin User', 
        role: 'admin' 
      },
      'engineer@qualitystudio.com': { 
        email: 'engineer@qualitystudio.com',
        password: 'engineer123', 
        name: 'Quality Engineer', 
        role: 'quality_engineer' 
      },
      'inspector@qualitystudio.com': { 
        email: 'inspector@qualitystudio.com',
        password: 'inspector123', 
        name: 'Quality Inspector', 
        role: 'quality_inspector' 
      },
      'sales@qualitystudio.com': { 
        email: 'sales@qualitystudio.com',
        password: 'sales123', 
        name: 'Sales Representative', 
        role: 'sales' 
      },
      'operator@qualitystudio.com': { 
        email: 'operator@qualitystudio.com',
        password: 'operator123', 
        name: 'Production Operator', 
        role: 'operator' 
      }
    };
    localStorage.setItem('qualitystudio_users', JSON.stringify(demoUsers));
  }
};

// Auth Context
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDemoUsers();
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('current_user');
      }
    }
    setLoading(false);
  }, []);

  const signup = (email, password, fullName, role = 'operator') => {
    const users = JSON.parse(localStorage.getItem('qualitystudio_users') || '{}');
    
    if (users[email]) {
      return { success: false, error: 'Email already exists' };
    }

    users[email] = {
      email,
      password,
      name: fullName,
      role
    };
    
    localStorage.setItem('qualitystudio_users', JSON.stringify(users));
    
    const userData = {
      id: `user_${email.split('@')[0]}`,
      email,
      name: fullName,
      role,
      is_active: true
    };
    
    setUser(userData);
    localStorage.setItem('current_user', JSON.stringify(userData));
    return { success: true, user: userData };
  };

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('qualitystudio_users') || '{}');
    const storedUser = users[email];
    
    if (storedUser && storedUser.password === password) {
      const userData = {
        id: `user_${email.split('@')[0]}`,
        email: storedUser.email,
        name: storedUser.name,
        role: storedUser.role,
        is_active: true
      };
      setUser(userData);
      localStorage.setItem('current_user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Login/Signup Component
function AuthPage() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignup) {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        setLoading(false);
        return;
      }
      const result = signup(email, password, fullName.trim());
      if (!result.success) {
        setError(result.error);
      }
    } else {
      const result = login(email, password);
      if (!result.success) {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const quickLogin = (userEmail, pwd) => {
    setEmail(userEmail);
    setPassword(pwd);
    setTimeout(() => {
      const result = login(userEmail, pwd);
      if (!result.success) {
        setError(result.error);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Quality Studio
          </h2>
          <p className="text-sm text-gray-600">
            Enterprise Quality Management System
          </p>
        </div>
        
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setIsSignup(false)}
            className={`flex-1 pb-3 text-sm font-medium transition ${
              !isSignup 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignup(true)}
            className={`flex-1 pb-3 text-sm font-medium transition ${
              isSignup 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>
        
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {isSignup && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Enter your full name"
              />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isSignup ? 'Creating Account...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {!isSignup && (
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Quick Login (Demo)</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => quickLogin('shubhrangshub@gmail.com', 'admin123')}
                className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
              >
                👑 Shubhrangshu
              </button>
              <button
                onClick={() => quickLogin('admin@qualitystudio.com', 'admin123')}
                className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
              >
                🔑 Admin
              </button>
              <button
                onClick={() => quickLogin('engineer@qualitystudio.com', 'engineer123')}
                className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
              >
                ⚙️ Engineer
              </button>
              <button
                onClick={() => quickLogin('inspector@qualitystudio.com', 'inspector123')}
                className="px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition text-sm font-medium"
              >
                🔍 Inspector
              </button>
              <button
                onClick={() => quickLogin('sales@qualitystudio.com', 'sales123')}
                className="px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition text-sm font-medium"
              >
                💼 Sales
              </button>
              <button
                onClick={() => quickLogin('operator@qualitystudio.com', 'operator123')}
                className="px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
              >
                🏭 Operator
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Layout wrapper
const LayoutWrapper = ({ children, currentPageName }) => {
  if (Layout) {
    return (
      <Layout currentPageName={currentPageName}>
        {children}
      </Layout>
    );
  }
  
  return <>{children}</>;
};

// Protected App Component
function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Quality Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ProtectedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
