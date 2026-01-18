import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Wrench, AlertTriangle, TrendingDown, Clock, 
  Activity, CheckCircle2, Zap, Target, Brain,
  Loader2, Calendar, Database, LineChart, Plus, Rocket
} from "lucide-react";
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PredictiveMaintenance({ 
  equipment = [],
  processRuns = [],
  defects = [],
  onRunPrediction,
  predictions,
  loading 
}) {
  const [selectedLine, setSelectedLine] = useState("all");
  const [selectedEquipmentType, setSelectedEquipmentType] = useState("all");
  const [creatingWorkOrders, setCreatingWorkOrders] = useState({});

  const queryClient = useQueryClient();

  // NEW: Create maintenance work order from AI recommendation
  const createWorkOrderMutation = useMutation({
    mutationFn: (workOrderData) => api.entities.MaintenanceWorkOrder.create(workOrderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    }
  });

  const handleCreateWorkOrder = async (recommendation) => {
    setCreatingWorkOrders(prev => ({ ...prev, [recommendation.equipmentId]: true }));
    
    try {
      const user = await api.auth.me();
      
      // Calculate due date based on priority
      const getDueDate = (priority) => {
        const daysMap = {
          critical: 1,
          urgent: 2,
          high: 7,
          medium: 14,
          low: 30
        };
        const days = daysMap[priority] || 14;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      };

      // Parse estimated cost
      const parseCost = (costStr) => {
        if (!costStr) return 0;
        const match = costStr.match(/\$?(\d+(?:,\d{3})*)/);
        return match ? parseInt(match[1].replace(/,/g, '')) : 0;
      };

      const workOrderData = {
        workOrderId: `WO-${Date.now().toString().slice(-8)}`,
        equipmentId: recommendation.equipmentId,
        equipmentType: recommendation.equipmentType,
        line: equipment.find(e => e.equipmentId === recommendation.equipmentId)?.line || "Unknown",
        maintenanceType: "predictive",
        priority: recommendation.priority || "medium",
        description: recommendation.action,
        aiRecommendation: {
          predictedFailure: recommendation.predictedFailure,
          reasoning: recommendation.reasoning,
          timeframe: recommendation.timeline || "As soon as possible",
          expectedBenefit: recommendation.expectedBenefit
        },
        scheduledDate: new Date().toISOString().split('T')[0],
        dueDate: getDueDate(recommendation.priority),
        estimatedCost: parseCost(recommendation.estimatedCost),
        assignedTo: user.email,
        status: "pending",
        partsRequired: [],
        procedureSteps: [],
        verificationRequired: true,
        createdFromAI: true
      };

      await createWorkOrderMutation.mutateAsync(workOrderData);
      
    } catch (error) {
      console.error("Error creating work order:", error);
    }
    
    setCreatingWorkOrders(prev => ({ ...prev, [recommendation.equipmentId]: false }));
  };

  const filteredEquipment = equipment.filter(eq => {
    if (selectedLine !== "all" && eq.line !== selectedLine) return false;
    if (selectedEquipmentType !== "all" && eq.equipmentType !== selectedEquipmentType) return false;
    return true;
  });

  const lines = [...new Set(equipment.map(e => e.line).filter(Boolean))];
  const equipmentTypes = [...new Set(equipment.map(e => e.equipmentType).filter(Boolean))];

  const getHealthColor = (score) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  };

  const getRiskColor = (level) => {
    const colors = {
      critical: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-green-100', text: 'text-green-800' }
    };
    return colors[level?.toLowerCase()] || colors.low;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-6 h-6 text-indigo-600" />
                Predictive Maintenance Dashboard
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                AI-powered equipment health monitoring and failure prediction
              </p>
            </div>
            <Button
              onClick={onRunPrediction}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run AI Prediction
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
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
              <Label>Equipment Type</Label>
              <Select value={selectedEquipmentType} onValueChange={setSelectedEquipmentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type?.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-900">
                  <strong>{filteredEquipment.length}</strong> equipment items monitored
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Equipment</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {filteredEquipment.filter(e => e.status === 'critical' || e.predictiveMaintenanceScore < 40).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Maintenance Due</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {filteredEquipment.filter(e => {
                    if (!e.nextMaintenanceDue) return false;
                    const daysUntil = Math.floor((new Date(e.nextMaintenanceDue) - new Date()) / (1000 * 60 * 60 * 24));
                    return daysUntil <= 7;
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Health Score</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {filteredEquipment.length > 0 
                    ? (filteredEquipment.reduce((sum, e) => sum + (e.predictiveMaintenanceScore || 75), 0) / filteredEquipment.length).toFixed(0)
                    : 'N/A'
                  }%
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Operational</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {filteredEquipment.filter(e => e.status === 'operational').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Equipment Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEquipment.slice(0, 10).map((eq) => {
              const healthScore = eq.predictiveMaintenanceScore || 75;
              const healthColors = getHealthColor(healthScore);
              const rulPercentage = eq.estimatedRUL && eq.expectedLifespan 
                ? (eq.estimatedRUL / eq.expectedLifespan) * 100 
                : 50;

              return (
                <div key={eq.id} className={`p-4 rounded-lg border ${healthColors.border} ${healthColors.bg}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-900">{eq.equipmentId}</h4>
                        <Badge variant="outline">
                          {eq.equipmentType?.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={healthColors.bg + ' ' + healthColors.text}>
                          {eq.status || 'operational'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Line {eq.line} • {eq.manufacturer} {eq.model}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Health Score</p>
                      <p className={`text-3xl font-bold ${healthColors.text}`}>
                        {healthScore}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Running Hours</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-sm font-semibold">
                          {eq.currentRunningHours?.toLocaleString() || 'N/A'}
                        </p>
                        {eq.expectedLifespan && (
                          <p className="text-xs text-gray-500">
                            / {eq.expectedLifespan.toLocaleString()}h
                          </p>
                        )}
                      </div>
                      <Progress value={rulPercentage} className="h-2 mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Est. Remaining Life</p>
                      <p className="text-sm font-semibold">
                        {eq.estimatedRUL ? `${eq.estimatedRUL.toLocaleString()}h` : 'Calculating...'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {eq.estimatedRUL && eq.currentRunningHours 
                          ? `~${Math.floor(eq.estimatedRUL / (eq.currentRunningHours / 365))} days`
                          : ''
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Next Maintenance</p>
                      <p className="text-sm font-semibold">
                        {eq.nextMaintenanceDue 
                          ? new Date(eq.nextMaintenanceDue).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </p>
                      {eq.nextMaintenanceDue && (
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.floor((new Date(eq.nextMaintenanceDue) - new Date()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      )}
                    </div>
                  </div>

                  {eq.aiPredictions && (
                    <div className="p-3 bg-white/70 rounded-lg border border-indigo-200 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-indigo-900">AI Prediction:</p>
                        <Badge className={getRiskColor(eq.aiPredictions.riskLevel).bg + ' ' + getRiskColor(eq.aiPredictions.riskLevel).text}>
                          {eq.aiPredictions.riskLevel} risk
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <p>Failure Probability: {(eq.aiPredictions.failureProbability * 100).toFixed(1)}%</p>
                        <p>Time to Failure: {eq.aiPredictions.timeToFailure}</p>
                        <p className="text-xs text-gray-500">
                          Confidence: {(eq.aiPredictions.confidenceScore * 100).toFixed(0)}%
                        </p>
                      </div>
                      {eq.aiPredictions.recommendedActions && eq.aiPredictions.recommendedActions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-indigo-200">
                          <p className="text-xs font-medium text-indigo-900 mb-1">Recommended:</p>
                          <ul className="space-y-1">
                            {eq.aiPredictions.recommendedActions.slice(0, 2).map((action, idx) => (
                              <li key={idx} className="text-xs text-gray-700">
                                → {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredEquipment.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No equipment records found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add equipment to start predictive maintenance monitoring
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Predictions Detail */}
      {predictions && (
        <div className="space-y-6">
          {/* Critical Alerts */}
          {predictions.criticalEquipment && predictions.criticalEquipment.length > 0 && (
            <Card className="border-2 border-red-400 bg-gradient-to-r from-red-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Critical Equipment Requiring Immediate Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.criticalEquipment.map((item, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border-2 border-red-300">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{item.equipmentId}</h4>
                          <p className="text-sm text-gray-600">{item.equipmentType?.replace(/_/g, ' ')}</p>
                        </div>
                        <Badge className="bg-red-600 text-white">
                          {item.urgency}
                        </Badge>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg mb-2">
                        <p className="text-sm font-semibold text-red-900 mb-1">
                          ⚠️ {item.predictedFailure}
                        </p>
                        <p className="text-xs text-red-700">
                          Estimated failure: {item.timeframe}
                        </p>
                      </div>
                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-medium text-gray-700">Immediate Actions:</p>
                        {item.immediateActions?.map((action, aidx) => (
                          <div key={aidx} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-xs text-gray-700">{action}</p>
                          </div>
                        ))}
                      </div>
                      {/* NEW: Create Work Order Button */}
                      <Button
                        onClick={() => handleCreateWorkOrder({
                          equipmentId: item.equipmentId,
                          equipmentType: item.equipmentType,
                          action: `${item.predictedFailure} - Critical maintenance required`,
                          priority: "critical",
                          timeline: item.timeframe,
                          reasoning: item.immediateActions?.join('; '),
                          expectedBenefit: "Prevent equipment failure and downtime"
                        })}
                        disabled={creatingWorkOrders[item.equipmentId]}
                        className="w-full bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        {creatingWorkOrders[item.equipmentId] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4 mr-2" />
                            Create Work Order Now
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parameter Drift Trends */}
          {predictions.parameterDrifts && predictions.parameterDrifts.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  Parameter Drift Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.parameterDrifts.map((drift, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg ${drift.severity === 'severe' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{drift.parameter}</h4>
                          <p className="text-sm text-gray-600">
                            Equipment: {drift.equipmentId} • Line {drift.line}
                          </p>
                        </div>
                        <Badge className={
                          drift.severity === 'severe' ? 'bg-red-100 text-red-800' :
                          drift.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {drift.severity} drift
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 text-xs mb-2">
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-semibold text-gray-900">{drift.currentValue}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Nominal</p>
                          <p className="font-semibold text-gray-900">{drift.nominalValue}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Drift Rate</p>
                          <p className="font-semibold text-orange-700">{drift.driftRate}/day</p>
                        </div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded mb-3">
                        <p className="text-xs text-blue-900">
                          <strong>Recommended:</strong> {drift.recommendation}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        Time to action: {drift.timeToAction}
                      </p>
                      {/* NEW: Create Work Order Button */}
                      <Button
                        onClick={() => handleCreateWorkOrder({
                          equipmentId: drift.equipmentId,
                          equipmentType: "Parameter Monitoring",
                          action: `Calibrate ${drift.parameter} - ${drift.recommendation}`,
                          priority: drift.severity === 'severe' ? 'urgent' : 'high',
                          timeline: drift.timeToAction,
                          reasoning: `Parameter drifting at ${drift.driftRate}/day from nominal value`,
                          expectedBenefit: "Prevent quality issues and equipment damage",
                          estimatedCost: drift.severity === 'severe' ? "$500-1000" : "$200-500"
                        })}
                        disabled={creatingWorkOrders[drift.equipmentId]}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {creatingWorkOrders[drift.equipmentId] ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-2" />
                            Create Calibration Work Order
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance Recommendations */}
          {predictions.maintenanceRecommendations && predictions.maintenanceRecommendations.length > 0 && (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Proactive Maintenance Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.maintenanceRecommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{rec.action}</h4>
                          <p className="text-sm text-gray-600">{rec.equipmentId} • {rec.equipmentType?.replace(/_/g, ' ')}</p>
                        </div>
                        <Badge className={
                          rec.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {rec.priority}
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3 text-xs mb-3">
                        <div>
                          <p className="text-gray-600">Timeline</p>
                          <p className="font-medium text-gray-900">{rec.timeline}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Est. Cost</p>
                          <p className="font-medium text-gray-900">{rec.estimatedCost}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Impact</p>
                          <p className="font-medium text-green-700">{rec.expectedBenefit}</p>
                        </div>
                      </div>
                      <div className="p-2 bg-green-50 rounded mb-3">
                        <p className="text-xs text-green-900">
                          <strong>Why:</strong> {rec.reasoning}
                        </p>
                      </div>
                      {/* NEW: Create Work Order Button */}
                      <Button
                        onClick={() => handleCreateWorkOrder(rec)}
                        disabled={creatingWorkOrders[rec.equipmentId]}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {creatingWorkOrders[rec.equipmentId] ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Creating Work Order...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-3 h-3 mr-2" />
                            Create Work Order
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Parameters to Monitor */}
          {predictions.criticalParametersToMonitor && predictions.criticalParametersToMonitor.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-blue-600" />
                  Critical Parameters to Monitor
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Key parameters showing degradation patterns
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {predictions.criticalParametersToMonitor.map((param, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{param.parameter}</h4>
                        <Badge className={
                          param.monitoringFrequency === 'continuous' ? 'bg-red-100 text-red-800' :
                          param.monitoringFrequency === 'hourly' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {param.monitoringFrequency}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        Equipment: {param.equipmentId}
                      </p>
                      <p className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                        {param.reason}
                      </p>
                      {param.thresholds && (
                        <div className="mt-2 text-xs">
                          <p className="text-gray-600">
                            Alert if: {param.thresholds.alertCondition}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Component RUL Estimates */}
          {predictions.componentRULEstimates && predictions.componentRULEstimates.length > 0 && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Component Remaining Useful Life (RUL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.componentRULEstimates.map((comp, idx) => {
                    const rulPercentage = (comp.estimatedRUL / comp.designLife) * 100;
                    const isLow = rulPercentage < 20;
                    
                    return (
                      <div key={idx} className={`p-4 rounded-lg border ${isLow ? 'bg-red-50 border-red-200' : 'bg-white border-purple-200'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{comp.component}</h4>
                            <p className="text-sm text-gray-600">
                              {comp.equipmentId} • Installed: {new Date(comp.installDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={isLow ? 'bg-red-600 text-white' : 'bg-purple-100 text-purple-800'}>
                            {comp.estimatedRUL}h remaining
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>RUL Progress</span>
                            <span>{rulPercentage.toFixed(1)}% of design life used</span>
                          </div>
                          <Progress 
                            value={100 - rulPercentage} 
                            className={`h-3 ${isLow ? 'bg-red-200' : ''}`}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                          <div>
                            <p className="text-gray-600">Design Life</p>
                            <p className="font-medium">{comp.designLife}h</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Current Usage</p>
                            <p className="font-medium">{comp.currentUsage}h</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Replacement Due</p>
                            <p className="font-medium">{comp.replacementDate}</p>
                          </div>
                        </div>
                        {comp.wearIndicators && comp.wearIndicators.length > 0 && (
                          <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-xs font-medium text-yellow-900 mb-1">Wear Indicators:</p>
                            <ul className="space-y-1">
                              {comp.wearIndicators.map((indicator, iidx) => (
                                <li key={iidx} className="text-xs text-gray-700">• {indicator}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* NEW: Create Work Order for Component Replacement */}
                        {isLow && (
                          <Button
                            onClick={() => handleCreateWorkOrder({
                              equipmentId: comp.equipmentId,
                              equipmentType: "Component Replacement",
                              action: `Replace ${comp.component} - End of life approaching`,
                              priority: "high",
                              timeline: `By ${comp.replacementDate}`,
                              reasoning: `Component has only ${comp.estimatedRUL}h remaining (${rulPercentage.toFixed(0)}% of design life)`,
                              expectedBenefit: "Prevent unexpected failure",
                              estimatedCost: "$1,000-3,000"
                            })}
                            disabled={creatingWorkOrders[comp.equipmentId]}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-300 text-red-700 hover:bg-red-50"
                          >
                            {creatingWorkOrders[comp.equipmentId] ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-2" />
                                Schedule Replacement
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failure Mode Predictions */}
          {predictions.failureModePredictions && predictions.failureModePredictions.length > 0 && (
            <Card className="border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  Predicted Failure Modes
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  AI-identified potential failure scenarios
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.failureModePredictions.map((failure, idx) => (
                    <div key={idx} className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{failure.failureMode}</h4>
                          <p className="text-sm text-gray-600">
                            Equipment: {failure.equipmentId} • Line {failure.line}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            failure.probability > 0.7 ? 'bg-red-100 text-red-800' :
                            failure.probability > 0.4 ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {(failure.probability * 100).toFixed(0)}% likely
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{failure.timeframe}</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs font-medium text-gray-700">Early Warning Signs:</p>
                          <ul className="text-xs text-gray-600 mt-1 space-y-1">
                            {failure.earlyWarnings?.map((warning, widx) => (
                              <li key={widx}>⚠️ {warning}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-xs font-medium text-blue-900">Preventive Actions:</p>
                          <ul className="text-xs text-blue-700 mt-1 space-y-1">
                            {failure.preventiveActions?.map((action, aidx) => (
                              <li key={aidx}>→ {action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Confidence: {(failure.confidence * 100).toFixed(0)}%
                      </p>
                      {/* NEW: Create Work Order Button */}
                      <Button
                        onClick={() => handleCreateWorkOrder({
                          equipmentId: failure.equipmentId,
                          equipmentType: "Failure Prevention",
                          action: `Prevent ${failure.failureMode}`,
                          priority: failure.probability > 0.7 ? 'urgent' : 'high',
                          timeline: failure.timeframe,
                          reasoning: failure.preventiveActions?.join('; '),
                          expectedBenefit: `Prevent ${failure.failureMode} failure`,
                          estimatedCost: "$500-2,000"
                        })}
                        disabled={creatingWorkOrders[failure.equipmentId]}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        size="sm"
                      >
                        {creatingWorkOrders[failure.equipmentId] ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-3 h-3 mr-2" />
                            Create Prevention Work Order
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimization Opportunities */}
          {predictions.optimizationOpportunities && predictions.optimizationOpportunities.length > 0 && (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  Equipment Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.optimizationOpportunities.map((opp, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-2">{opp.opportunity}</h4>
                      <p className="text-sm text-gray-700 mb-2">{opp.description}</p>
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="font-medium text-green-900">Expected Benefits:</p>
                          <ul className="mt-1 space-y-1">
                            {opp.benefits?.map((benefit, bidx) => (
                              <li key={bidx} className="text-green-700">✓ {benefit}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <p className="text-gray-600">
                            <strong>ROI:</strong> {opp.estimatedROI}
                          </p>
                          <p className="text-gray-600">
                            <strong>Implementation:</strong> {opp.implementationTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions if no data */}
      {equipment.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Database className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Equipment Data Available
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              To enable predictive maintenance, you need to:
            </p>
            <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-700">
              <p>1. Add equipment records (Dashboard → Equipment entity)</p>
              <p>2. Upload process run data with equipment parameters</p>
              <p>3. Link defects to equipment when they occur</p>
              <p>4. AI will automatically learn failure patterns</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}