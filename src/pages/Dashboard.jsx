import React, { useState, useEffect } from "react";
import { api } from '@/api/apiClient';
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Target,
  Database,
  Bell,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import KPICard from "../components/dashboard/KPICard";
import DefectPareto from "../components/dashboard/DefectPareto";
import WebHeatmap from "../components/dashboard/WebHeatmap";
import TrendChart from "../components/dashboard/TrendChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import TraceabilityDiagram from "../components/traceability/TraceabilityDiagram";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedLine, setSelectedLine] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: defects = [] } = useQuery({
    queryKey: ['defects', timeRange],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 50),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas'],
    queryFn: () => api.entities.CAPAPlan.list("-created_date", 30),
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis', timeRange],
    queryFn: () => api.entities.KPI.list("-recordDate", 20),
  });

  const { data: pendingQFIRs = [] } = useQuery({
    queryKey: ['pending-qfirs'],
    queryFn: () => api.entities.CustomerComplaint.filter({ status: "pending_qfir" }, "-dateLogged", 20),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['process-runs-dashboard'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 100),
  });

  const { data: allComplaints = [] } = useQuery({
    queryKey: ['complaints-dashboard'],
    queryFn: () => api.entities.CustomerComplaint.list("-dateLogged", 50),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-dashboard'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 50),
  });



  // Calculate KPIs
  const openDefects = defects.filter(d => d.status === "open" || d.status === "rca_in_progress").length;
  const criticalDefects = defects.filter(d => d.severity === "critical" && d.status !== "closed").length;
  const openCAPAs = capas.filter(c => c.approvalState !== "closed").length;
  const overdueCAPAs = capas.filter(c => {
    if (c.approvalState === "closed") return false;
    const actions = [...(c.correctiveActions || []), ...(c.preventiveActions || [])];
    return actions.some(a => a.status !== "completed" && new Date(a.dueDate) < new Date());
  }).length;

  const latestKPI = kpis[0] || {};
  const avgCpk = kpis.length > 0 ? (kpis.reduce((sum, k) => sum + (k.cpk || 0), 0) / kpis.length).toFixed(2) : "N/A";
  const avgFPY = kpis.length > 0 ? (kpis.reduce((sum, k) => sum + (k.firstPassYield || 0), 0) / kpis.length).toFixed(1) : "N/A";

  // Process Run stats by line
  const processRunsByLine = processRuns.reduce((acc, run) => {
    const line = run.line || 'Unknown';
    acc[line] = (acc[line] || 0) + 1;
    return acc;
  }, {});

  // Repeat defects
  const defectsByType = {};
  defects.forEach(d => {
    defectsByType[d.defectType] = (defectsByType[d.defectType] || 0) + 1;
  });
  const repeatDefects = Object.entries(defectsByType).filter(([_, count]) => count > 1);

  // Get recent complaints with full traceability
  const recentComplaintsWithFlow = allComplaints.slice(0, 3).map(complaint => {
    const defect = defects.find(d => d.linkedComplaintId === complaint.id || d.ticketId === complaint.ticketNumber);
    const rca = rcas.find(r => r.defectTicketId === defect?.id);
    const capa = capas.find(c => c.defectTicketId === defect?.id);
    
    return { complaint, defect, rca, capa };
  });

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time quality monitoring & CAPA tracking</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Notification Bell */}
            <Link to={createPageUrl("QFIRForm")}>
              <Button 
                variant="outline" 
                size="icon" 
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {pendingQFIRs.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                    {pendingQFIRs.length}
                  </span>
                )}
              </Button>
            </Link>
            
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList>
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
                <TabsTrigger value="90d">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
            <Link to={createPageUrl("DefectIntake")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Defect
              </Button>
            </Link>
          </div>
        </div>

        {/* Data Source Info */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">📊 Data Source Information</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-1">Avg Cpk & First Pass Yield</p>
                    <p className="text-xs text-gray-600">Calculated from <strong>KPI records</strong> in the database. Upload process data via <Link to={createPageUrl("DataUpload")} className="text-blue-600 underline">Data Upload</Link> page to populate KPIs.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-1">Process Run Data</p>
                    <p className="text-xs text-gray-600">Import CSV/Excel with process parameters (speed, pressure, temps) via <Link to={createPageUrl("ProcessRuns")} className="text-blue-600 underline">Process Runs</Link>.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-1">Defect Data</p>
                    <p className="text-xs text-gray-600">Report defects via <Link to={createPageUrl("DefectIntake")} className="text-blue-600 underline">Defect Intake</Link> or bulk import historical data.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Section with Tabs */}
        <Card className="border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <CardTitle>📋 Complete Quality Workflow</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-5 gap-3">
              <Link to={createPageUrl("SalesComplaintLog")} className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-orange-900">⓪ Log Complaint</p>
                <p className="text-xs text-gray-600 mt-1">Customer complaint intake</p>
              </Link>
              <Link to={createPageUrl("QFIRForm")} className="p-3 bg-white rounded-lg border border-orange-200 hover:shadow-md transition-shadow relative">
                <p className="text-sm font-medium text-orange-900">① Complete QFIR</p>
                <p className="text-xs text-gray-600 mt-1">Quality review & allocation</p>
                {pendingQFIRs.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {pendingQFIRs.length}
                  </span>
                )}
              </Link>
              <Link to={createPageUrl("DefectIntake")} className="p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-blue-900">② Defect Intake</p>
                <p className="text-xs text-gray-600 mt-1">Link to defect record</p>
              </Link>
              <Link to={createPageUrl("RCAStudio")} className="p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-blue-900">③ RCA</p>
                <p className="text-xs text-gray-600 mt-1">Root cause analysis</p>
              </Link>
              <Link to={createPageUrl("CAPAWorkspace")} className="p-3 bg-white rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-blue-900">④ CAPA</p>
                <p className="text-xs text-gray-600 mt-1">Actions & closure</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pending QFIR Alert */}
        {pendingQFIRs.length > 0 && (
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-red-50 animate-pulse">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 rounded-full">
                  <Bell className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-orange-900">
                    🚨 {pendingQFIRs.length} Customer Complaint{pendingQFIRs.length > 1 ? 's' : ''} Awaiting QFIR
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    <strong>Action Required:</strong> Quality Head must complete QFIR forms
                  </p>
                  <div className="flex gap-2 mt-3">
                    {pendingQFIRs.slice(0, 3).map((complaint, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white border-orange-300">
                        <FileText className="w-3 h-3 mr-1" />
                        {complaint.ticketNumber}
                      </Badge>
                    ))}
                    {pendingQFIRs.length > 3 && (
                      <Badge variant="outline" className="bg-white border-orange-300">
                        +{pendingQFIRs.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <Link to={createPageUrl("QFIRForm")}>
                  <Button size="lg" className="bg-orange-600 hover:bg-orange-700">
                    <Bell className="w-4 h-4 mr-2" />
                    Complete QFIR Forms
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Critical Alerts */}
        {criticalDefects > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">
                    {criticalDefects} Critical Defect{criticalDefects > 1 ? 's' : ''} Require Immediate Attention
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Review and initiate RCA immediately
                  </p>
                </div>
                <Link to={createPageUrl("DefectIntake") + "?filter=critical"} className="ml-auto">
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                    View Defects
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Runs Summary */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">📈 Process Runs Captured</h3>
                  <Badge className="bg-blue-600 text-white">{processRuns.length} Total</Badge>
                </div>
                {Object.keys(processRunsByLine).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(processRunsByLine).map(([line, count]) => (
                      <Badge key={line} variant="outline" className="bg-white border-blue-300">
                        {line.toLowerCase().startsWith('line') ? line : `Line ${line}`}: <span className="font-bold ml-1">{count}</span> runs
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">
                    No process runs yet. <Link to={createPageUrl("DataUpload")} className="underline font-medium">Upload data</Link> to start tracking.
                  </p>
                )}
                {processRuns.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Latest: {new Date(processRuns[0]?.dateTimeStart).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST • 
                    <Link to={createPageUrl("GoldenBatch")} className="underline ml-1">Compare with Golden Batch →</Link>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Open Defects"
            value={openDefects}
            icon={AlertTriangle}
            color="orange"
            trend={openDefects > 5 ? "up" : "down"}
          />
          <KPICard
            title="Open CAPAs"
            value={openCAPAs}
            subtitle={overdueCAPAs > 0 ? `${overdueCAPAs} overdue` : "On track"}
            icon={Clock}
            color={overdueCAPAs > 0 ? "red" : "blue"}
          />
          <KPICard
            title="Avg Cpk"
            value={avgCpk}
            icon={Target}
            color={avgCpk >= 1.33 ? "green" : avgCpk >= 1.0 ? "yellow" : "red"}
            subtitle={avgCpk >= 1.33 ? "Capable" : "Below target"}
          />
          <KPICard
            title="First Pass Yield"
            value={`${avgFPY}%`}
            icon={CheckCircle2}
            color="green"
            subtitle="Last 30 days"
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DefectPareto defects={defects} />
            <WebHeatmap defects={defects} />
          </div>

          <div className="space-y-6">
            <RecentActivity defects={defects} capas={capas} />
            
            {/* Repeat Defects Watchlist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Repeat Defects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {repeatDefects.length > 0 ? (
                  <div className="space-y-2">
                    {repeatDefects.slice(0, 5).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                        <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                        <Badge variant="destructive">{count}x</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No repeat defects detected</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Defect PPM</span>
                  <span className="font-semibold">{latestKPI.defectPPM?.toFixed(0) || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">On-Time CAPA</span>
                  <span className="font-semibold">{latestKPI.onTimeCAPA?.toFixed(0) || 'N/A'}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Scrap Rate</span>
                  <span className="font-semibold">{latestKPI.scrapRate?.toFixed(2) || 'N/A'}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Complaints</span>
                  <span className="font-semibold">{latestKPI.customerComplaints || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trend Chart */}
        <TrendChart kpis={kpis} />

        {/* Recent Complaint Traceability */}
        {recentComplaintsWithFlow.length > 0 && (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Recent Complaint Traceability
              </CardTitle>
              <p className="text-sm text-gray-600">Quick view of complaint → QFIR → defect → RCA → CAPA flow</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {recentComplaintsWithFlow.map(({ complaint, defect, rca, capa }, idx) => (
                <TraceabilityDiagram 
                  key={complaint.id}
                  complaint={complaint}
                  defect={defect}
                  rca={rca}
                  capa={capa}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}