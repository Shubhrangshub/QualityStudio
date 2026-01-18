import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  AlertTriangle,
  FlaskConical,
  FileText,
  BarChart3,
  Settings,
  Search,
  ClipboardList,
  GitBranch,
  FileCheck,
  Users,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Upload,
  Sparkles,
  Shield,
  Award,
  Database
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AICopilot from "@/components/AICopilot";

const navigationItems = [
  // === Dashboard ===
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
    roles: ["all"],
    section: "core"
  },
  
  // === Customer & Sales ===
  {
    title: "Log Complaint",
    url: createPageUrl("SalesComplaintLog"),
    icon: FileText,
    roles: ["all"],
    section: "sales"
  },
  {
    title: "QFIR Management",
    url: createPageUrl("QFIRForm"),
    icon: FileCheck,
    roles: ["Quality Lead", "Admin"],
    section: "sales"
  },
  
  // === Core Workflow ===
  {
    title: "Quality Overview",
    url: createPageUrl("QualityOverview"),
    icon: BarChart3,
    roles: ["all"],
    section: "core",
    highlight: true
  },
  {
    title: "① Defect Intake",
    url: createPageUrl("DefectIntake"),
    icon: AlertTriangle,
    roles: ["all"],
    section: "core"
  },
  {
    title: "② RCA Studio",
    url: createPageUrl("RCAStudio"),
    icon: GitBranch,
    roles: ["Shift QC", "Process Engineer", "Quality Lead", "Admin"],
    section: "core"
  },
  {
    title: "③ CAPA Workspace",
    url: createPageUrl("CAPAWorkspace"),
    icon: ClipboardList,
    roles: ["Shift QC", "Process Engineer", "Quality Lead", "Admin"],
    section: "core"
  },
  
  // === Process Excellence Tools ===
  {
    title: "Process Runs",
    url: createPageUrl("ProcessRuns"),
    icon: Database,
    roles: ["all"],
    section: "tools"
  },
  {
    title: "Golden Batch",
    url: createPageUrl("GoldenBatch"),
    icon: Award,
    roles: ["all"],
    section: "tools",
    highlight: true
  },
  {
    title: "SPC & Capability",
    url: createPageUrl("SPCCapability"),
    icon: BarChart3,
    roles: ["all"],
    section: "tools"
  },
  {
    title: "DoE Designer",
    url: createPageUrl("DoEDesigner"),
    icon: FlaskConical,
    roles: ["all"],
    section: "tools"
  },
  {
    title: "SOP Library",
    url: createPageUrl("SOPLibrary"),
    icon: FileText,
    roles: ["all"],
    section: "tools"
  },
  
  // === Data & AI ===
  {
    title: "Data Upload",
    url: createPageUrl("DataUpload"),
    icon: Upload,
    roles: ["all"],
    section: "ai"
  },
  {
    title: "AI Hub",
    url: createPageUrl("AIHub"),
    icon: Sparkles,
    roles: ["all"],
    highlight: true,
    section: "ai"
  },
  {
    title: "Knowledge Search",
    url: createPageUrl("KnowledgeSearch"),
    icon: Search,
    roles: ["all"],
    section: "ai"
  },
  {
    title: "Traceability Viewer",
    url: createPageUrl("TraceabilityViewer"),
    icon: GitBranch,
    roles: ["all"],
    section: "ai",
    highlight: true
  },
  
  // === Admin ===
  {
    title: "User Management",
    url: createPageUrl("Admin"),
    icon: Users,
    roles: ["Admin"],
    section: "admin"
  },
  {
    title: "Role Permissions",
    url: createPageUrl("RolePermissions"),
    icon: Shield,
    roles: ["Admin"],
    section: "admin"
  },
  {
    title: "Database Export",
    url: createPageUrl("DatabaseExport"),
    icon: Database,
    roles: ["Admin"],
    section: "admin"
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [rolePermissions, setRolePermissions] = useState(null);

  useEffect(() => {
    loadUserAndAlerts();
  }, []);

  const loadUserAndAlerts = async () => {
    try {
      // Use localStorage user instead of Base44
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);
      }
      
      // Skip loading alerts for now (would need backend API)
      setAlerts([]);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleLogout = () => {
    // Clear localStorage and reload
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    window.location.reload();
  };

  const userRole = user?.role || "operator";
  
  // Map frontend roles to navigation roles
  const roleMapping = {
    'admin': 'Admin',
    'quality_engineer': 'Process Engineer',
    'quality_inspector': 'Shift QC',
    'sales': 'Sales',
    'operator': 'Operator'
  };
  
  const mappedRole = roleMapping[userRole] || 'Operator';
  
  // Filter navigation based on role permissions
  const filteredNav = navigationItems.filter(item => {
    // Admin always has access to everything
    if (userRole === 'admin') return true;
    
    // Use role-based filtering with mapped roles
    if (item.roles.includes("all")) return true;
    const hasAccess = item.roles.some(role => role === mappedRole);
    return hasAccess;
  });

  // Group navigation by section
  const coreWorkflow = filteredNav.filter(item => item.section === "core");
  const salesSection = filteredNav.filter(item => item.section === "sales");
  const toolsSection = filteredNav.filter(item => item.section === "tools");
  const aiSection = filteredNav.filter(item => item.section === "ai");
  const adminSection = filteredNav.filter(item => item.section === "admin");

  // Show loading state if user not loaded yet
  if (!user) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50 items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690dcbb97a34d8fc04b647f6/756aaa8c1_image.png"
                alt="Quality Logo"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h2 className="font-bold text-gray-900 text-lg">RCA & CAPA Studio</h2>
                <p className="text-xs text-gray-500">Window Films / PPF</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            {/* Customer & Sales Section */}
            {salesSection.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-orange-700 uppercase tracking-wider px-3 py-2 bg-orange-50 rounded">
                  📋 Customer & Sales
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {salesSection.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-orange-50 hover:text-orange-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-orange-50 text-orange-700 font-medium' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Core Quality Workflow */}
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-blue-700 uppercase tracking-wider px-3 py-2 bg-blue-50 rounded">
                🎯 Quality Workflow
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {coreWorkflow.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url || (item.url.includes("#") && location.pathname === item.url.split("#")[0]) ? 'bg-blue-50 text-blue-700 font-medium' : ''
                        } ${item.highlight ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' : ''}`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className={`w-4 h-4 ${item.highlight ? 'text-blue-600' : ''}`} />
                          <span className={item.highlight ? 'font-semibold' : ''}>{item.title}</span>
                          {item.highlight && <Sparkles className="w-3 h-3 text-blue-600 ml-auto" />}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Process Excellence Tools */}
            {toolsSection.length > 0 && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-green-700 uppercase tracking-wider px-3 py-2 bg-green-50 rounded">
                  📊 Process Excellence
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {toolsSection.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-green-50 hover:text-green-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-green-50 text-green-700 font-medium' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* AI & Data Section */}
            {aiSection.length > 0 && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-purple-700 uppercase tracking-wider px-3 py-2 bg-purple-50 rounded">
                  ✨ AI & Knowledge
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {aiSection.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url || (item.url.includes("#") && location.pathname === item.url.split("#")[0]) ? 'bg-purple-50 text-purple-700 font-medium' : ''
                          } ${item.highlight ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200' : ''}`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className={`w-4 h-4 ${item.highlight ? 'text-purple-600' : ''}`} />
                            <span className={item.highlight ? 'font-semibold' : ''}>{item.title}</span>
                            {item.highlight && <Sparkles className="w-3 h-3 text-purple-600 ml-auto" />}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Admin Section */}
            {adminSection.length > 0 && (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-3 py-2 bg-gray-100 rounded">
                  ⚙️ Administration
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminSection.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-gray-100 text-gray-900 font-medium' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Recent Alerts */}
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 flex items-center gap-2">
                <Bell className="w-3 h-3" />
                Recent Alerts
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 space-y-2">
                  {alerts.length > 0 ? (
                    alerts.map((alert, idx) => (
                      <div key={idx} className="text-xs p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="font-medium text-orange-900 line-clamp-2">{alert.defectType?.replace(/_/g, ' ')}</p>
                        <p className="text-orange-600 mt-1">Line {alert.line}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 p-2">No active alerts</p>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Workflow Guide */}
            <SidebarGroup className="mt-4">
              <div className="px-3">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">📋 Quality Process Flow:</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>① Report Defect</p>
                    <p>② Investigate Root Cause</p>
                    <p>③ Create Action Plans</p>
                    <p>④ Monitor & Optimize</p>
                  </div>
                </div>
              </div>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.name?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate capitalize">
                        {user?.role?.replace('_', ' ')}
                        {user?.role === "admin" && " ⭐"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>My Account</div>
                  <div className="text-xs font-normal text-gray-500 mt-1 capitalize">
                    Role: {user?.role?.replace('_', ' ')}
                    {user?.role === "admin" && " (Administrator)"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:hidden">
            <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="text-lg font-semibold text-gray-900">{currentPageName}</h1>
            <div className="w-9" />
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      
      <AICopilot />
    </SidebarProvider>
  );
}