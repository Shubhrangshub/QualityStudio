
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, AlertTriangle, Clock, Target,
  Activity, Zap, Settings, RefreshCw, Loader2, Calendar,
  CheckCircle2, XCircle
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart
} from 'recharts';

import QualityMetricWidget from "../components/analytics/QualityMetricWidget";
import AnomalyDetector from "../components/analytics/AnomalyDetector";
import MaintenanceTrendAnalysis from "../components/analytics/MaintenanceTrendAnalysis";
import CycleTimeAnalysis from "../components/analytics/CycleTimeAnalysis";

export default function QualityOverview() {
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedDefectType, setSelectedDefectType] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");
  const [analyzing, setAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState(null);

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-overview'],
    queryFn: () => base44.entities.DefectTicket.list("-created_date", 100),
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis-overview'],
    queryFn: () => base44.entities.KPI.list("-recordDate", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['runs-overview'],
    queryFn: () => base44.entities.ProcessRun.list("-dateTimeStart", 100),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-overview'],
    queryFn: () => base44.entities.RCARecord.list("-created_date", 50),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-overview'],
    queryFn: () => base44.entities.CAPAPlan.list("-created_date", 50),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-overview'],
    queryFn: () => base44.entities.Equipment.list("-created_date", 50),
  });

  // Extract unique values
  const lines = [...new Set([...defects.map(d => d.line), ...kpis.map(k => k.line)].filter(Boolean))];
  const products = [...new Set([...defects.map(d => d.productCode), ...kpis.map(k => k.productCode)].filter(Boolean))];
  const defectTypes = [...new Set(defects.map(d => d.defectType).filter(Boolean))];

  // Filter data based on selections
  const filterByTimeRange = (items, dateField) => {
    const now = new Date();
    let cutoffDate;

    if (timeRange === "7d") cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeRange === "30d") cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (timeRange === "90d") cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else cutoffDate = new Date(0);

    return items.filter(item => new Date(item[dateField]) >= cutoffDate);
  };

  let filteredDefects = filterByTimeRange(defects, 'created_date');
  let filteredKPIs = filterByTimeRange(kpis, 'recordDate');
  let filteredRuns = filterByTimeRange(processRuns, 'dateTimeStart');

  if (selectedLine !== "all") {
    filteredDefects = filteredDefects.filter(d => d.line === selectedLine);
    filteredKPIs = filteredKPIs.filter(k => k.line === selectedLine);
    filteredRuns = filteredRuns.filter(r => r.line === selectedLine);
  }

  if (selectedProduct !== "all") {
    filteredDefects = filteredDefects.filter(d => d.productCode === selectedProduct);
    filteredKPIs = filteredKPIs.filter(k => k.productCode === selectedProduct);
    filteredRuns = filteredRuns.filter(r => r.productCode === selectedProduct);
  }

  if (selectedDefectType !== "all") {
    filteredDefects = filteredDefects.filter(d => d.defectType === selectedDefectType);
  }

  // Calculate metrics
  const calculateMetrics = () => {
    // FPY
    const fpyValues = filteredKPIs.map(k => k.firstPassYield).filter(v => v != null);
    const avgFPY = fpyValues.length > 0 ? fpyValues.reduce((a, b) => a + b, 0) / fpyValues.length : 0;

    // Defect Rate
    const totalDefects = filteredDefects.length;
    const criticalDefects = filteredDefects.filter(d => d.severity === 'critical').length;
    const defectRate = totalDefects;

    // Cpk
    const cpkValues = filteredKPIs.map(k => k.cpk).filter(v => v != null);
    const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;

    // RCA Cycle Time
    const completedRCAs = rcas.filter(r => r.completedDate);
    const rcaCycleTimes = completedRCAs.map(rca => {
      const start = new Date(rca.created_date);
      const end = new Date(rca.completedDate);
      return (end - start) / (1000 * 60 * 60 * 24); // days
    });
    const avgRCACycleTime = rcaCycleTimes.length > 0
      ? rcaCycleTimes.reduce((a, b) => a + b, 0) / rcaCycleTimes.length
      : 0;

    // CAPA Cycle Time
    const closedCAPAs = capas.filter(c => c.approvalState === 'closed' && c.created_date);
    const capaCycleTimes = closedCAPAs.map(capa => {
      const start = new Date(capa.created_date);
      const completionDates = [
        ...(capa.correctiveActions || []).map(a => a.completionDate).filter(Boolean),
        ...(capa.preventiveActions || []).map(a => a.completionDate).filter(Boolean)
      ];
      if (completionDates.length === 0) return null;
      const lastCompletion = new Date(Math.max(...completionDates.map(d => new Date(d))));
      return (lastCompletion - start) / (1000 * 60 * 60 * 24);
    }).filter(Boolean);
    const avgCAPACycleTime = capaCycleTimes.length > 0
      ? capaCycleTimes.reduce((a, b) => a + b, 0) / capaCycleTimes.length
      : 0;

    // Equipment Health
    const equipmentScores = equipment.map(e => e.predictiveMaintenanceScore || 75);
    const avgEquipmentHealth = equipmentScores.length > 0
      ? equipmentScores.reduce((a, b) => a + b, 0) / equipmentScores.length
      : 0;

    return {
      fpy: avgFPY,
      defectRate,
      criticalDefects,
      cpk: avgCpk,
      rcaCycleTime: avgRCACycleTime,
      capaCycleTime: avgCAPACycleTime,
      equipmentHealth: avgEquipmentHealth,
      openDefects: filteredDefects.filter(d => d.status === 'open').length,
      openCAPAs: capas.filter(c => c.approvalState !== 'closed').length
    };
  };

  const metrics = calculateMetrics();

  // Run anomaly detection
  const runAnomalyDetection = async () => {
    setAnalyzing(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform ANOMALY DETECTION on lamination process parameters.

PROCESS RUN DATA (last ${filteredRuns.length} runs):
${JSON.stringify(filteredRuns.slice(0, 20).map(r => ({
  date: new Date(r.dateTimeStart).toISOString().split('T')[0],
  line: r.line,
  lineSpeed: r.lineSpeed,
  nipPressure: r.nipPressure
})))}

RECENT DEFECTS:
${JSON.stringify(filteredDefects.slice(0, 15).map(d => ({
  date: new Date(d.created_date).toISOString().split('T')[0],
  type: d.defectType,
  line: d.line
})))}

Detect anomalies - parameter spikes, quality drops, temporal patterns. Rank by severity.`,
        response_json_schema: {
          type: "object",
          properties: {
            parameterAnomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  line: { type: "string" },
                  anomalyType: { type: "string", enum: ["spike", "dip", "drift", "instability"] },
                  detectedAt: { type: "string" },
                  actualValue: { type: "number" },
                  expectedRange: { type: "string" },
                  deviation: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  impact: { type: "string" },
                  suggestedCause: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            correlationAnomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameters: { type: "array", items: { type: "string" } },
                  line: { type: "string" },
                  description: { type: "string" },
                  normalBehavior: { type: "string" },
                  observedBehavior: { type: "string" },
                  possibleCauses: { type: "array", items: { type: "string" } }
                }
              }
            },
            temporalAnomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  description: { type: "string" },
                  affectedShifts: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" }
                }
              }
            },
            qualityAnomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  line: { type: "string" },
                  anomalyDescription: { type: "string" },
                  timeframe: { type: "string" },
                  likelyTrigger: { type: "string" },
                  correctiveAction: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnomalies(result);
    } catch (error) {
      console.error("Anomaly detection error:", error);
    }

    setAnalyzing(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Quality Overview Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive quality analytics with anomaly detection and trend analysis
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Dashboard Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Production Line</Label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lines</SelectItem>
                    {lines.map(line => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map(prod => (
                      <SelectItem key={prod} value={prod}>{prod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Defect Type</Label>
                <Select value={selectedDefectType} onValueChange={setSelectedDefectType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Defect Types</SelectItem>
                    {defectTypes.map(type => (
                      <SelectItem key={type} value={type}>{type?.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={runAnomalyDetection}
                disabled={analyzing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Detect Anomalies
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Quality Metrics</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="cycle-times">Cycle Times</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Trends</TabsTrigger>
          </TabsList>

          {/* Quality Metrics Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <QualityMetricWidget
                title="First Pass Yield"
                value={`${metrics.fpy.toFixed(1)}%`}
                trend={metrics.fpy >= 95 ? "up" : "down"}
                target="≥95%"
                status={metrics.fpy >= 95 ? "good" : metrics.fpy >= 90 ? "warning" : "critical"}
                icon={Target}
              />
              <QualityMetricWidget
                title="Avg Cpk"
                value={metrics.cpk.toFixed(2)}
                trend={metrics.cpk >= 1.33 ? "up" : "down"}
                target="≥1.33"
                status={metrics.cpk >= 1.33 ? "good" : metrics.cpk >= 1.0 ? "warning" : "critical"}
                icon={Activity}
              />
              <QualityMetricWidget
                title="Open Defects"
                value={metrics.openDefects}
                subtitle={`${metrics.criticalDefects} critical`}
                status={metrics.criticalDefects > 0 ? "critical" : metrics.openDefects > 5 ? "warning" : "good"}
                icon={AlertTriangle}
              />
              <QualityMetricWidget
                title="Equipment Health"
                value={`${metrics.equipmentHealth.toFixed(0)}%`}
                trend={metrics.equipmentHealth >= 75 ? "up" : "down"}
                target="≥80%"
                status={metrics.equipmentHealth >= 80 ? "good" : metrics.equipmentHealth >= 60 ? "warning" : "critical"}
                icon={CheckCircle2}
              />
            </div>

            {/* Cycle Time Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg RCA Cycle Time</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {metrics.rcaCycleTime.toFixed(1)} days
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {rcas.filter(r => r.status === 'completed').length} completed RCAs
                      </p>
                    </div>
                    <Clock className="w-12 h-12 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg CAPA Cycle Time</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {metrics.capaCycleTime.toFixed(1)} days
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {capas.filter(c => c.approvalState === 'closed').length} closed CAPAs
                      </p>
                    </div>
                    <Clock className="w-12 h-12 text-purple-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Multi-Line Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Multi-Line Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {lines.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={lines.map(line => {
                      const lineDefects = defects.filter(d => d.line === line);
                      const lineKPIs = kpis.filter(k => k.line === line);
                      const fpyVals = lineKPIs.map(k => k.firstPassYield).filter(v => v != null);
                      const cpkVals = lineKPIs.map(k => k.cpk).filter(v => v != null);

                      return {
                        line,
                        FPY: fpyVals.length > 0 ? (fpyVals.reduce((a, b) => a + b, 0) / fpyVals.length).toFixed(1) : 0,
                        Cpk: cpkVals.length > 0 ? (cpkVals.reduce((a, b) => a + b, 0) / cpkVals.length).toFixed(2) : 0,
                        Defects: lineDefects.length
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="line" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="FPY" fill="#3b82f6" name="FPY (%)" />
                      <Bar yAxisId="right" dataKey="Defects" fill="#ef4444" name="Defects" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No multi-line data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trend Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>FPY & Cpk Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={filteredKPIs.slice(0, 30).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={(item) => new Date(item.recordDate).toLocaleDateString()} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="firstPassYield" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="FPY (%)" />
                      <Line yAxisId="right" type="monotone" dataKey="cpk" stroke="#10b981" strokeWidth={2} name="Cpk" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Defect Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={filteredKPIs.slice(0, 30).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={(item) => new Date(item.recordDate).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="defectPPM" fill="#f59e0b" fillOpacity={0.6} stroke="#f59e0b" name="Defect PPM" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Anomaly Detection Tab */}
          <TabsContent value="anomalies">
            <AnomalyDetector
              anomalies={anomalies}
              loading={analyzing}
              processRuns={filteredRuns}
              defects={filteredDefects}
            />
          </TabsContent>

          {/* Cycle Times Tab */}
          <TabsContent value="cycle-times">
            <CycleTimeAnalysis
              rcas={rcas}
              capas={capas}
              defects={filteredDefects}
            />
          </TabsContent>

          {/* Maintenance Trends Tab */}
          <TabsContent value="maintenance">
            <MaintenanceTrendAnalysis
              equipment={equipment}
              processRuns={filteredRuns}
              defects={filteredDefects}
              selectedLine={selectedLine}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
