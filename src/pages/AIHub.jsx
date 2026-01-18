import React, { useState, useEffect } from "react";
import { api } from '@/api/apiClient';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Loader2, FileText, GraduationCap, Lightbulb,
  Zap, CheckCircle2, Download, ExternalLink,
  Database, AlertTriangle, TrendingUp, FileBarChart, Brain,
  GitBranch, ClipboardList, Target, Wrench
} from "lucide-react";
import CustomReportBuilder from "../components/ai/CustomReportBuilder";
import PredictiveMaintenance from "../components/ai/PredictiveMaintenance";

export default function AIHub() {
  const [activeTab, setActiveTab] = useState("defect-analysis");
  const [loading, setLoading] = useState(false);
  
  // Defect Analysis
  const [selectedDefectIds, setSelectedDefectIds] = useState([]);
  const [selectedProcessRunIds, setSelectedProcessRunIds] = useState([]);
  const [defectInput, setDefectInput] = useState("");
  const [results, setResults] = useState(null);
  
  // Training
  const [selectedDefectsForTraining, setSelectedDefectsForTraining] = useState([]);
  const [selectedSOPsForTraining, setSelectedSOPsForTraining] = useState([]);
  const [trainingTopic, setTrainingTopic] = useState("");
  const [trainingContent, setTrainingContent] = useState(null);
  
  // SOP
  const [selectedDefectsForSOP, setSelectedDefectsForSOP] = useState([]);
  const [selectedRCAsForSOP, setSelectedRCAsForSOP] = useState([]);
  const [sopPrompt, setSopPrompt] = useState("");
  const [sopContent, setSopContent] = useState(null);
  
  // Automation
  const [selectedProcessRunsForAuto, setSelectedProcessRunsForAuto] = useState([]);
  const [selectedDefectsForAuto, setSelectedDefectsForAuto] = useState([]);
  const [processDescription, setProcessDescription] = useState("");
  const [automationSuggestions, setAutomationSuggestions] = useState(null);
  
  // Custom Reports
  const [customReportResult, setCustomReportResult] = useState(null);
  
  // Predictive Maintenance
  const [predictiveMaintenanceResults, setPredictiveMaintenanceResults] = useState(null);

  const { data: defects = [] } = useQuery({
    queryKey: ['recent-defects'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 50),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-ai'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 30),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-ai'],
    queryFn: () => api.entities.CAPAPlan.list("-created_date", 30),
  });

  const { data: does = [] } = useQuery({
    queryKey: ['does-ai'],
    queryFn: () => api.entities.DoE.list("-created_date", 30),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-pm'],
    queryFn: () => api.entities.Equipment.list("-created_date", 50),
  });

  useEffect(() => {
    if (window.location.hash === "#custom-reports") {
      setActiveTab("custom-reports");
    }
  }, []);

  const lines = [...new Set([...defects.map(d => d.line), ...processRuns.map(r => r.line)].filter(Boolean))];
  const products = [...new Set([...defects.map(d => d.productCode), ...processRuns.map(r => r.productCode)].filter(Boolean))];
  const uniqueDefectTypes = [...new Set(defects.map(d => d.defectType).filter(Boolean))];

  const analyzeDefects = async () => {
    if (selectedDefectIds.length === 0 && selectedProcessRunIds.length === 0) return;
    
    setLoading(true);
    try {
      const defectsToAnalyze = defects.filter(d => selectedDefectIds.includes(d.id));
      const processRunsToAnalyze = processRuns.filter(r => selectedProcessRunIds.includes(r.id));
      
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Perform comprehensive root cause analysis on:

DEFECTS: ${JSON.stringify(defectsToAnalyze.map(d => ({ 
  id: d.id.slice(0,8), 
  type: d.defectType, 
  severity: d.severity, 
  line: d.line, 
  product: d.productCode,
  dateTime: d.dateTime 
})))}

PROCESS RUNS: ${JSON.stringify(processRunsToAnalyze.map(r => ({ 
  id: r.id.slice(0,8),
  line: r.line, 
  product: r.productCode,
  lineSpeed: r.lineSpeed,
  webTension: r.webTensionIn,
  nipPressure: r.nipPressure,
  dateTime: r.dateTimeStart
})))}

Additional Context: ${defectInput}

Provide detailed analysis with:
1. Root causes with confidence scores (0-1) and categories
2. Parameter correlations from process runs
3. Specific corrective actions
4. Preventive actions
5. Key findings summary`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            rootCauses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause: { type: "string" },
                  confidenceScore: { type: "number" },
                  category: { type: "string" },
                  affectedDefects: { type: "array", items: { type: "string" } }
                }
              }
            },
            parameterCorrelations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  correlation: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            correctiveActions: { type: "array", items: { type: "string" } },
            preventiveActions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setResults({ type: 'defect', data: result });
    } catch (error) {
      console.error("Analysis error:", error);
    }
    setLoading(false);
  };

  const generateTraining = async () => {
    if (!trainingTopic.trim() && selectedDefectsForTraining.length === 0 && selectedSOPsForTraining.length === 0) return;
    
    setLoading(true);
    try {
      const selectedDefects = defects.filter(d => selectedDefectsForTraining.includes(d.id));
      const selectedSOPs = await Promise.all(
        selectedSOPsForTraining.map(id => api.entities.SOP.filter({ id }))
      ).then(results => results.flat());

      const contextInfo = `
SELECTED DEFECTS FOR TRAINING: ${JSON.stringify(selectedDefects.map(d => ({ type: d.defectType, severity: d.severity, line: d.line })))}
RELATED SOPs: ${JSON.stringify(selectedSOPs.map(s => ({ title: s.title, processStep: s.processStep })))}
      `.trim();

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Create a comprehensive training module for: ${trainingTopic}

${contextInfo}

Include objectives, step-by-step procedures, safety considerations, and assessment questions.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            objectives: { type: "array", items: { type: "string" } },
            procedures: { type: "array", items: { type: "object", properties: { step: { type: "number" }, instruction: { type: "string" } } } },
            safetyConsiderations: { type: "array", items: { type: "string" } },
            assessment: { type: "array", items: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } }, correctAnswer: { type: "number" } } } }
          }
        }
      });
      setTrainingContent(result);
    } catch (error) {
      console.error("Training error:", error);
    }
    setLoading(false);
  };

  const generateSOP = async () => {
    if (!sopPrompt.trim() && selectedDefectsForSOP.length === 0 && selectedRCAsForSOP.length === 0) return;
    
    setLoading(true);
    try {
      const selectedDefects = defects.filter(d => selectedDefectsForSOP.includes(d.id));
      const selectedRCAs = rcas.filter(r => selectedRCAsForSOP.includes(r.id));

      const contextInfo = `
RELATED DEFECTS: ${JSON.stringify(selectedDefects.map(d => ({ type: d.defectType, line: d.line, actions: d.immediateAction })))}
RELATED RCA FINDINGS: ${JSON.stringify(selectedRCAs.map(r => ({ rootCauses: r.rootCauses?.map(rc => rc.cause) })))}
      `.trim();

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Create a detailed SOP for: ${sopPrompt}

${contextInfo}

Include title, scope, required materials/equipment, critical parameters with limits, step-by-step procedure, and safety precautions.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            scope: { type: "string" },
            materialsEquipment: { type: "array", items: { type: "string" } },
            procedureSteps: { type: "array", items: { type: "object", properties: { step: { type: "number" }, instruction: { type: "string" } } } },
            safetyPrecautions: { type: "array", items: { type: "string" } }
          }
        }
      });
      setSopContent(result);
    } catch (error) {
      console.error("SOP error:", error);
    }
    setLoading(false);
  };

  const suggestAutomation = async () => {
    if (!processDescription.trim() && selectedProcessRunsForAuto.length === 0 && selectedDefectsForAuto.length === 0) return;
    
    setLoading(true);
    try {
      const selectedRuns = processRuns.filter(r => selectedProcessRunsForAuto.includes(r.id));
      const selectedDefects = defects.filter(d => selectedDefectsForAuto.includes(d.id));

      const contextInfo = `
PROCESS RUN DATA: ${JSON.stringify(selectedRuns.map(r => ({ line: r.line, lineSpeed: r.lineSpeed, webTension: r.webTensionIn, alarms: r.alarms?.length || 0 })))}
RECURRING DEFECTS: ${JSON.stringify(selectedDefects.map(d => ({ type: d.defectType, frequency: 1 })))}
      `.trim();

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Suggest process automation opportunities for: ${processDescription}

${contextInfo}

Include automation opportunities, required IoT sensors, estimated ROI, and implementation timeline.`,
        response_json_schema: {
          type: "object",
          properties: {
            automationOpportunities: { type: "array", items: { type: "object", properties: { area: { type: "string" }, opportunity: { type: "string" }, estimatedROI: { type: "string" } } } },
            iotSensors: { type: "array", items: { type: "object", properties: { sensor: { type: "string" }, purpose: { type: "string" } } } }
          }
        }
      });
      setAutomationSuggestions(result);
    } catch (error) {
      console.error("Automation error:", error);
    }
    setLoading(false);
  };

  const generateCustomReport = async (config, resetForm) => {
    setLoading(true);
    try {
      // Build context from actual data
      const filteredDefects = defects.filter(d => {
        if (config.filters.lines.length > 0 && !config.filters.lines.includes(d.line)) return false;
        if (config.filters.products.length > 0 && !config.filters.products.includes(d.productCode)) return false;
        if (config.filters.defectTypes.length > 0 && !config.filters.defectTypes.includes(d.defectType)) return false;
        if (config.filters.severities.length > 0 && !config.filters.severities.includes(d.severity)) return false;
        return true;
      });

      const defectStats = {
        total: filteredDefects.length,
        critical: filteredDefects.filter(d => d.severity === 'critical').length,
        major: filteredDefects.filter(d => d.severity === 'major').length,
        minor: filteredDefects.filter(d => d.severity === 'minor').length,
        topTypes: Object.entries(filteredDefects.reduce((acc, d) => {
          acc[d.defectType] = (acc[d.defectType] || 0) + 1;
          return acc;
        }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
      };

      const capaStats = {
        total: capas.length,
        open: capas.filter(c => c.approvalState !== 'closed').length,
        closed: capas.filter(c => c.approvalState === 'closed').length
      };

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive quality report.

REPORT CONFIGURATION:
- Report Name: ${config.reportName}
- Template: ${config.template}
- Date Range: ${config.filters.dateRange}
- Lines Filter: ${config.filters.lines.length > 0 ? config.filters.lines.join(', ') : 'All'}
- Products Filter: ${config.filters.products.length > 0 ? config.filters.products.join(', ') : 'All'}
- Metrics Requested: ${config.metrics.join(', ')}

ACTUAL DATA CONTEXT:
- Total Defects: ${defectStats.total} (Critical: ${defectStats.critical}, Major: ${defectStats.major}, Minor: ${defectStats.minor})
- Top Defect Types: ${defectStats.topTypes.map(([type, count]) => `${type}: ${count}`).join(', ')}
- CAPA Status: ${capaStats.total} total (${capaStats.open} open, ${capaStats.closed} closed)
- Process Runs: ${processRuns.length} total

Generate a detailed report with:
1. Executive Summary (3-5 key findings)
2. Key Performance Indicators with actual values
3. Trend analysis observations
4. Root cause patterns identified
5. Specific recommendations with priority
6. Risk assessment
7. Action items with owners and deadlines`,
        response_json_schema: {
          type: "object",
          properties: {
            reportTitle: { type: "string" },
            generatedDate: { type: "string" },
            executiveSummary: { type: "array", items: { type: "string" } },
            kpiMetrics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  value: { type: "string" },
                  status: { type: "string" },
                  trend: { type: "string" }
                }
              }
            },
            trends: { type: "array", items: { type: "string" } },
            rootCausePatterns: { type: "array", items: { type: "string" } },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  priority: { type: "string" },
                  expectedImpact: { type: "string" }
                }
              }
            },
            riskAssessment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  mitigation: { type: "string" }
                }
              }
            },
            actionItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  owner: { type: "string" },
                  deadline: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      setCustomReportResult({
        ...result,
        generatedDate: new Date().toLocaleString(),
        config: config
      });
      
      // Reset form after successful generation
      if (resetForm) {
        resetForm();
      }
    } catch (error) {
      console.error("Report error:", error);
    }
    setLoading(false);
  };

  const runPredictiveMaintenanceAnalysis = async () => {
    setLoading(true);
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze equipment health for predictive maintenance based on ${equipment.length} equipment items.`,
        response_json_schema: {
          type: "object",
          properties: {
            criticalEquipment: { type: "array", items: { type: "object", properties: { equipmentId: { type: "string" }, predictedFailure: { type: "string" } } } },
            maintenanceRecommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
      setPredictiveMaintenanceResults(result);
    } catch (error) {
      console.error("Maintenance error:", error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Intelligence Hub</h1>
              <p className="text-gray-600 mt-1">AI-powered quality analysis and process optimization</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-6">
            <TabsList className="w-max">
              <TabsTrigger value="defect-analysis">
                <Zap className="w-4 h-4 mr-2" />
                Defect Analysis
              </TabsTrigger>
              <TabsTrigger value="predictive-maintenance">
                <Wrench className="w-4 h-4 mr-2" />
                Pred. Maint.
              </TabsTrigger>
              <TabsTrigger value="custom-reports">
                <FileBarChart className="w-4 h-4 mr-2" />
                Custom Reports
              </TabsTrigger>
              <TabsTrigger value="training">
                <GraduationCap className="w-4 h-4 mr-2" />
                Training
              </TabsTrigger>
              <TabsTrigger value="sop">
                <FileText className="w-4 h-4 mr-2" />
                SOP
              </TabsTrigger>
              <TabsTrigger value="automation">
                <Lightbulb className="w-4 h-4 mr-2" />
                Automation
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="defect-analysis">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    AI Defect & Process Analysis
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Select defects and/or process runs to analyze
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Select Defects */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Defects to Analyze</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2 bg-gray-50">
                      {defects.length > 0 ? (
                        defects.slice(0, 20).map((defect) => (
                          <div key={defect.id} className="flex items-start gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-purple-200 transition-all">
                            <input
                              type="checkbox"
                              id={`defect-${defect.id}`}
                              checked={selectedDefectIds.includes(defect.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDefectIds([...selectedDefectIds, defect.id]);
                                } else {
                                  setSelectedDefectIds(selectedDefectIds.filter(id => id !== defect.id));
                                }
                              }}
                              className="mt-1"
                            />
                            <label htmlFor={`defect-${defect.id}`} className="flex-1 cursor-pointer text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{defect.defectType?.replace(/_/g, ' ')}</Badge>
                                <Badge className={
                                  defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  defect.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }>{defect.severity}</Badge>
                              </div>
                              <p className="text-xs text-gray-600">
                                Line {defect.line} • {defect.productCode} • {new Date(defect.dateTime || defect.created_date).toLocaleDateString()}
                              </p>
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No defects available</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedDefectIds.length} defect(s) selected
                    </p>
                  </div>

                  {/* Select Process Runs */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Process Runs to Analyze</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2 bg-gray-50">
                      {processRuns.length > 0 ? (
                        processRuns.slice(0, 20).map((run) => (
                          <div key={run.id} className="flex items-start gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-blue-200 transition-all">
                            <input
                              type="checkbox"
                              id={`run-${run.id}`}
                              checked={selectedProcessRunIds.includes(run.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProcessRunIds([...selectedProcessRunIds, run.id]);
                                } else {
                                  setSelectedProcessRunIds(selectedProcessRunIds.filter(id => id !== run.id));
                                }
                              }}
                              className="mt-1"
                            />
                            <label htmlFor={`run-${run.id}`} className="flex-1 cursor-pointer text-sm">
                              <p className="font-medium text-gray-900">
                                {run.productCode} • {run.line?.startsWith('Line') ? run.line : `Line ${run.line}`}
                              </p>
                              <p className="text-xs text-gray-600">
                                {new Date(run.dateTimeStart).toLocaleString()} • Speed: {run.lineSpeed}m/min
                              </p>
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No process runs available</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedProcessRunIds.length} process run(s) selected
                    </p>
                  </div>

                  {/* Additional Context */}
                  <div>
                    <Label>Additional Context (Optional)</Label>
                    <Textarea
                      value={defectInput}
                      onChange={(e) => setDefectInput(e.target.value)}
                      placeholder="Add specific concerns, patterns you've noticed, or questions..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={analyzeDefects} 
                    disabled={loading || (selectedDefectIds.length === 0 && selectedProcessRunIds.length === 0)} 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze Selected Items with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Results Panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Analysis Results</CardTitle>
                    {results?.type === 'defect' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResults(null)}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reportText = `
================================================================================
                    DEFECT ANALYSIS REPORT
================================================================================
Generated: ${new Date().toLocaleString()}
================================================================================

EXECUTIVE SUMMARY
-----------------
${results.data.summary || 'N/A'}

ROOT CAUSES
-----------
${results.data.rootCauses?.map((c, i) => `${i+1}. ${c.cause}\n   Confidence: ${(c.confidenceScore * 100).toFixed(0)}%\n   Category: ${c.category}`).join('\n\n') || 'N/A'}

PARAMETER CORRELATIONS
----------------------
${results.data.parameterCorrelations?.map((c, i) => `${i+1}. ${c.parameter}\n   Correlation: ${c.correlation}\n   Recommendation: ${c.recommendation}`).join('\n\n') || 'N/A'}

CORRECTIVE ACTIONS
------------------
${results.data.correctiveActions?.map((a, i) => `${i+1}. ${a}`).join('\n') || 'N/A'}

PREVENTIVE ACTIONS
------------------
${results.data.preventiveActions?.map((a, i) => `${i+1}. ${a}`).join('\n') || 'N/A'}

================================================================================
                         END OF REPORT
================================================================================
                            `;
                            const blob = new Blob([reportText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `defect-analysis-${new Date().toISOString().split('T')[0]}.txt`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                  {results?.type === 'defect' ? (
                    <>
                      {results.data.summary && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-2">Executive Summary</h4>
                          <p className="text-sm text-blue-800">{results.data.summary}</p>
                        </div>
                      )}

                      {results.data.rootCauses && results.data.rootCauses.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            Root Causes
                          </h4>
                          {results.data.rootCauses.map((cause, idx) => (
                            <div key={idx} className="p-3 mb-2 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-sm font-medium flex-1">{cause.cause}</p>
                                <Badge className="bg-purple-100 text-purple-800">
                                  {(cause.confidenceScore * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">Category: {cause.category}</p>
                              {cause.affectedDefects && cause.affectedDefects.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Affects: {cause.affectedDefects.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {results.data.parameterCorrelations && results.data.parameterCorrelations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            Parameter Correlations
                          </h4>
                          {results.data.parameterCorrelations.map((corr, idx) => (
                            <div key={idx} className="p-3 mb-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-medium text-blue-900">{corr.parameter}</p>
                              <p className="text-xs text-blue-700 mt-1">{corr.correlation}</p>
                              <p className="text-xs text-blue-600 mt-1 font-medium">→ {corr.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {results.data.correctiveActions && results.data.correctiveActions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Corrective Actions
                          </h4>
                          {results.data.correctiveActions.map((action, idx) => (
                            <div key={idx} className="p-2 mb-2 bg-green-50 rounded border border-green-200">
                              <p className="text-sm text-green-900">{action}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {results.data.preventiveActions && results.data.preventiveActions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-indigo-600" />
                            Preventive Actions
                          </h4>
                          {results.data.preventiveActions.map((action, idx) => (
                            <div key={idx} className="p-2 mb-2 bg-indigo-50 rounded border border-indigo-200">
                              <p className="text-sm text-indigo-900">{action}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">Select items and run analysis to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictive-maintenance">
            <PredictiveMaintenance
              equipment={equipment}
              processRuns={processRuns}
              defects={defects}
              onRunPrediction={runPredictiveMaintenanceAnalysis}
              predictions={predictiveMaintenanceResults}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="custom-reports">
            <div className="grid lg:grid-cols-2 gap-6">
              <CustomReportBuilder
                onGenerate={generateCustomReport}
                loading={loading}
                lines={lines}
                products={products}
                defectTypes={uniqueDefectTypes}
                capaPlans={capas}
                onReset={(resetFn) => window._resetReportForm = resetFn}
              />
              
              <Card>
                <CardContent className="p-6 max-h-[800px] overflow-y-auto">
                  {customReportResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{customReportResult.reportTitle}</h3>
                          <p className="text-xs text-gray-500">Generated: {customReportResult.generatedDate}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCustomReportResult(null);
                              if (window._resetReportForm) {
                                window._resetReportForm();
                              }
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const reportText = `
================================================================================
                          QUALITY REPORT
================================================================================
Report: ${customReportResult.reportTitle}
Generated: ${customReportResult.generatedDate}
================================================================================

EXECUTIVE SUMMARY
-----------------
${customReportResult.executiveSummary?.map((s, i) => `${i+1}. ${s}`).join('\n') || 'N/A'}

KEY PERFORMANCE INDICATORS
--------------------------
${customReportResult.kpiMetrics?.map(m => `• ${m.metric}: ${m.value} (${m.status}) - Trend: ${m.trend}`).join('\n') || 'N/A'}

TREND ANALYSIS
--------------
${customReportResult.trends?.map((t, i) => `${i+1}. ${t}`).join('\n') || 'N/A'}

ROOT CAUSE PATTERNS
-------------------
${customReportResult.rootCausePatterns?.map((r, i) => `${i+1}. ${r}`).join('\n') || 'N/A'}

RECOMMENDATIONS
---------------
${customReportResult.recommendations?.map((r, i) => `${i+1}. [${r.priority}] ${r.recommendation}\n   Expected Impact: ${r.expectedImpact}`).join('\n\n') || 'N/A'}

RISK ASSESSMENT
---------------
${customReportResult.riskAssessment?.map((r, i) => `${i+1}. ${r.risk}\n   Severity: ${r.severity}\n   Mitigation: ${r.mitigation}`).join('\n\n') || 'N/A'}

ACTION ITEMS
------------
${customReportResult.actionItems?.map((a, i) => `${i+1}. ${a.action}\n   Owner: ${a.owner} | Deadline: ${a.deadline}`).join('\n\n') || 'N/A'}

================================================================================
                          END OF REPORT
================================================================================
                              `;
                              const blob = new Blob([reportText], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `quality-report-${new Date().toISOString().split('T')[0]}.txt`;
                              a.click();
                            }}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      
                      {/* Executive Summary */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📋 Executive Summary</h4>
                        <ul className="space-y-2">
                          {customReportResult.executiveSummary?.map((item, idx) => (
                            <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* KPI Metrics */}
                      {customReportResult.kpiMetrics?.length > 0 && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-purple-900 mb-3">📊 Key Performance Indicators</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {customReportResult.kpiMetrics.map((kpi, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100">
                                <p className="text-xs text-gray-600">{kpi.metric}</p>
                                <p className="text-lg font-bold text-purple-900">{kpi.value}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={
                                    kpi.status === 'good' || kpi.status === 'Good' ? 'bg-green-100 text-green-800' :
                                    kpi.status === 'warning' || kpi.status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }>{kpi.status}</Badge>
                                  <span className="text-xs text-gray-500">{kpi.trend}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trends */}
                      {customReportResult.trends?.length > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-2">📈 Trend Analysis</h4>
                          <ul className="space-y-2">
                            {customReportResult.trends.map((trend, idx) => (
                              <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                                {trend}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Root Cause Patterns */}
                      {customReportResult.rootCausePatterns?.length > 0 && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <h4 className="font-semibold text-orange-900 mb-2">🔍 Root Cause Patterns</h4>
                          <ul className="space-y-2">
                            {customReportResult.rootCausePatterns.map((pattern, idx) => (
                              <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                                {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {customReportResult.recommendations?.length > 0 && (
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <h4 className="font-semibold text-indigo-900 mb-3">💡 Recommendations</h4>
                          <div className="space-y-3">
                            {customReportResult.recommendations.map((rec, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="text-sm font-medium text-indigo-900">{rec.recommendation}</p>
                                  <Badge className={
                                    rec.priority === 'High' || rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    rec.priority === 'Medium' || rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }>{rec.priority}</Badge>
                                </div>
                                <p className="text-xs text-gray-600">Impact: {rec.expectedImpact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risk Assessment */}
                      {customReportResult.riskAssessment?.length > 0 && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-900 mb-3">⚠️ Risk Assessment</h4>
                          <div className="space-y-3">
                            {customReportResult.riskAssessment.map((risk, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-red-100">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="text-sm font-medium text-red-900">{risk.risk}</p>
                                  <Badge className={
                                    risk.severity === 'High' || risk.severity === 'high' ? 'bg-red-600 text-white' :
                                    risk.severity === 'Medium' || risk.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }>{risk.severity}</Badge>
                                </div>
                                <p className="text-xs text-gray-600">Mitigation: {risk.mitigation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Items */}
                      {customReportResult.actionItems?.length > 0 && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-3">✅ Action Items</h4>
                          <div className="space-y-2">
                            {customReportResult.actionItems.map((action, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-lg border flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium">{action.action}</p>
                                  <p className="text-xs text-gray-500 mt-1">Owner: {action.owner}</p>
                                </div>
                                <Badge variant="outline">{action.deadline}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileBarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Configure and generate your report</p>
                      <p className="text-xs text-gray-400 mt-2">Select metrics, filters, and click Generate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    AI Training Generator
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Select defects or SOPs to generate contextual training</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Training Topic</Label>
                    <Textarea
                      value={trainingTopic}
                      onChange={(e) => setTrainingTopic(e.target.value)}
                      placeholder="E.g., Proper web tension control during lamination..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Related Defects (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                      {defects.slice(0, 15).map((defect) => (
                        <div key={defect.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`train-defect-${defect.id}`}
                            checked={selectedDefectsForTraining.includes(defect.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDefectsForTraining([...selectedDefectsForTraining, defect.id]);
                              } else {
                                setSelectedDefectsForTraining(selectedDefectsForTraining.filter(id => id !== defect.id));
                              }
                            }}
                          />
                          <label htmlFor={`train-defect-${defect.id}`} className="cursor-pointer">
                            {defect.defectType?.replace(/_/g, ' ')} • Line {defect.line}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedDefectsForTraining.length} selected</p>
                  </div>

                  <Button 
                    onClick={generateTraining} 
                    disabled={loading || (!trainingTopic.trim() && selectedDefectsForTraining.length === 0)} 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Training</>}
                  </Button>
                </CardContent>
              </Card>

              {trainingContent && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{trainingContent.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrainingContent(null)}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const trainingText = `
================================================================================
                    TRAINING MODULE
================================================================================
Title: ${trainingContent.title}
Generated: ${new Date().toLocaleString()}
================================================================================

LEARNING OBJECTIVES
-------------------
${trainingContent.objectives?.map((o, i) => `${i+1}. ${o}`).join('\n') || 'N/A'}

PROCEDURES
----------
${trainingContent.procedures?.map(p => `Step ${p.step}: ${p.instruction}`).join('\n\n') || 'N/A'}

SAFETY CONSIDERATIONS
---------------------
${trainingContent.safetyConsiderations?.map((s, i) => `${i+1}. ${s}`).join('\n') || 'N/A'}

ASSESSMENT QUESTIONS
--------------------
${trainingContent.assessment?.map((q, i) => `${i+1}. ${q.question}\n   Options: ${q.options?.join(', ')}\n   Correct Answer: Option ${q.correctAnswer + 1}`).join('\n\n') || 'N/A'}

================================================================================
                         END OF TRAINING MODULE
================================================================================
                            `;
                            const blob = new Blob([trainingText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `training-${trainingContent.title?.replace(/\s+/g, '-')}.txt`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    {trainingContent.objectives && (
                      <div>
                        <h4 className="font-semibold mb-2">Learning Objectives</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {trainingContent.objectives.map((obj, idx) => (
                            <li key={idx} className="text-sm">{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {trainingContent.procedures && (
                      <div>
                        <h4 className="font-semibold mb-2">Procedures</h4>
                        {trainingContent.procedures.map((proc, idx) => (
                          <div key={idx} className="p-2 mb-2 bg-blue-50 rounded">
                            <p className="text-sm">Step {proc.step}: {proc.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {trainingContent.safetyConsiderations?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Safety Considerations</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {trainingContent.safetyConsiderations.map((item, idx) => (
                            <li key={idx} className="text-red-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {trainingContent.assessment?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Assessment Questions</h4>
                        {trainingContent.assessment.map((q, idx) => (
                          <div key={idx} className="p-3 mb-2 bg-gray-50 rounded border">
                            <p className="text-sm font-medium">{idx+1}. {q.question}</p>
                            {q.options && (
                              <ul className="mt-2 space-y-1">
                                {q.options.map((opt, optIdx) => (
                                  <li key={optIdx} className={`text-xs pl-4 ${optIdx === q.correctAnswer ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    {String.fromCharCode(65 + optIdx)}. {opt} {optIdx === q.correctAnswer && '✓'}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sop">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    AI SOP Generator
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Select defects or RCAs to generate contextual SOPs</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>SOP Description</Label>
                    <Textarea
                      value={sopPrompt}
                      onChange={(e) => setSopPrompt(e.target.value)}
                      placeholder="E.g., Line startup procedure for PPF production..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Related Defects (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                      {defects.slice(0, 15).map((defect) => (
                        <div key={defect.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`sop-defect-${defect.id}`}
                            checked={selectedDefectsForSOP.includes(defect.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDefectsForSOP([...selectedDefectsForSOP, defect.id]);
                              } else {
                                setSelectedDefectsForSOP(selectedDefectsForSOP.filter(id => id !== defect.id));
                              }
                            }}
                          />
                          <label htmlFor={`sop-defect-${defect.id}`} className="cursor-pointer">
                            {defect.defectType?.replace(/_/g, ' ')} • {defect.immediateAction?.slice(0, 40) || 'No action'}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedDefectsForSOP.length} selected</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Related RCAs (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                      {rcas.slice(0, 10).map((rca) => (
                        <div key={rca.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`sop-rca-${rca.id}`}
                            checked={selectedRCAsForSOP.includes(rca.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRCAsForSOP([...selectedRCAsForSOP, rca.id]);
                              } else {
                                setSelectedRCAsForSOP(selectedRCAsForSOP.filter(id => id !== rca.id));
                              }
                            }}
                          />
                          <label htmlFor={`sop-rca-${rca.id}`} className="cursor-pointer">
                            RCA #{rca.id.slice(0, 8)} • {rca.analyst}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedRCAsForSOP.length} selected</p>
                  </div>

                  <Button 
                    onClick={generateSOP} 
                    disabled={loading || (!sopPrompt.trim() && selectedDefectsForSOP.length === 0 && selectedRCAsForSOP.length === 0)} 
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate SOP</>}
                  </Button>
                </CardContent>
              </Card>

              {sopContent && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{sopContent.title}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const sopText = `
SOP: ${sopContent.title}
========================
Scope: ${sopContent.scope}

Materials/Equipment:
${sopContent.materialsEquipment?.map(m => `- ${m}`).join('\n') || 'N/A'}

Procedure:
${sopContent.procedureSteps?.map(s => `Step ${s.step}: ${s.instruction}`).join('\n') || 'N/A'}

Safety Precautions:
${sopContent.safetyPrecautions?.map(s => `- ${s}`).join('\n') || 'N/A'}
                            `;
                            const blob = new Blob([sopText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `SOP-${sopContent.title?.replace(/\s+/g, '-')}.txt`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            try {
                              const user = await api.auth.me();
                              await api.entities.SOP.create({
                                title: sopContent.title,
                                sopNumber: `SOP-${Date.now().toString().slice(-6)}`,
                                version: "1.0",
                                processStep: "AI Generated",
                                scope: sopContent.scope,
                                materialsTools: sopContent.materialsEquipment || [],
                                procedureSteps: sopContent.procedureSteps?.map((s, i) => ({
                                  stepNumber: s.step || i + 1,
                                  instruction: s.instruction
                                })) || [],
                                status: "draft",
                                author: user.email,
                                aiGenerated: true
                              });
                              alert("SOP saved to library!");
                            } catch (error) {
                              console.error("Save error:", error);
                              alert("Failed to save SOP");
                            }
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Save to Library
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    <p className="text-sm">{sopContent.scope}</p>
                    {sopContent.materialsEquipment?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Materials & Equipment</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {sopContent.materialsEquipment.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sopContent.procedureSteps && (
                      <div>
                        <h4 className="font-semibold mb-2">Procedure</h4>
                        {sopContent.procedureSteps.map((step, idx) => (
                          <div key={idx} className="p-2 mb-2 bg-orange-50 rounded">
                            <p className="text-sm">Step {step.step}: {step.instruction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {sopContent.safetyPrecautions?.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Safety Precautions</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {sopContent.safetyPrecautions.map((item, idx) => (
                            <li key={idx} className="text-red-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="automation">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                    AI Automation Advisor
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Select process runs or defects to identify automation opportunities</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Process Description</Label>
                    <Textarea
                      value={processDescription}
                      onChange={(e) => setProcessDescription(e.target.value)}
                      placeholder="Describe your process challenges and manual tasks..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Process Runs (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                      {processRuns.slice(0, 15).map((run) => (
                        <div key={run.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`auto-run-${run.id}`}
                            checked={selectedProcessRunsForAuto.includes(run.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProcessRunsForAuto([...selectedProcessRunsForAuto, run.id]);
                              } else {
                                setSelectedProcessRunsForAuto(selectedProcessRunsForAuto.filter(id => id !== run.id));
                              }
                            }}
                          />
                          <label htmlFor={`auto-run-${run.id}`} className="cursor-pointer">
                            Line {run.line} • {run.productCode} • {run.alarms?.length || 0} alarms
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedProcessRunsForAuto.length} selected</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Select Recurring Defects (Optional)</Label>
                    <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                      {defects.slice(0, 15).map((defect) => (
                        <div key={defect.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            id={`auto-defect-${defect.id}`}
                            checked={selectedDefectsForAuto.includes(defect.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDefectsForAuto([...selectedDefectsForAuto, defect.id]);
                              } else {
                                setSelectedDefectsForAuto(selectedDefectsForAuto.filter(id => id !== defect.id));
                              }
                            }}
                          />
                          <label htmlFor={`auto-defect-${defect.id}`} className="cursor-pointer">
                            {defect.defectType?.replace(/_/g, ' ')} • Line {defect.line}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedDefectsForAuto.length} selected</p>
                  </div>

                  <Button 
                    onClick={suggestAutomation} 
                    disabled={loading || (!processDescription.trim() && selectedProcessRunsForAuto.length === 0 && selectedDefectsForAuto.length === 0)} 
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />Get Suggestions</>}
                  </Button>
                </CardContent>
              </Card>

              {automationSuggestions && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Automation Opportunities</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAutomationSuggestions(null)}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const autoText = `
================================================================================
                    AUTOMATION ANALYSIS REPORT
================================================================================
Generated: ${new Date().toLocaleString()}
================================================================================

AUTOMATION OPPORTUNITIES
------------------------
${automationSuggestions.automationOpportunities?.map((o, i) => `${i+1}. ${o.area}\n   Opportunity: ${o.opportunity}\n   Estimated ROI: ${o.estimatedROI}`).join('\n\n') || 'N/A'}

RECOMMENDED IoT SENSORS
-----------------------
${automationSuggestions.iotSensors?.map((s, i) => `${i+1}. ${s.sensor}\n   Purpose: ${s.purpose}`).join('\n\n') || 'N/A'}

================================================================================
                         END OF REPORT
================================================================================
                            `;
                            const blob = new Blob([autoText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `automation-analysis-${new Date().toISOString().split('T')[0]}.txt`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                    {automationSuggestions.automationOpportunities?.map((opp, idx) => (
                      <div key={idx} className="p-3 bg-indigo-50 rounded border">
                        <h4 className="font-semibold text-sm">{opp.area}</h4>
                        <p className="text-sm text-gray-700 mt-1">{opp.opportunity}</p>
                        <p className="text-xs text-gray-600 mt-1">ROI: {opp.estimatedROI}</p>
                      </div>
                    ))}
                    {automationSuggestions.iotSensors?.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold mb-3">Recommended IoT Sensors</h4>
                        {automationSuggestions.iotSensors.map((sensor, idx) => (
                          <div key={idx} className="p-3 mb-2 bg-purple-50 rounded border border-purple-200">
                            <p className="text-sm font-medium text-purple-900">{sensor.sensor}</p>
                            <p className="text-xs text-purple-700 mt-1">{sensor.purpose}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}