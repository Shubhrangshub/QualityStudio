import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wrench, TrendingUp, AlertTriangle, Calendar, 
  Activity, Target, Zap, Loader2
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { api } from '@/api/apiClient';

export default function MaintenanceTrendAnalysis({ equipment, processRuns, defects, selectedLine }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const filteredEquipment = selectedLine !== "all" 
    ? equipment.filter(e => e.line === selectedLine)
    : equipment;

  // Calculate maintenance metrics
  const totalMaintenanceEvents = filteredEquipment.reduce((sum, eq) => 
    sum + (eq.maintenanceHistory?.length || 0), 0
  );

  const totalFailures = filteredEquipment.reduce((sum, eq) => 
    sum + (eq.failureHistory?.length || 0), 0
  );

  const avgMTBF = filteredEquipment.filter(e => e.performanceMetrics?.mtbf).length > 0
    ? filteredEquipment
        .filter(e => e.performanceMetrics?.mtbf)
        .reduce((sum, e) => sum + e.performanceMetrics.mtbf, 0) / 
      filteredEquipment.filter(e => e.performanceMetrics?.mtbf).length
    : 0;

  const avgMTTR = filteredEquipment.filter(e => e.performanceMetrics?.mttr).length > 0
    ? filteredEquipment
        .filter(e => e.performanceMetrics?.mttr)
        .reduce((sum, e) => sum + e.performanceMetrics.mttr, 0) / 
      filteredEquipment.filter(e => e.performanceMetrics?.mttr).length
    : 0;

  // Maintenance type distribution
  const maintenanceByType = filteredEquipment.reduce((acc, eq) => {
    eq.maintenanceHistory?.forEach(m => {
      acc[m.type] = (acc[m.type] || 0) + 1;
    });
    return acc;
  }, {});

  const maintenanceDistribution = Object.entries(maintenanceByType).map(([type, count]) => ({
    type: type?.replace(/_/g, ' '),
    count
  }));

  // Equipment failure by type
  const failuresByEquipmentType = filteredEquipment.reduce((acc, eq) => {
    const type = eq.equipmentType;
    const failures = eq.failureHistory?.length || 0;
    acc[type] = (acc[type] || 0) + failures;
    return acc;
  }, {});

  const failureDistribution = Object.entries(failuresByEquipmentType)
    .map(([type, count]) => ({
      type: type?.replace(/_/g, ' '),
      count
    }))
    .sort((a, b) => b.count - a.count);

  // Run AI trend analysis
  const runTrendAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze MAINTENANCE TRENDS and EQUIPMENT FAILURES for lamination equipment.

EQUIPMENT DATA (${filteredEquipment.length} items):
${JSON.stringify(filteredEquipment.map(e => ({
  id: e.equipmentId,
  type: e.equipmentType,
  line: e.line,
  runningHours: e.currentRunningHours,
  maintenanceCount: e.maintenanceHistory?.length,
  failureCount: e.failureHistory?.length,
  lastMaintenance: e.lastMaintenanceDate,
  mtbf: e.performanceMetrics?.mtbf,
  mttr: e.performanceMetrics?.mttr,
  healthScore: e.predictiveMaintenanceScore
})).slice(0, 20))}

MAINTENANCE HISTORY:
${JSON.stringify(filteredEquipment.flatMap(e => 
  e.maintenanceHistory?.slice(0, 3).map(m => ({
    equipment: e.equipmentId,
    type: m.type,
    date: m.date,
    cost: m.cost
  }))
).filter(Boolean))}

FAILURE PATTERNS:
${JSON.stringify(filteredEquipment.flatMap(e => 
  e.failureHistory?.map(f => ({
    equipment: e.equipmentId,
    type: e.equipmentType,
    failureType: f.failureType,
    downtime: f.downtime,
    rootCause: f.rootCause
  }))
).filter(Boolean))}

Provide comprehensive maintenance trend analysis:

1. **Recurring Issues** - Equipment or failure types appearing repeatedly
2. **Maintenance Schedule Optimization** - Recommended intervals based on actual failure data
3. **Cost Trends** - Maintenance cost patterns and optimization opportunities
4. **MTBF/MTTR Trends** - Reliability and repair time analysis
5. **Preventive vs Corrective Ratio** - Balance analysis
6. **Critical Equipment Patterns** - Items requiring attention
7. **Seasonal Patterns** - Time-based maintenance needs

Be specific with equipment IDs and data-driven recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            recurringIssues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equipmentType: { type: "string" },
                  issue: { type: "string" },
                  frequency: { type: "string" },
                  affectedEquipment: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" },
                  estimatedSavings: { type: "string" }
                }
              }
            },
            optimizedSchedules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equipmentType: { type: "string" },
                  currentInterval: { type: "string" },
                  recommendedInterval: { type: "string" },
                  reasoning: { type: "string" },
                  expectedBenefit: { type: "string" }
                }
              }
            },
            costTrends: {
              type: "object",
              properties: {
                totalMaintenanceCost: { type: "string" },
                costTrend: { type: "string" },
                highCostEquipment: { type: "array", items: { type: "string" } },
                optimizationOpportunities: { type: "array", items: { type: "string" } }
              }
            },
            reliabilityTrends: {
              type: "object",
              properties: {
                mtbfTrend: { type: "string" },
                mttrTrend: { type: "string" },
                improvingEquipment: { type: "array", items: { type: "string" } },
                degradingEquipment: { type: "array", items: { type: "string" } }
              }
            },
            preventiveVsCorrective: {
              type: "object",
              properties: {
                preventivePercentage: { type: "number" },
                correctivePercentage: { type: "number" },
                idealRatio: { type: "string" },
                recommendation: { type: "string" }
              }
            },
            criticalEquipmentPatterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equipmentId: { type: "string" },
                  pattern: { type: "string" },
                  action: { type: "string" },
                  urgency: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error("Trend analysis error:", error);
    }
    
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-6 h-6 text-indigo-600" />
                Maintenance & Equipment Trend Analysis
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                AI-powered analysis of maintenance patterns and equipment reliability
              </p>
            </div>
            <Button
              onClick={runTrendAnalysis}
              disabled={analyzing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Maintenance</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalMaintenanceEvents}</p>
            <p className="text-xs text-gray-500 mt-1">events recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Failures</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{totalFailures}</p>
            <p className="text-xs text-gray-500 mt-1">failure events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Avg MTBF</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {avgMTBF > 0 ? avgMTBF.toFixed(0) : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Avg MTTR</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {avgMTTR > 0 ? avgMTTR.toFixed(1) : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={maintenanceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No maintenance data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failures by Equipment Type</CardTitle>
          </CardHeader>
          <CardContent>
            {failureDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={failureDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No failure data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="space-y-6">
          {/* Recurring Issues */}
          {insights.recurringIssues && insights.recurringIssues.length > 0 && (
            <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Recurring Maintenance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.recurringIssues.map((issue, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border-2 border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{issue.issue}</h4>
                          <Badge variant="outline" className="mt-1">
                            {issue.equipmentType?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <Badge className="bg-red-100 text-red-800">
                          {issue.frequency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Affected: {issue.affectedEquipment?.join(', ')}
                      </p>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-900">Recommendation:</p>
                          <p className="text-sm text-blue-700">{issue.recommendation}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-xs font-medium text-green-900">Potential Savings:</p>
                          <p className="text-sm text-green-700">{issue.estimatedSavings}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimized Schedules */}
          {insights.optimizedSchedules && insights.optimizedSchedules.length > 0 && (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Optimized Maintenance Schedules
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Data-driven recommendations to improve maintenance timing
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.optimizedSchedules.map((sched, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {sched.equipmentType?.replace(/_/g, ' ')}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3 mb-2">
                        <div className="p-2 bg-red-50 rounded">
                          <p className="text-xs text-red-700">Current Interval</p>
                          <p className="font-medium text-red-900">{sched.currentInterval}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-xs text-green-700">Recommended Interval</p>
                          <p className="font-medium text-green-900">{sched.recommendedInterval}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{sched.reasoning}</p>
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs font-medium text-blue-900">Expected Benefit:</p>
                        <p className="text-sm text-blue-700">{sched.expectedBenefit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Trends */}
          {insights.costTrends && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Maintenance Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Maintenance Cost</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {insights.costTrends.totalMaintenanceCost}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Trend: {insights.costTrends.costTrend}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">High Cost Equipment:</p>
                      <div className="flex flex-wrap gap-1">
                        {insights.costTrends.highCostEquipment?.map((eq, idx) => (
                          <Badge key={idx} className="bg-orange-100 text-orange-800 text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {insights.costTrends.optimizationOpportunities && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        Cost Optimization Opportunities:
                      </p>
                      <ul className="space-y-1">
                        {insights.costTrends.optimizationOpportunities.map((opp, idx) => (
                          <li key={idx} className="text-sm text-green-700">💰 {opp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reliability Trends */}
          {insights.reliabilityTrends && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Reliability Trends (MTBF/MTTR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">MTBF Trend</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {insights.reliabilityTrends.mtbfTrend}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">MTTR Trend</p>
                    <p className="text-lg font-semibold text-purple-900">
                      {insights.reliabilityTrends.mttrTrend}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {insights.reliabilityTrends.improvingEquipment?.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs font-semibold text-green-900 mb-2">
                        ✓ Improving Equipment:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {insights.reliabilityTrends.improvingEquipment.map((eq, idx) => (
                          <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.reliabilityTrends.degradingEquipment?.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs font-semibold text-red-900 mb-2">
                        ⚠ Degrading Equipment:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {insights.reliabilityTrends.degradingEquipment.map((eq, idx) => (
                          <Badge key={idx} className="bg-red-100 text-red-800 text-xs">
                            {eq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preventive vs Corrective */}
          {insights.preventiveVsCorrective && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle>Preventive vs Corrective Maintenance Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Preventive</span>
                      <span className="text-2xl font-bold text-green-600">
                        {insights.preventiveVsCorrective.preventivePercentage?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${insights.preventiveVsCorrective.preventivePercentage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Corrective</span>
                      <span className="text-2xl font-bold text-red-600">
                        {insights.preventiveVsCorrective.correctivePercentage?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500"
                        style={{ width: `${insights.preventiveVsCorrective.correctivePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Ideal Ratio: {insights.preventiveVsCorrective.idealRatio}
                  </p>
                  <p className="text-sm text-blue-700">
                    {insights.preventiveVsCorrective.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Equipment Patterns */}
          {insights.criticalEquipmentPatterns && insights.criticalEquipmentPatterns.length > 0 && (
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Critical Equipment Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.criticalEquipmentPatterns.map((pattern, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border-2 border-orange-200">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{pattern.equipmentId}</h4>
                        <Badge className={
                          pattern.urgency === 'critical' ? 'bg-red-600 text-white' :
                          pattern.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {pattern.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Pattern:</strong> {pattern.pattern}
                      </p>
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs font-medium text-green-900">Action Required:</p>
                        <p className="text-sm text-green-700">{pattern.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions if no equipment */}
      {equipment.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Wrench className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Equipment Data Available
            </h3>
            <p className="text-sm text-gray-600">
              Add equipment records to enable maintenance trend analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}