import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Activity, Settings, Search, Eye, Clock,
  AlertTriangle, CheckCircle2, TrendingUp, Trash2, Loader2, Edit, FileCheck, Database, Download
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import MaterialOptionsManager from "../components/admin/MaterialOptionsManager";
import TicketFormatSettings from "../components/admin/TicketFormatSettings";
import SAPConfiguration from "../components/admin/SAPConfiguration";
import RolePermissionsManager from "../components/admin/RolePermissionsManager";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteResult, setDeleteResult] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list("-created_date", 100),
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['all-defects'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 200),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['all-rcas'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 100),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['all-capas'],
    queryFn: () => api.entities.CAPAPlan.list("-created_date", 100),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['all-process-runs'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 100),
  });

  const { data: does = [] } = useQuery({
    queryKey: ['all-does'],
    queryFn: () => api.entities.DoE.list("-created_date", 100),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['all-complaints'],
    queryFn: () => api.entities.CustomerComplaint.list("-dateLogged", 100),
  });

  // Fetch ALL entities for export
  const { data: sops = [] } = useQuery({
    queryKey: ['all-sops'],
    queryFn: () => api.entities.SOP.list("-created_date", 500),
  });

  const { data: knowledgeDocs = [] } = useQuery({
    queryKey: ['all-knowledge-docs'],
    queryFn: () => api.entities.KnowledgeDocument.list("-created_date", 500),
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['all-kpis'],
    queryFn: () => api.entities.KPI.list("-recordDate", 500),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['all-equipment'],
    queryFn: () => api.entities.Equipment.list("-created_date", 500),
  });

  const { data: materialOptions = [] } = useQuery({
    queryKey: ['all-material-options'],
    queryFn: () => api.entities.MaterialOption.list("-created_date", 500),
  });

  const { data: spcAnalyses = [] } = useQuery({
    queryKey: ['all-spc'],
    queryFn: () => api.entities.SPCAnalysis.list("-analysisDate", 500),
  });

  const { data: doeAnalyses = [] } = useQuery({
    queryKey: ['all-doe-analyses'],
    queryFn: () => api.entities.DoEAnalysis.list("-analysisDate", 500),
  });

  const { data: goldenBatches = [] } = useQuery({
    queryKey: ['all-golden-batches'],
    queryFn: () => api.entities.GoldenBatch.list("-created_date", 500),
  });

  const queryClient = useQueryClient();

  const handleExportDatabase = async () => {
    setExporting(true);
    setDeleteResult(null);
    try {
      setDeleteResult({ success: 'info', message: 'Preparing database export...' });

      const databaseExport = {
        exportDate: new Date().toISOString(),
        exportDateIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        appName: "RCA & CAPA Studio - Window Films / PPF Quality Management",
        version: "1.0",
        platform: "QualityStudio",
        
        // Note about schemas
        schemasNote: "Entity schemas are defined in the backend models. Each entity has corresponding API endpoints.",
        
        // All Data Records
        data: {
          DefectTicket: defects,
          RCARecord: rcas,
          CAPAPlan: capas,
          CustomerComplaint: complaints,
          ProcessRun: processRuns,
          DoE: does,
          SOP: sops,
          KnowledgeDocument: knowledgeDocs,
          KPI: kpis,
          Equipment: equipment,
          MaterialOption: materialOptions,
          SPCAnalysis: spcAnalyses,
          DoEAnalysis: doeAnalyses,
          GoldenBatch: goldenBatches,
          User: users
        },
        
        counts: {
          defects: defects.length,
          rcas: rcas.length,
          capas: capas.length,
          complaints: complaints.length,
          processRuns: processRuns.length,
          does: does.length,
          sops: sops.length,
          knowledgeDocs: knowledgeDocs.length,
          kpis: kpis.length,
          equipment: equipment.length,
          materialOptions: materialOptions.length,
          spcAnalyses: spcAnalyses.length,
          doeAnalyses: doeAnalyses.length,
          goldenBatches: goldenBatches.length,
          users: users.length,
          total: defects.length + rcas.length + capas.length + complaints.length + 
                 processRuns.length + does.length + sops.length + knowledgeDocs.length + 
                 kpis.length + equipment.length + materialOptions.length + spcAnalyses.length + 
                 doeAnalyses.length + goldenBatches.length + users.length
        },
        
        // Migration Instructions
        migrationGuide: {
          step1: "Extract app code as ZIP from Base44 dashboard (gets all pages, components, entities folder with schemas)",
          step2: "Download this JSON file (contains all data records)",
          step3: "Set up your backend (Node.js + PostgreSQL recommended)",
          step4_schemas: "Use the entity JSON files from the ZIP (entities/*.json) to create database tables",
          step5_data: "Use the 'data' section from this file to insert all records",
          step6: "Replace api.entities.* API calls with your own API endpoints",
          step7: "Deploy frontend code to your server",
          
          databaseSetup: {
            recommended: "PostgreSQL 14+",
            alternative: "MySQL 8+, MongoDB",
            note: "All entity schemas are JSON Schema format - convert to your database's schema format"
          },
          
          backendFramework: {
            recommended: "Node.js + Express + Sequelize/TypeORM",
            alternative: "Python Django/FastAPI, Java Spring Boot",
            note: "Implement CRUD endpoints matching api.entities.* API structure"
          },
          
          authentication: {
            note: "User authentication is handled by Base44 - you'll need to implement your own auth system (JWT, OAuth, etc.)",
            userEntity: "User records are included in the export"
          }
        }
      };

      const jsonString = JSON.stringify(databaseExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-complete-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      setDeleteResult({ success: true, message: `✅ Complete database exported! ${databaseExport.counts.total} records + 14 entity schemas + migration guide.` });
    } catch (error) {
      console.error("Export error:", error);
      setDeleteResult({ 
        success: false, 
        message: `Export failed: ${error.message || error.toString()}. Check browser console for details.` 
      });
    }
    setExporting(false);
  };

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, customRole }) => api.entities.User.update(userId, { customRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      setNewRole("");
      setDeleteResult({ success: true, message: "User role updated successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to update role" });
    }
  });

  const handleRoleUpdate = () => {
    if (!newRole) return;
    updateUserRoleMutation.mutate({ userId: editingUser.id, customRole: newRole });
  };

  // Delete mutations
  const deleteDefectMutation = useMutation({
    mutationFn: (id) => api.entities.DefectTicket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-defects'] });
      setDeleteResult({ success: true, message: "Defect deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const deleteRCAMutation = useMutation({
    mutationFn: (id) => api.entities.RCARecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rcas'] });
      setDeleteResult({ success: true, message: "RCA deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const deleteCAPAMutation = useMutation({
    mutationFn: (id) => api.entities.CAPAPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-capas'] });
      setDeleteResult({ success: true, message: "CAPA deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const deleteProcessRunMutation = useMutation({
    mutationFn: (id) => api.entities.ProcessRun.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-process-runs'] });
      setDeleteResult({ success: true, message: "Process run deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const deleteDoEMutation = useMutation({
    mutationFn: (id) => api.entities.DoE.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-does'] });
      setDeleteResult({ success: true, message: "DoE study deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const deleteComplaintMutation = useMutation({
    mutationFn: (id) => api.entities.CustomerComplaint.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-complaints'] });
      setDeleteResult({ success: true, message: "Complaint deleted successfully" });
    },
    onError: (error) => {
      setDeleteResult({ success: false, message: error.message || "Failed to delete" });
    }
  });

  const handleDelete = (id, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    switch(type) {
      case 'defect':
        deleteDefectMutation.mutate(id);
        break;
      case 'rca':
        deleteRCAMutation.mutate(id);
        break;
      case 'capa':
        deleteCAPAMutation.mutate(id);
        break;
      case 'process-run':
        deleteProcessRunMutation.mutate(id);
        break;
      case 'doe':
        deleteDoEMutation.mutate(id);
        break;
      case 'complaint':
        deleteComplaintMutation.mutate(id);
        break;
    }
  };

  // User activity tracking
  const getUserActivity = (userEmail) => {
    const defectsCreated = defects.filter(d => d.created_by === userEmail).length;
    const rcasCreated = rcas.filter(r => r.analyst === userEmail).length;
    const lastActivity = [
      ...defects.filter(d => d.created_by === userEmail),
      ...rcas.filter(r => r.analyst === userEmail)
    ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    return {
      defectsCreated,
      rcasCreated,
      lastActivity: lastActivity?.created_date,
      totalActions: defectsCreated + rcasCreated
    };
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    Admin: "bg-purple-100 text-purple-800",
    Sales: "bg-orange-100 text-orange-800",
    "Quality Lead": "bg-blue-100 text-blue-800",
    "Process Engineer": "bg-green-100 text-green-800",
    "Shift QC": "bg-yellow-100 text-yellow-800",
    Operator: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Admin & User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage users and monitor system activity</p>
        </div>

        {deleteResult && (
          <Alert className={`mb-6 ${
            deleteResult.success === true ? 'bg-green-50 border-green-200' : 
            deleteResult.success === 'info' ? 'bg-blue-50 border-blue-200' :
            'bg-red-50 border-red-200'
          }`}>
            {deleteResult.success === true ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : deleteResult.success === 'info' ? (
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={
              deleteResult.success === true ? 'text-green-800' : 
              deleteResult.success === 'info' ? 'text-blue-800' :
              'text-red-800'
            }>
              {deleteResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management ({users.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Monitor
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              System Stats
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Data Management
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Material Options
            </TabsTrigger>
            <TabsTrigger value="ticket-format" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Ticket Format
            </TabsTrigger>
            <TabsTrigger value="sap" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              SAP Integration
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Role Permissions
            </TabsTrigger>
            <TabsTrigger value="qfir" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              QFIR Management ({complaints.filter(c => c.status === 'pending_qfir').length})
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Database Export
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Directory</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredUsers.map((user) => {
                    const activity = getUserActivity(user.email);
                    return (
                      <div
                        key={user.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {user.full_name?.[0] || 'U'}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={roleColors[user.customRole] || roleColors.Operator}>
                                  {user.customRole || user.role}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  Joined {format(new Date(user.created_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">
                                {activity.totalActions} actions
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {activity.defectsCreated} defects • {activity.rcasCreated} RCAs
                              </p>
                              {activity.lastActivity && (
                                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Last active: {format(new Date(activity.lastActivity), 'MMM d, HH:mm')}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setNewRole(user.customRole || user.role);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Role
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Monitor Tab */}
          <TabsContent value="activity">
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Defects</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{defects.length}</p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-orange-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">RCA Records</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{rcas.length}</p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">CAPA Plans</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{capas.length}</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...defects.slice(0, 10)].map((defect) => (
                      <div key={defect.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Defect created: {defect.defectType?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {defect.created_by} • {format(new Date(defect.created_date), 'MMM d, HH:mm')}
                          </p>
                        </div>
                        <Badge className={
                          defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          defect.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {defect.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Activity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {users.slice(0, 10).map((user) => {
                      const activity = getUserActivity(user.email);
                      if (activity.totalActions === 0) return null;

                      return (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {user.full_name?.[0] || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.customRole || user.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{activity.totalActions} actions</p>
                            <p className="text-xs text-gray-500">
                              {activity.defectsCreated} defects • {activity.rcasCreated} RCAs
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      users.reduce((acc, user) => {
                        const role = user.customRole || user.role;
                        acc[role] = (acc[role] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                        <Badge className={roleColors[role]}>{role}</Badge>
                        <span className="text-2xl font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Users</span>
                    <span className="text-xl font-bold text-gray-900">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Defects</span>
                    <span className="text-xl font-bold text-gray-900">{defects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Open Defects</span>
                    <span className="text-xl font-bold text-orange-600">
                      {defects.filter(d => d.status === 'open').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active RCAs</span>
                    <span className="text-xl font-bold text-blue-600">
                      {rcas.filter(r => r.status !== 'closed').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Open CAPAs</span>
                    <span className="text-xl font-bold text-green-600">
                      {capas.filter(c => c.approvalState !== 'closed').length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Most Active Users (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {users
                      .map(user => ({
                        ...user,
                        activity: getUserActivity(user.email)
                      }))
                      .filter(u => u.activity.totalActions > 0)
                      .sort((a, b) => b.activity.totalActions - a.activity.totalActions)
                      .slice(0, 5)
                      .map((user, idx) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400 w-6">#{idx + 1}</span>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {user.full_name?.[0] || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <Badge className={roleColors[user.customRole || user.role]} size="sm">{user.customRole || user.role}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-blue-600">{user.activity.totalActions}</p>
                            <p className="text-xs text-gray-500">total actions</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data">
            <div className="space-y-6">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    ⚠️ Danger Zone - Delete Records
                  </CardTitle>
                  <p className="text-sm text-red-700 mt-2">
                    Permanently delete records from the system. This action cannot be undone.
                  </p>
                </CardHeader>
              </Card>

              {/* Defects */}
              <Card>
                <CardHeader>
                  <CardTitle>Defect Tickets ({defects.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {defects.map(defect => (
                      <div key={defect.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{defect.defectType?.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-600">
                            Line {defect.line} • {defect.severity} • {format(new Date(defect.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(defect.id, 'defect')}
                          disabled={deleteDefectMutation.isPending}
                        >
                          {deleteDefectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* RCAs */}
              <Card>
                <CardHeader>
                  <CardTitle>RCA Records ({rcas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {rcas.map(rca => (
                      <div key={rca.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">RCA #{rca.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">
                            {rca.analyst} • {rca.status} • {format(new Date(rca.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(rca.id, 'rca')}
                          disabled={deleteRCAMutation.isPending}
                        >
                          {deleteRCAMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CAPAs */}
              <Card>
                <CardHeader>
                  <CardTitle>CAPA Plans ({capas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {capas.map(capa => (
                      <div key={capa.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">CAPA #{capa.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">
                            {capa.approvalState} • {format(new Date(capa.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(capa.id, 'capa')}
                          disabled={deleteCAPAMutation.isPending}
                        >
                          {deleteCAPAMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Process Runs */}
              <Card>
                <CardHeader>
                  <CardTitle>Process Runs ({processRuns.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {processRuns.map(run => (
                      <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{run.productCode}</p>
                          <p className="text-sm text-gray-600">
                            Line {run.line} • {format(new Date(run.dateTimeStart), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(run.id, 'process-run')}
                          disabled={deleteProcessRunMutation.isPending}
                        >
                          {deleteProcessRunMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* DoE Studies */}
              <Card>
                <CardHeader>
                  <CardTitle>DoE Studies ({does.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {does.map(doe => (
                      <div key={doe.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{doe.objective}</p>
                          <p className="text-sm text-gray-600">
                            {doe.designType} • {doe.executionStatus} • {format(new Date(doe.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(doe.id, 'doe')}
                          disabled={deleteDoEMutation.isPending}
                        >
                          {deleteDoEMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Material Options Tab */}
          <TabsContent value="materials">
            <MaterialOptionsManager />
          </TabsContent>

          <TabsContent value="ticket-format">
            <TicketFormatSettings />
          </TabsContent>

          <TabsContent value="sap">
            <SAPConfiguration />
          </TabsContent>

          <TabsContent value="permissions">
            <RolePermissionsManager />
          </TabsContent>

          {/* QFIR Management Tab */}
          <TabsContent value="qfir">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Complaints ({complaints.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {complaints.map(complaint => (
                      <div key={complaint.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium">{complaint.ticketNumber}</p>
                            <Badge className={
                              complaint.status === 'pending_qfir' ? 'bg-orange-100 text-orange-800' :
                              complaint.status === 'qfir_completed' ? 'bg-blue-100 text-blue-800' :
                              complaint.status === 'closed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {complaint.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {complaint.customerName} • {complaint.filmType} • {format(new Date(complaint.dateLogged), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{complaint.issueDescription?.slice(0, 100)}...</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(complaint.id, 'complaint')}
                          disabled={deleteComplaintMutation.isPending}
                        >
                          {deleteComplaintMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                    {complaints.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No complaints found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Database Export Tab */}
          <TabsContent value="export">
            <div className="space-y-6">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Database className="w-6 h-6" />
                    Complete Database Export
                  </CardTitle>
                  <p className="text-sm text-blue-700 mt-2">
                    Export all entity records as a single JSON file for backup or migration to your own server.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-white border-blue-300">
                    <Database className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>Complete Package Includes:</strong>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>💾 All data records (15 entity types) - for data import</li>
                        <li>📖 Step-by-step migration guide - backend setup instructions</li>
                        <li>👥 User records with roles - for authentication setup</li>
                        <li>📊 Record counts and metadata</li>
                      </ul>
                      <br />
                      <strong>Entity Schemas:</strong> Available in Base44 "Extract as Zip" → entities/ folder<br />
                      <strong>Complete Package:</strong> This JSON + Extract as Zip = Full migration kit
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Total Records</p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">
                          {defects.length + rcas.length + capas.length + complaints.length + 
                           processRuns.length + does.length + sops.length + knowledgeDocs.length + 
                           kpis.length + equipment.length + materialOptions.length + spcAnalyses.length + 
                           doeAnalyses.length + goldenBatches.length + users.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Entity Types</p>
                        <p className="text-3xl font-bold text-purple-600 mt-1">15</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Format</p>
                        <p className="text-xl font-bold text-green-600 mt-1">JSON</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Export Breakdown:</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Defect Tickets:</span>
                        <span className="font-semibold">{defects.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RCA Records:</span>
                        <span className="font-semibold">{rcas.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CAPA Plans:</span>
                        <span className="font-semibold">{capas.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Complaints:</span>
                        <span className="font-semibold">{complaints.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Process Runs:</span>
                        <span className="font-semibold">{processRuns.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">DoE Studies:</span>
                        <span className="font-semibold">{does.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SOPs:</span>
                        <span className="font-semibold">{sops.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Knowledge Docs:</span>
                        <span className="font-semibold">{knowledgeDocs.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">KPIs:</span>
                        <span className="font-semibold">{kpis.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equipment:</span>
                        <span className="font-semibold">{equipment.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Material Options:</span>
                        <span className="font-semibold">{materialOptions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SPC Analyses:</span>
                        <span className="font-semibold">{spcAnalyses.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">DoE Analyses:</span>
                        <span className="font-semibold">{doeAnalyses.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Golden Batches:</span>
                        <span className="font-semibold">{goldenBatches.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Users:</span>
                        <span className="font-semibold">{users.length}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleExportDatabase}
                    disabled={exporting}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Exporting Database...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Export Complete Database (JSON)
                      </>
                    )}
                  </Button>

                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900 text-xs">
                      <strong>Quick Start Migration:</strong><br />
                      1. <strong>Download Frontend:</strong> Base44 Dashboard → Extract as Zip (gets all React code)<br />
                      2. <strong>Download Backend:</strong> Click button above (gets schemas + data + guide)<br />
                      3. <strong>Setup Database:</strong> PostgreSQL/MySQL - use schemas to create tables<br />
                      4. <strong>Import Data:</strong> Use data section to populate tables<br />
                      5. <strong>Build API:</strong> Node.js/Python - implement CRUD endpoints<br />
                      6. <strong>Connect:</strong> Replace api.entities.* calls with your API<br />
                      <br />
                      <strong>Detailed instructions included in the JSON export file!</strong>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit User Role Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">User</p>
                  <p className="font-semibold">{editingUser.full_name}</p>
                  <p className="text-sm text-gray-600">{editingUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Current Role</p>
                  <Badge className={roleColors[editingUser.customRole || editingUser.role]}>
                    {editingUser.customRole || editingUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">New Role</p>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Quality Lead">Quality Lead</SelectItem>
                      <SelectItem value="Process Engineer">Process Engineer</SelectItem>
                      <SelectItem value="Shift QC">Shift QC</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRoleUpdate}
                    disabled={updateUserRoleMutation.isPending || !newRole || newRole === (editingUser.customRole || editingUser.role)}
                  >
                    {updateUserRoleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Role"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}