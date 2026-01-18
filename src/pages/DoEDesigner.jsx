import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FlaskConical, Plus, Play, CheckCircle2, Clock,
  TrendingUp, Sparkles, Loader2, Download, Database,
  Sliders, Save, BarChart3, AlertTriangle, History
} from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DoEDesigner() {
  const [activeTab, setActiveTab] = useState("list");
  const [newDoE, setNewDoE] = useState({
    objective: "",
    designType: "full_factorial_2k",
    factors: [],
    responseVariables: [],
    relatedDefectId: "", // NEW: Add relatedDefectId
    linkedProductCode: "", // NEW: Add linkedProductCode
    linkedLine: "" // NEW: Add linkedLine
  });
  const [selectedDoE, setSelectedDoE] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [simulationParams, setSimulationParams] = useState({});
  const [simulationResult, setSimulationResult] = useState(null);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingDoE, setAnalyzingDoE] = useState(false);
  const [selectedRunIds, setSelectedRunIds] = useState([]);
  const [runResultInputs, setRunResultInputs] = useState({});

  const queryClient = useQueryClient();

  const { data: does = [] } = useQuery({
    queryKey: ['does'],
    queryFn: () => api.entities.DoE.list("-created_date", 50),
  });

  // NEW: Load defects, products, lines for context
  const { data: defects = [] } = useQuery({
    queryKey: ['defects-for-doe'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['runs-for-doe'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 50),
  });

  const { data: doeAnalyses = [] } = useQuery({
    queryKey: ['doe-analyses'],
    queryFn: () => api.entities.DoEAnalysis.list("-analysisDate", 50),
  });

  const saveDoEAnalysisMutation = useMutation({
    mutationFn: (data) => api.entities.DoEAnalysis.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doe-analyses'] });
    }
  });

  const products = [...new Set(processRuns.map(r => r.productCode).filter(Boolean))];
  const lines = [...new Set(processRuns.map(r => r.line).filter(Boolean))];

  const createDoEMutation = useMutation({
    mutationFn: (data) => api.entities.DoE.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['does'] });
      setActiveTab("list");
    }
  });

  const updateDoEMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.DoE.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['does'] });
    }
  });

  const handleGenerateDoEPlan = async () => {
    setGeneratingPlan(true);

    try {
      // Get context from linked defect
      let contextInfo = "";
      if (newDoE.relatedDefectId) {
        const defect = defects.find(d => d.id === newDoE.relatedDefectId);
        if (defect) {
          contextInfo = `\n\nContext from Defect:
- Type: ${defect.defectType}
- Severity: ${defect.severity}
- Line: ${defect.line}
- Product: ${defect.productCode}`;
        }
      }

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Design a comprehensive DoE (Design of Experiments) for: ${newDoE.objective}${contextInfo}

Process: Window film/PPF lamination
${newDoE.linkedProductCode ? `Product: ${newDoE.linkedProductCode}` : ''}
${newDoE.linkedLine ? `Line: ${newDoE.linkedLine}` : ''}

Suggest:
1. Appropriate design type
2. 3-5 critical factors to vary (e.g., lineSpeed, nipPressure, webTension, ovenTemp)
3. Factor levels (low, center, high)
4. Response variables to measure (e.g., defect rate, adhesion strength, optical clarity)
5. Number of runs required

Be specific to lamination process parameters.`,
        response_json_schema: {
          type: "object",
          properties: {
            designType: { type: "string" },
            factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  unit: { type: "string" },
                  lowLevel: { type: "number" },
                  highLevel: { type: "number" },
                  centerPoint: { type: "number" },
                  currentSetting: { type: "number" }
                }
              }
            },
            responseVariables: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  unit: { type: "string" },
                  target: { type: "number" },
                  minimize: { type: "boolean" }
                }
              }
            },
            estimatedRuns: { type: "number" },
            expectedDuration: { type: "string" }
          }
        }
      });

      setNewDoE(prev => ({
        ...prev,
        designType: result.designType,
        factors: result.factors,
        responseVariables: result.responseVariables
      }));
    } catch (error) {
      console.error("DoE generation error:", error);
    }

    setGeneratingPlan(false);
  };

  const handleCreateDoE = async () => {
    const user = await api.auth.me();

    createDoEMutation.mutate({
      ...newDoE,
      owner: user.email,
      executionStatus: "planned",
      startDate: new Date().toISOString().split('T')[0],
      runsTable: generateRunsTable(newDoE.factors, newDoE.designType)
    });
  };

  const generateRunsTable = (factors, designType) => {
    if (!factors || factors.length === 0) return [];

    // Simple 2-level full factorial
    const numFactors = factors.length;
    const numRuns = Math.pow(2, numFactors);
    const runs = [];

    for (let i = 0; i < numRuns; i++) {
      const factorSettings = {};
      factors.forEach((factor, idx) => {
        const level = (i >> idx) & 1;
        factorSettings[factor.name] = level === 0 ? factor.lowLevel : factor.highLevel;
      });

      runs.push({
        runOrder: i + 1,
        stdOrder: i + 1,
        factorSettings,
        responseResults: {},
        completed: false
      });
    }

    return runs;
  };

  const handleUpdateRun = (doeId, runOrder, results) => {
    const doe = does.find(d => d.id === doeId);
    if (!doe) return;

    const updatedRuns = doe.runsTable.map(run =>
      run.runOrder === runOrder
        ? { ...run, responseResults: results, completed: true, executionDate: new Date().toISOString() }
        : run
    );

    updateDoEMutation.mutate({
      id: doeId,
      data: {
        ...doe,
        runsTable: updatedRuns,
        executionStatus: updatedRuns.every(r => r.completed) ? "completed" : "in_progress"
      }
    });
  };

  const statusColors = {
    planned: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    analyzed: "bg-purple-100 text-purple-800"
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-blue-600" />
            DoE Designer
          </h1>
          <p className="text-gray-600 mt-1">Design of Experiments for process optimization</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">Active DoEs ({does.length})</TabsTrigger>
            <TabsTrigger value="new">
              <Plus className="w-4 h-4 mr-2" />
              New DoE
            </TabsTrigger>
            <TabsTrigger value="from-runs">
              <Database className="w-4 h-4 mr-2" />
              From Process Runs
            </TabsTrigger>
            <TabsTrigger value="simulation">
              <Sliders className="w-4 h-4 mr-2" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History ({doeAnalyses.length})
            </TabsTrigger>
            {selectedDoE && <TabsTrigger value="execution">Run Execution</TabsTrigger>}
          </TabsList>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  DoE Analysis History
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Past experiments and analyses for AI-powered insights
                </p>
              </CardHeader>
              <CardContent>
                {doeAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {doeAnalyses.map((analysis) => (
                      <div key={analysis.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{analysis.objective || 'DoE Analysis'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{analysis.designType}</Badge>
                              {analysis.experimentResult && (
                                <Badge className={
                                  analysis.experimentResult === 'pass' ? 'bg-green-100 text-green-800' :
                                  analysis.experimentResult === 'fail' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>{analysis.experimentResult}</Badge>
                              )}
                              {analysis.line && <Badge variant="outline">{analysis.line}</Badge>}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(analysis.analysisDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST by {analysis.analyst}
                            </p>
                          </div>
                          {analysis.confidenceLevel && (
                            <Badge className="bg-purple-100 text-purple-800">
                              {analysis.confidenceLevel} confidence
                            </Badge>
                          )}
                        </div>

                        {analysis.optimalSettings && Object.keys(analysis.optimalSettings).length > 0 && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <p className="font-medium text-green-900 mb-1">Optimal Settings:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(analysis.optimalSettings).map(([k, v]) => (
                                <span key={k} className="px-2 py-1 bg-white rounded border text-xs">
                                  {k}: <strong>{v}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.mainEffects?.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <p className="font-medium text-blue-900 mb-1">Key Effects:</p>
                            <ul className="text-xs text-blue-800 space-y-1">
                              {analysis.mainEffects.slice(0, 3).map((effect, idx) => (
                                <li key={idx}>• {effect.factor}: {effect.effect}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {analysis.recommendations?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <strong>Recommendations:</strong> {analysis.recommendations[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No DoE analyses saved yet</p>
                    <p className="text-sm">Complete experiments and save analyses</p>
                  </div>
                )}

                {doeAnalyses.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">📊 Learning Summary</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Experiments</p>
                        <p className="text-xl font-bold text-purple-700">{doeAnalyses.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Passed</p>
                        <p className="text-xl font-bold text-green-600">
                          {doeAnalyses.filter(a => a.experimentResult === 'pass').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Failed</p>
                        <p className="text-xl font-bold text-red-600">
                          {doeAnalyses.filter(a => a.experimentResult === 'fail').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Parameters Optimized</p>
                        <p className="text-xl font-bold text-blue-600">
                          {[...new Set(doeAnalyses.flatMap(a => a.factors?.map(f => f.name) || []))].length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DoE List Tab */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>DoE Studies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {does.map((doe) => (
                    <div
                      key={doe.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDoE(doe);
                        setActiveTab("execution");
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{doe.objective}</h3>
                            <Badge className={statusColors[doe.executionStatus]}>
                              {doe.executionStatus}
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p>Design: {doe.designType}</p>
                              <p>Factors: {doe.factors?.length || 0}</p>
                            </div>
                            <div>
                              <p>Responses: {doe.responseVariables?.length || 0}</p>
                              <p>Runs: {doe.runsTable?.length || 0} ({doe.runsTable?.filter(r => r.completed).length || 0} completed)</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Owner: {doe.owner} • Started: {format(new Date(doe.startDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Play className="w-4 h-4 mr-1" />
                          Continue
                        </Button>
                      </div>
                    </div>
                  ))}
                  {does.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p>No DoE studies yet</p>
                      <p className="text-sm mt-1">Create your first experiment to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* From Process Runs Tab */}
          <TabsContent value="from-runs">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Design DoE from Process Data
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Select process runs to inform experiment design
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Filter by Line</Label>
                      <Select
                        value={newDoE.linkedLine || "all"}
                        onValueChange={(val) => setNewDoE(prev => ({ ...prev, linkedLine: val === "all" ? "" : val }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="All lines" />
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
                      <Label className="text-xs">Filter by Product</Label>
                      <Select
                        value={newDoE.linkedProductCode || "all"}
                        onValueChange={(val) => setNewDoE(prev => ({ ...prev, linkedProductCode: val === "all" ? "" : val }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="All products" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          {products.map(prod => (
                            <SelectItem key={prod} value={prod}>{prod}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Process Runs List with Selection */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Select Process Runs for Analysis
                    </p>
                    <p className="text-xs text-blue-700">
                      {processRuns.filter(r => 
                        (!newDoE.linkedLine || r.line === newDoE.linkedLine) &&
                        (!newDoE.linkedProductCode || r.productCode === newDoE.linkedProductCode)
                      ).length} runs match filters
                    </p>
                  </div>

                  {processRuns.length > 0 ? (
                    <>
                      <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                        {processRuns
                          .filter(r => 
                            (!newDoE.linkedLine || r.line === newDoE.linkedLine) &&
                            (!newDoE.linkedProductCode || r.productCode === newDoE.linkedProductCode)
                          )
                          .slice(0, 20)
                          .map(run => (
                            <div 
                              key={run.id} 
                              className={`p-3 border rounded-lg text-sm cursor-pointer transition-colors ${
                                selectedRunIds.includes(run.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                setSelectedRunIds(prev => 
                                  prev.includes(run.id) 
                                    ? prev.filter(id => id !== run.id)
                                    : [...prev, run.id]
                                );
                              }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedRunIds.includes(run.id)}
                                    onChange={() => {}}
                                    className="pointer-events-none"
                                  />
                                  <span className="font-medium">{run.productCode}</span>
                                </div>
                                <Badge variant="outline">{run.line}</Badge>
                              </div>
                              <div className="text-xs text-gray-600 grid grid-cols-2 gap-1 ml-5">
                                <span>Speed: {run.lineSpeed || 'N/A'}</span>
                                <span>Pressure: {run.nipPressure || 'N/A'}</span>
                                <span>Tension: {run.webTensionIn || 'N/A'}</span>
                                <span>FPY: {run.qualityMetrics?.firstPassYield || 'N/A'}%</span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {selectedRunIds.length > 0 && (
                        <Alert className="bg-blue-50 border-blue-200">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            {selectedRunIds.length} run(s) selected for DoE design
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={async () => {
                          setGeneratingPlan(true);
                          try {
                            const runsToAnalyze = selectedRunIds.length > 0 
                              ? processRuns.filter(r => selectedRunIds.includes(r.id))
                              : processRuns.filter(r => 
                                  (!newDoE.linkedLine || r.line === newDoE.linkedLine) &&
                                  (!newDoE.linkedProductCode || r.productCode === newDoE.linkedProductCode)
                                );

                            const stats = {};
                            ['lineSpeed', 'nipPressure', 'webTensionIn', 'rollTempChill', 'humidity', 'webTensionOut', 'coronaDyne'].forEach(param => {
                              const values = runsToAnalyze.map(r => r[param]).filter(v => v != null && !isNaN(v));
                              if (values.length > 0) {
                                stats[param] = {
                                  min: Math.min(...values),
                                  max: Math.max(...values),
                                  avg: values.reduce((a,b) => a+b, 0) / values.length
                                };
                              }
                            });

                            if (Object.keys(stats).length === 0) {
                              alert("Selected process runs don't have enough parameter data. Upload more detailed process data.");
                              setGeneratingPlan(false);
                              return;
                            }

                            const result = await api.integrations.Core.InvokeLLM({
                              prompt: `Based on ${runsToAnalyze.length} selected process runs, design an optimization DoE:

PARAMETER RANGES:
${Object.entries(stats).map(([k, v]) => `- ${k}: min=${v.min.toFixed(1)}, max=${v.max.toFixed(1)}, avg=${v.avg.toFixed(1)}`).join('\n')}

PRODUCTS: ${[...new Set(runsToAnalyze.map(r => r.productCode))].join(', ')}
LINES: ${[...new Set(runsToAnalyze.map(r => r.line))].join(', ')}
DEFECTS: ${defects.slice(0, 5).map(d => d.defectType).join(', ')}

Design a focused experiment using actual parameter ranges.`,
                              response_json_schema: {
                                type: "object",
                                properties: {
                                  objective: { type: "string" },
                                  designType: { type: "string" },
                                  factors: { type: "array", items: { type: "object", properties: { name: { type: "string" }, unit: { type: "string" }, lowLevel: { type: "number" }, highLevel: { type: "number" }, centerPoint: { type: "number" } } } },
                                  responseVariables: { type: "array", items: { type: "object", properties: { name: { type: "string" }, unit: { type: "string" }, target: { type: "number" }, minimize: { type: "boolean" } } } },
                                  rationale: { type: "string" }
                                }
                              }
                            });

                            setNewDoE(prev => ({
                              ...prev,
                              objective: result.objective,
                              designType: result.designType,
                              factors: result.factors,
                              responseVariables: result.responseVariables
                            }));
                            setActiveTab("new");
                          } catch (error) {
                            console.error("Error:", error);
                          }
                          setGeneratingPlan(false);
                        }}
                        disabled={generatingPlan}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {generatingPlan ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate DoE from {selectedRunIds.length > 0 ? `${selectedRunIds.length} Selected` : 'Filtered'} Runs</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No process runs available</p>
                      <p className="text-sm">Upload data via Process Runs page</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data-Driven Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-900">✓ Realistic Factor Levels</p>
                      <p className="text-green-700">Uses actual operating ranges from selected runs</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-900">✓ Defect-Informed Design</p>
                      <p className="text-green-700">Targets parameters linked to quality issues</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-900">✓ Variation Analysis</p>
                      <p className="text-green-700">Identifies parameters with high variability</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-medium text-blue-900">📊 How it Works</p>
                      <ol className="text-blue-700 text-xs mt-1 list-decimal list-inside space-y-1">
                        <li>Filter and select process runs</li>
                        <li>AI analyzes parameter ranges & defects</li>
                        <li>DoE plan generated with optimal factors</li>
                        <li>Save, run experiments, record results</li>
                        <li>Close as Pass/Fail for AI learning</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-600" />
                    DoE Parameter Simulation
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Select parameters and predict outcomes before experiments
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Line Selection */}
                  <div>
                    <Label>Production Line</Label>
                    <Select 
                      value={simulationParams.line || ""} 
                      onValueChange={(val) => setSimulationParams(prev => ({ ...prev, line: val }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select line" />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map(line => (
                          <SelectItem key={line} value={line}>{line}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parameter Selection */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="text-sm font-medium text-blue-900 mb-2 block">Select Parameters to Simulate</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {[
                        { key: 'lineSpeed', label: 'Line Speed', unit: 'm/min', min: 10, max: 100, default: 25 },
                        { key: 'nipPressure', label: 'Nip Pressure', unit: 'bar', min: 1, max: 10, default: 4 },
                        { key: 'webTensionIn', label: 'Web Tension In', unit: 'N/m', min: 20, max: 200, default: 100 },
                        { key: 'webTensionOut', label: 'Web Tension Out', unit: 'N/m', min: 20, max: 200, default: 100 },
                        { key: 'rollTempChill', label: 'Chill Roll Temp', unit: '°C', min: 10, max: 40, default: 20 },
                        { key: 'rollTempTop', label: 'Top Roll Temp', unit: '°C', min: 20, max: 80, default: 40 },
                        { key: 'rollTempBottom', label: 'Bottom Roll Temp', unit: '°C', min: 20, max: 80, default: 40 },
                        { key: 'humidity', label: 'Humidity', unit: '%', min: 20, max: 80, default: 45 },
                        { key: 'roomTemp', label: 'Room Temp', unit: '°C', min: 18, max: 30, default: 22 },
                        { key: 'coronaDyne', label: 'Corona Dyne', unit: 'dyne/cm', min: 30, max: 50, default: 38 },
                        { key: 'uvDose', label: 'UV Dose', unit: 'mJ/cm²', min: 50, max: 500, default: 200 },
                        { key: 'coatWeight', label: 'Coat Weight', unit: 'g/m²', min: 1, max: 20, default: 5 }
                      ].map(param => (
                        <div key={param.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`doe-sim-${param.key}`}
                            checked={simulationParams[param.key]?.enabled ?? false}
                            onChange={(e) => {
                              setSimulationParams(prev => ({
                                ...prev,
                                [param.key]: {
                                  ...prev[param.key],
                                  enabled: e.target.checked,
                                  value: prev[param.key]?.value ?? param.default,
                                  min: param.min,
                                  max: param.max,
                                  unit: param.unit
                                }
                              }));
                            }}
                          />
                          <label htmlFor={`doe-sim-${param.key}`} className="text-xs cursor-pointer">
                            {param.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parameter Sliders */}
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {Object.entries(simulationParams)
                      .filter(([k, v]) => v?.enabled && k !== 'line')
                      .map(([key, param]) => (
                        <div key={key}>
                          <div className="flex justify-between items-center mb-1">
                            <Label className="text-sm">{key}</Label>
                            <Input
                              type="number"
                              value={param.value}
                              onChange={(e) => setSimulationParams(prev => ({
                                ...prev,
                                [key]: { ...prev[key], value: parseFloat(e.target.value) }
                              }))}
                              className="w-20 h-7 text-xs"
                            />
                          </div>
                          <Slider
                            value={[param.value]}
                            onValueChange={([val]) => setSimulationParams(prev => ({
                              ...prev,
                              [key]: { ...prev[key], value: val }
                            }))}
                            min={param.min}
                            max={param.max}
                            step={0.1}
                          />
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setRunningSimulation(true);
                        try {
                          const enabledParams = Object.entries(simulationParams)
                            .filter(([k, v]) => v?.enabled && k !== 'line')
                            .map(([k, v]) => `${k}: ${v.value} ${v.unit || ''}`);

                          const result = await api.integrations.Core.InvokeLLM({
                            prompt: `Simulate lamination process with these parameters:
Line: ${simulationParams.line || 'Not specified'}
${enabledParams.join('\n')}

Predict:
1. Expected First Pass Yield (%)
2. Likely defect types and rates  
3. Process stability assessment
4. Specific recommendations`,
                            response_json_schema: {
                              type: "object",
                              properties: {
                                predictedFPY: { type: "number" },
                                defectRisk: { type: "array", items: { type: "object", properties: { defectType: { type: "string" }, probability: { type: "number" }, reason: { type: "string" } } } },
                                stabilityScore: { type: "number" },
                                stabilityAssessment: { type: "string" },
                                recommendations: { type: "array", items: { type: "string" } },
                                optimalAdjustments: { type: "array", items: { type: "object", properties: { parameter: { type: "string" }, current: { type: "number" }, suggested: { type: "number" }, reason: { type: "string" } } } }
                              }
                            }
                          });
                          setSimulationResult(result);
                        } catch (error) {
                          console.error("Simulation error:", error);
                        }
                        setRunningSimulation(false);
                      }}
                      disabled={runningSimulation || !Object.values(simulationParams).some(p => p?.enabled)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {runningSimulation ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulating...</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" />Run Simulation</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSimulationParams({});
                        setSimulationResult(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Simulation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {simulationResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg border-2 ${
                          simulationResult.predictedFPY >= 95 ? 'bg-green-50 border-green-300' :
                          simulationResult.predictedFPY >= 85 ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}>
                          <p className="text-sm text-gray-600">Predicted FPY</p>
                          <p className="text-2xl font-bold">{simulationResult.predictedFPY?.toFixed(1)}%</p>
                        </div>
                        <div className={`p-4 rounded-lg border-2 ${
                          simulationResult.stabilityScore >= 80 ? 'bg-green-50 border-green-300' :
                          simulationResult.stabilityScore >= 60 ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}>
                          <p className="text-sm text-gray-600">Stability Score</p>
                          <p className="text-2xl font-bold">{simulationResult.stabilityScore}/100</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{simulationResult.stabilityAssessment}</p>
                      </div>

                      {simulationResult.defectRisk?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Defect Risks</h4>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {simulationResult.defectRisk.map((risk, idx) => (
                              <div key={idx} className="p-2 bg-orange-50 rounded border border-orange-200 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{risk.defectType}</span>
                                  <Badge className={risk.probability > 20 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {risk.probability}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{risk.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {simulationResult.recommendations?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Recommendations</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {simulationResult.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const params = Object.entries(simulationParams)
                              .filter(([k, v]) => v?.enabled && k !== 'line')
                              .map(([k, v]) => `${k}: ${v.value} ${v.unit || ''}`)
                              .join('\n');
                            const reportText = `DOE SIMULATION REPORT\n${'='.repeat(50)}\nDate: ${new Date().toLocaleString()}\nLine: ${simulationParams.line || 'Not specified'}\n\nPARAMETERS:\n${params}\n\nRESULTS:\nPredicted FPY: ${simulationResult.predictedFPY}%\nStability Score: ${simulationResult.stabilityScore}/100\n\n${simulationResult.stabilityAssessment}\n\nDEFECT RISKS:\n${simulationResult.defectRisk?.map(r => `- ${r.defectType}: ${r.probability}% - ${r.reason}`).join('\n')}\n\nRECOMMENDATIONS:\n${simulationResult.recommendations?.map(r => `- ${r}`).join('\n')}`;
                            const blob = new Blob([reportText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `doe-simulation-${new Date().toISOString().split('T')[0]}.txt`;
                            a.click();
                          }}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={() => {
                            const enabledParams = Object.entries(simulationParams)
                              .filter(([k, v]) => v?.enabled && k !== 'line');
                            setNewDoE(prev => ({
                              ...prev,
                              objective: `Validate simulation: FPY=${simulationResult.predictedFPY?.toFixed(1)}%`,
                              linkedLine: simulationParams.line || '',
                              factors: enabledParams.map(([k, v]) => ({
                                name: k,
                                unit: v.unit || '',
                                lowLevel: v.value * 0.9,
                                highLevel: v.value * 1.1,
                                centerPoint: v.value
                              })),
                              responseVariables: [
                                { name: 'First Pass Yield', unit: '%', target: simulationResult.predictedFPY, minimize: false }
                              ]
                            }));
                            setActiveTab("new");
                          }}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Create DoE
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Sliders className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select parameters and run simulation</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* New DoE Tab */}
          <TabsContent value="new">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI DoE Assistant
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Let AI design your experiment based on your objective and context
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* NEW: Context Selection */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-3">📎 Link to Context (Optional)</p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Related Defect</Label>
                        <Select
                          value={newDoE.relatedDefectId}
                          onValueChange={(val) => setNewDoE({...newDoE, relatedDefectId: val})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select defect (optional)..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>No defect</SelectItem>
                            {defects.slice(0, 20).map(defect => ( // Limit to 20 for practicality
                              <SelectItem key={defect.id} value={defect.id}>
                                {defect.defectType?.replace(/_/g, ' ')} - {defect.severity} ({new Date(defect.dateTime).toLocaleDateString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Product</Label>
                          <Select
                            value={newDoE.linkedProductCode}
                            onValueChange={(val) => setNewDoE({...newDoE, linkedProductCode: val})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Product..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Any</SelectItem>
                              {products.map(prod => (
                                <SelectItem key={prod} value={prod}>{prod}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Line</Label>
                          <Select
                            value={newDoE.linkedLine}
                            onValueChange={(val) => setNewDoE({...newDoE, linkedLine: val})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Line..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Any</SelectItem>
                              {lines.map(line => (
                                <SelectItem key={line} value={line}>{line}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Experiment Objective</Label>
                    <Textarea
                      value={newDoE.objective}
                      onChange={(e) => setNewDoE({ ...newDoE, objective: e.target.value })}
                      placeholder="e.g., Optimize line speed and nip pressure to minimize bubble defects while maintaining throughput"
                      rows={5}
                      className="mt-2"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Example Objectives:</p>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>• "Reduce haze while optimizing oven temperature and line speed"</p>
                      <p>• "Improve adhesion strength by adjusting web tension and pressure"</p>
                      <p>• "Minimize curl by optimizing cooling and winding parameters"</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateDoEPlan}
                    disabled={generatingPlan || !newDoE.objective.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {generatingPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Designing Experiment...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate DoE Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {(newDoE.factors.length > 0 || newDoE.responseVariables.length > 0) && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>Generated DoE Plan</CardTitle>
                      <Button
                        onClick={handleCreateDoE}
                        disabled={createDoEMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create DoE
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    <div>
                      <h4 className="font-semibold mb-2">Design Type</h4>
                      <Badge>{newDoE.designType}</Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Factors to Vary</h4>
                      <div className="space-y-2">
                        {newDoE.factors?.map((factor, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border">
                            <p className="font-medium text-sm">{factor.name}</p>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                              <div>
                                <p className="text-gray-600">Low:</p>
                                <p className="font-medium">{factor.lowLevel} {factor.unit}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Center:</p>
                                <p className="font-medium">{factor.centerPoint} {factor.unit}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">High:</p>
                                <p className="font-medium">{factor.highLevel} {factor.unit}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Response Variables</h4>
                      <div className="space-y-2">
                        {newDoE.responseVariables?.map((response, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{response.name}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Target: {response.target} {response.unit}
                                </p>
                              </div>
                              <Badge className={response.minimize ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                                {response.minimize ? "Minimize" : "Maximize"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-900">
                        Estimated runs: {Math.pow(2, newDoE.factors?.length || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution">
            {selectedDoE && (
              <div className="space-y-6">
                {/* DoE Info */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedDoE.objective}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedDoE.designType} • {selectedDoE.factors?.length} factors
                        </p>
                      </div>
                      <Badge className={statusColors[selectedDoE.executionStatus]}>
                        {selectedDoE.executionStatus}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Run Execution Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Experimental Runs</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Complete runs in order and record results for each response variable
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedDoE.runsTable?.map((run) => (
                        <div
                          key={run.runOrder}
                          className={`p-4 border rounded-lg ${run.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-700">Run #{run.runOrder}</span>
                              {run.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            {run.completed && (
                              <span className="text-xs text-gray-500">
                                {format(new Date(run.executionDate), 'MMM d, HH:mm')}
                              </span>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Factor Settings:</p>
                              <div className="space-y-1 text-sm">
                                {Object.entries(run.factorSettings).map(([factor, value]) => (
                                  <div key={factor} className="flex justify-between">
                                    <span className="text-gray-600">{factor}:</span>
                                    <span className="font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Response Results:</p>
                              {run.completed ? (
                                <div className="space-y-1 text-sm">
                                  {Object.entries(run.responseResults).map(([response, value]) => (
                                    <div key={response} className="flex justify-between">
                                      <span className="text-gray-600">{response}:</span>
                                      <span className="font-medium">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {selectedDoE.responseVariables?.map((rv) => (
                                    <div key={rv.name} className="flex items-center gap-2">
                                      <Label className="text-xs w-24">{rv.name}:</Label>
                                      <Input 
                                        type="number"
                                        placeholder={`${rv.unit || ''}`}
                                        className="text-sm h-8"
                                        value={runResultInputs[`${run.runOrder}-${rv.name}`] || ''}
                                        onChange={(e) => setRunResultInputs(prev => ({
                                          ...prev,
                                          [`${run.runOrder}-${rv.name}`]: e.target.value
                                        }))}
                                      />
                                    </div>
                                  ))}
                                  <Button 
                                    size="sm" 
                                    className="w-full mt-2"
                                    onClick={() => {
                                      const results = {};
                                      selectedDoE.responseVariables?.forEach(rv => {
                                        const val = runResultInputs[`${run.runOrder}-${rv.name}`];
                                        if (val) results[rv.name] = parseFloat(val);
                                      });
                                      if (Object.keys(results).length > 0) {
                                        handleUpdateRun(selectedDoE.id, run.runOrder, results);
                                        // Clear inputs
                                        const clearedInputs = { ...runResultInputs };
                                        selectedDoE.responseVariables?.forEach(rv => {
                                          delete clearedInputs[`${run.runOrder}-${rv.name}`];
                                        });
                                        setRunResultInputs(clearedInputs);
                                      }
                                    }}
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    Save Results
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Close Experiment */}
                <Card className="border-2 border-dashed">
                  <CardHeader>
                    <CardTitle>Close Experiment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Once all runs are complete and analyzed, close the experiment as Pass or Fail.
                      This data will be used by AI for future recommendations.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={async () => {
                          updateDoEMutation.mutate({
                            id: selectedDoE.id,
                            data: {
                              ...selectedDoE,
                              executionStatus: "analyzed",
                              completionDate: new Date().toISOString().split('T')[0],
                              experimentResult: "pass"
                            }
                          });
                          // Save final result to DoEAnalysis
                          const user = await api.auth.me();
                          saveDoEAnalysisMutation.mutate({
                            doeId: selectedDoE.id,
                            analysisDate: new Date().toISOString(),
                            objective: selectedDoE.objective,
                            designType: selectedDoE.designType,
                            line: selectedDoE.linkedLine,
                            factors: selectedDoE.factors,
                            responseVariables: selectedDoE.responseVariables,
                            mainEffects: selectedDoE.analysis?.mainEffects || aiAnalysis?.mainEffects,
                            optimalSettings: selectedDoE.analysis?.optimalSettings || aiAnalysis?.optimalSettings,
                            recommendations: selectedDoE.analysis?.recommendations || aiAnalysis?.recommendations,
                            experimentResult: "pass",
                            analyst: user.email
                          });
                          setActiveTab("list");
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!selectedDoE.runsTable?.every(r => r.completed)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Close as PASS
                      </Button>
                      <Button
                        onClick={async () => {
                          updateDoEMutation.mutate({
                            id: selectedDoE.id,
                            data: {
                              ...selectedDoE,
                              executionStatus: "analyzed",
                              completionDate: new Date().toISOString().split('T')[0],
                              experimentResult: "fail"
                            }
                          });
                          // Save final result to DoEAnalysis
                          const user = await api.auth.me();
                          saveDoEAnalysisMutation.mutate({
                            doeId: selectedDoE.id,
                            analysisDate: new Date().toISOString(),
                            objective: selectedDoE.objective,
                            designType: selectedDoE.designType,
                            line: selectedDoE.linkedLine,
                            factors: selectedDoE.factors,
                            responseVariables: selectedDoE.responseVariables,
                            experimentResult: "fail",
                            analyst: user.email
                          });
                          setActiveTab("list");
                        }}
                        variant="destructive"
                        className="flex-1"
                        disabled={!selectedDoE.runsTable?.every(r => r.completed)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Close as FAIL
                      </Button>
                    </div>
                    {!selectedDoE.runsTable?.every(r => r.completed) && (
                      <Alert className="bg-yellow-50 border-yellow-300">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Incomplete Experiment:</strong> {selectedDoE.runsTable?.filter(r => r.completed).length || 0} of {selectedDoE.runsTable?.length} runs completed. 
                          Complete all runs before closing the experiment.
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const data = {
                          objective: selectedDoE.objective,
                          designType: selectedDoE.designType,
                          factors: selectedDoE.factors,
                          responses: selectedDoE.responseVariables,
                          runs: selectedDoE.runsTable,
                          analysis: selectedDoE.analysis || aiAnalysis
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `doe-${selectedDoE.id.slice(0,8)}-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                      }}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Experiment Data
                    </Button>
                  </CardContent>
                </Card>

                {/* Analysis (if completed or in progress) */}
                {(selectedDoE.executionStatus === "completed" || selectedDoE.runsTable?.some(r => r.completed)) && (
                  <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        {selectedDoE.executionStatus === "completed" ? "Analysis & Results" : "Preliminary Analysis"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-700">
                        {selectedDoE.runsTable?.filter(r => r.completed).length || 0} of {selectedDoE.runsTable?.length || 0} runs completed.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={analyzingDoE}
                          onClick={async () => {
                            setAnalyzingDoE(true);
                            try {
                              const completedRuns = selectedDoE.runsTable?.filter(r => r.completed) || [];
                              const result = await api.integrations.Core.InvokeLLM({
                                prompt: `Analyze this DoE experiment:

OBJECTIVE: ${selectedDoE.objective}
DESIGN: ${selectedDoE.designType}
FACTORS: ${selectedDoE.factors?.map(f => `${f.name} (${f.lowLevel}-${f.highLevel} ${f.unit})`).join(', ')}
RESPONSES: ${selectedDoE.responseVariables?.map(r => r.name).join(', ')}

COMPLETED RUNS (${completedRuns.length}):
${completedRuns.map(r => `Run ${r.runOrder}: Settings=${JSON.stringify(r.factorSettings)}, Results=${JSON.stringify(r.responseResults)}`).join('\n')}

Provide:
1. Main effects analysis
2. Optimal settings
3. Predicted performance at optimal
4. Recommendations for production
5. Confidence level of findings`,
                                response_json_schema: {
                                  type: "object",
                                  properties: {
                                    mainEffects: { type: "array", items: { type: "object", properties: { factor: { type: "string" }, effect: { type: "string" }, significance: { type: "string" } } } },
                                    optimalSettings: { type: "object" },
                                    predictedPerformance: { type: "object" },
                                    recommendations: { type: "array", items: { type: "string" } },
                                    confidenceLevel: { type: "string" },
                                    summary: { type: "string" }
                                  }
                                }
                              });
                              setAiAnalysis(result);
                              
                              // Save analysis to DoE record
                              updateDoEMutation.mutate({
                                id: selectedDoE.id,
                                data: {
                                  ...selectedDoE,
                                  analysis: result,
                                  recommendedSetpoints: result.optimalSettings,
                                  executionStatus: selectedDoE.runsTable?.every(r => r.completed) ? "analyzed" : selectedDoE.executionStatus
                                }
                              });

                              // Also save to DoEAnalysis entity for historical tracking
                              const user = await api.auth.me();
                              saveDoEAnalysisMutation.mutate({
                                doeId: selectedDoE.id,
                                analysisDate: new Date().toISOString(),
                                objective: selectedDoE.objective,
                                designType: selectedDoE.designType,
                                line: selectedDoE.linkedLine,
                                productCode: selectedDoE.linkedProductCode,
                                factors: selectedDoE.factors?.map(f => ({
                                  name: f.name,
                                  lowLevel: f.lowLevel,
                                  highLevel: f.highLevel,
                                  optimalValue: result.optimalSettings?.[f.name]
                                })),
                                responseVariables: selectedDoE.responseVariables,
                                mainEffects: result.mainEffects,
                                optimalSettings: result.optimalSettings,
                                predictedPerformance: result.predictedPerformance,
                                recommendations: result.recommendations,
                                confidenceLevel: result.confidenceLevel,
                                analyst: user.email
                              });
                            } catch (error) {
                              console.error("Analysis error:", error);
                            }
                            setAnalyzingDoE(false);
                          }}
                        >
                          {analyzingDoE ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 mr-2" />Analyze with AI</>
                          )}
                        </Button>
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export Data
                        </Button>
                      </div>

                      {(aiAnalysis || selectedDoE.analysis) && (
                        <div className="mt-4 space-y-4">
                          {(() => {
                            const analysis = aiAnalysis || selectedDoE.analysis;
                            return (
                              <>
                                <Alert className="bg-blue-50 border-blue-200">
                                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                  <AlertDescription className="text-blue-800">
                                    {analysis.summary}
                                  </AlertDescription>
                                </Alert>

                                {analysis.mainEffects?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Main Effects</h4>
                                    <div className="space-y-2">
                                      {analysis.mainEffects.map((effect, idx) => (
                                        <div key={idx} className="p-2 bg-white rounded border">
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium">{effect.factor}</span>
                                            <Badge className={
                                              effect.significance === 'high' ? 'bg-red-100 text-red-800' :
                                              effect.significance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'
                                            }>{effect.significance}</Badge>
                                          </div>
                                          <p className="text-sm text-gray-600">{effect.effect}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {analysis.optimalSettings && (
                                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <h4 className="font-semibold text-green-900 mb-2">Optimal Settings</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      {Object.entries(analysis.optimalSettings).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                          <span>{key}:</span>
                                          <span className="font-bold">{val}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {analysis.recommendations?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Recommendations</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {analysis.recommendations.map((rec, idx) => (
                                        <li key={idx}>{rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}