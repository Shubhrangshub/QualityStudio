import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitCompare, Award, AlertTriangle, CheckCircle2, TrendingUp, 
  TrendingDown, Minus, Sparkles, Loader2, Download, BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const PARAMETER_LABELS = {
  lineSpeed: { label: "Line Speed", unit: "m/min" },
  webTensionIn: { label: "Web Tension In", unit: "N/m" },
  webTensionOut: { label: "Web Tension Out", unit: "N/m" },
  nipPressure: { label: "Nip Pressure", unit: "bar" },
  rollTempChill: { label: "Chill Roll Temp", unit: "°C" },
  rollTempTop: { label: "Top Roll Temp", unit: "°C" },
  rollTempBottom: { label: "Bottom Roll Temp", unit: "°C" },
  humidity: { label: "Humidity", unit: "%" },
  roomTemp: { label: "Room Temp", unit: "°C" },
  coronaDyne: { label: "Corona Dyne", unit: "dyne/cm" },
  uvDose: { label: "UV Dose", unit: "mJ/cm²" },
  coatWeight: { label: "Coat Weight", unit: "g/m²" },
  unwindTorque: { label: "Unwind Torque", unit: "Nm" },
  rewindTorque: { label: "Rewind Torque", unit: "Nm" },
};

export default function ProcessRunComparison({ processRuns, goldenBatches, defects, selectedRun, onSelectRun }) {
  const [comparisonType, setComparisonType] = useState("golden"); // "golden" or "run"
  const [compareToRunId, setCompareToRunId] = useState("");
  const [selectedGoldenBatchId, setSelectedGoldenBatchId] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const compareToRun = processRuns.find(r => r.id === compareToRunId);
  const selectedGoldenBatch = goldenBatches.find(b => b.id === selectedGoldenBatchId);

  // Get defects for a run
  const getDefectsForRun = (run) => {
    if (!run) return [];
    const runStart = new Date(run.dateTimeStart);
    const runEnd = run.dateTimeEnd ? new Date(run.dateTimeEnd) : new Date(runStart.getTime() + 8 * 60 * 60 * 1000);
    
    return defects.filter(d => {
      const defectDate = new Date(d.dateTime || d.created_date);
      return d.line === run.line && defectDate >= runStart && defectDate <= runEnd;
    });
  };

  const compareParameters = () => {
    if (!selectedRun) return [];
    
    const comparisons = [];
    const baseline = comparisonType === "golden" 
      ? selectedGoldenBatch?.parameters 
      : compareToRun;
    
    if (!baseline) return [];

    Object.keys(PARAMETER_LABELS).forEach(key => {
      const currentValue = selectedRun[key];
      const baselineValue = comparisonType === "golden" ? baseline[key] : baseline[key];
      
      // Skip if both are undefined/null
      if ((currentValue === undefined || currentValue === null) && 
          (baselineValue === undefined || baselineValue === null)) return;

      let deviation = 0;
      let deviationPercent = 0;
      let status = 'missing';

      if (currentValue !== undefined && currentValue !== null && !isNaN(currentValue) && 
          baselineValue !== undefined && baselineValue !== null && !isNaN(baselineValue)) {
        deviation = currentValue - baselineValue;
        deviationPercent = baselineValue !== 0 ? (deviation / baselineValue) * 100 : 0;
        
        const tolerance = comparisonType === "golden" 
          ? (selectedGoldenBatch?.tolerances?.[key] || 5) 
          : 5; // Default 5% tolerance for run comparison
        
        if (Math.abs(deviationPercent) <= tolerance) {
          status = 'ok';
        } else {
          status = 'warning';
        }
      } else if (currentValue !== undefined && currentValue !== null) {
        status = 'baseline_missing';
      }

      comparisons.push({
        key,
        label: PARAMETER_LABELS[key].label,
        unit: PARAMETER_LABELS[key].unit,
        currentValue,
        baselineValue,
        deviation,
        deviationPercent,
        status
      });
    });

    return comparisons;
  };

  const runAIAnalysis = async () => {
    if (!selectedRun) return;
    
    setAiAnalyzing(true);
    
    try {
      const runDefects = getDefectsForRun(selectedRun);
      const compareDefects = compareToRun ? getDefectsForRun(compareToRun) : [];
      const comparisons = compareParameters();
      const warningParams = comparisons.filter(c => c.status === 'warning');

      const prompt = comparisonType === "golden" && selectedGoldenBatch
        ? `Analyze this process run against the Golden Batch standard:

GOLDEN BATCH "${selectedGoldenBatch.name}":
- Product: ${selectedGoldenBatch.productCode}
- Line: ${selectedGoldenBatch.line}
- Target FPY: ${selectedGoldenBatch.qualityMetrics?.firstPassYield || 'N/A'}%

CURRENT PROCESS RUN:
- Date: ${new Date(selectedRun.dateTimeStart).toLocaleString()}
- Product: ${selectedRun.productCode}
- Line: ${selectedRun.line}
- FPY: ${selectedRun.qualityMetrics?.firstPassYield || 'N/A'}%

PARAMETER DEVIATIONS (${warningParams.length} outside tolerance):
${warningParams.map(p => `- ${p.label}: ${p.currentValue} vs golden ${p.baselineValue} (${p.deviationPercent.toFixed(1)}% deviation)`).join('\n')}

DEFECTS DURING RUN (${runDefects.length}):
${runDefects.map(d => `- ${d.defectType?.replace(/_/g, ' ')} (${d.severity})`).join('\n') || 'None'}

Provide comprehensive analysis including:
1. Root cause analysis linking parameter deviations to defects
2. Impact assessment on quality
3. Specific corrective actions
4. Parameter adjustment recommendations
5. Risk assessment`
        : `Compare these two process runs:

RUN 1 (Selected):
- Date: ${new Date(selectedRun.dateTimeStart).toLocaleString()}
- Product: ${selectedRun.productCode}, Line: ${selectedRun.line}
- FPY: ${selectedRun.qualityMetrics?.firstPassYield || 'N/A'}%
- Defects: ${runDefects.length}

RUN 2 (Comparison):
- Date: ${compareToRun ? new Date(compareToRun.dateTimeStart).toLocaleString() : 'N/A'}
- Product: ${compareToRun?.productCode || 'N/A'}, Line: ${compareToRun?.line || 'N/A'}
- FPY: ${compareToRun?.qualityMetrics?.firstPassYield || 'N/A'}%
- Defects: ${compareDefects.length}

KEY DIFFERENCES:
${warningParams.map(p => `- ${p.label}: Run1=${p.currentValue} vs Run2=${p.baselineValue} (${p.deviationPercent.toFixed(1)}% diff)`).join('\n')}

DEFECTS IN RUN 1: ${runDefects.map(d => d.defectType?.replace(/_/g, ' ')).join(', ') || 'None'}
DEFECTS IN RUN 2: ${compareDefects.map(d => d.defectType?.replace(/_/g, ' ')).join(', ') || 'None'}

Analyze:
1. Why did one run perform better/worse?
2. Parameter correlations to defects
3. Best practices from the better run
4. Recommendations for optimization`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            riskLevel: { type: "string" },
            summary: { type: "string" },
            rootCauseAnalysis: { type: "array", items: { type: "string" } },
            defectCorrelations: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  defectType: { type: "string" },
                  likelyParameter: { type: "string" },
                  explanation: { type: "string" }
                } 
              } 
            },
            correctiveActions: { type: "array", items: { type: "string" } },
            parameterRecommendations: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: { 
                  parameter: { type: "string" }, 
                  current: { type: "string" }, 
                  recommended: { type: "string" }, 
                  reason: { type: "string" } 
                } 
              } 
            },
            bestPractices: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiReport(result);
    } catch (error) {
      console.error("AI analysis error:", error);
    }

    setAiAnalyzing(false);
  };

  const comparisons = compareParameters();
  const okCount = comparisons.filter(c => c.status === 'ok').length;
  const warningCount = comparisons.filter(c => c.status === 'warning').length;
  const runDefects = selectedRun ? getDefectsForRun(selectedRun) : [];
  const compareRunDefects = compareToRun ? getDefectsForRun(compareToRun) : [];

  const chartData = comparisons
    .filter(c => c.currentValue !== undefined && c.baselineValue !== undefined)
    .map(c => ({
      name: c.label,
      deviation: c.deviationPercent
    }));

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            Compare Process Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Process Run</label>
              <Select
                value={selectedRun?.id || ""}
                onValueChange={(val) => onSelectRun(processRuns.find(r => r.id === val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a process run" />
                </SelectTrigger>
                <SelectContent>
                  {processRuns.map(run => (
                    <SelectItem key={run.id} value={run.id}>
                      {new Date(run.dateTimeStart).toLocaleDateString()} - {run.productCode} - {run.line}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Compare Against</label>
              <Tabs value={comparisonType} onValueChange={setComparisonType}>
                <TabsList className="w-full">
                  <TabsTrigger value="golden" className="flex-1">
                    <Award className="w-4 h-4 mr-1" />
                    Golden Batch
                  </TabsTrigger>
                  <TabsTrigger value="run" className="flex-1">
                    <GitCompare className="w-4 h-4 mr-1" />
                    Another Run
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {comparisonType === "golden" ? "Select Golden Batch" : "Select Run to Compare"}
              </label>
              {comparisonType === "golden" ? (
                <Select
                  value={selectedGoldenBatchId}
                  onValueChange={setSelectedGoldenBatchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose golden batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {goldenBatches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-500" />
                          {batch.name} ({batch.productCode})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={compareToRunId}
                  onValueChange={setCompareToRunId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a run to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {processRuns.filter(r => r.id !== selectedRun?.id).map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.dateTimeStart).toLocaleDateString()} - {run.productCode} - {run.line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show comparison results */}
      {selectedRun && ((comparisonType === "golden" && selectedGoldenBatch) || (comparisonType === "run" && compareToRun)) && (
        <>
          {/* Missing Parameters Warning */}
          {(() => {
            const baseline = comparisonType === "golden" ? selectedGoldenBatch.parameters : compareToRun;
            const baselineParams = comparisonType === "golden" 
              ? Object.keys(baseline || {}).filter(k => baseline[k] !== undefined)
              : Object.keys(PARAMETER_LABELS);
            const missingParams = baselineParams.filter(p => 
              selectedRun[p] === undefined || selectedRun[p] === null
            );
            
            if (missingParams.length > 0) {
              return (
                <Alert className="bg-red-50 border-red-300">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>⚠️ Missing Parameters in Selected Run:</strong>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {missingParams.map(p => (
                        <Badge key={p} variant="outline" className="bg-white">
                          {PARAMETER_LABELS[p]?.label || p}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm mt-2">
                      These will show as "N/A" in comparison. Upload ProcessRun data with these parameters for accurate analysis.
                    </p>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          {/* Defect Alerts */}
          {(runDefects.length > 0 || compareRunDefects.length > 0) && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Defects Detected:</strong>
                {runDefects.length > 0 && (
                  <span className="block mt-1">
                    Selected Run: {runDefects.length} defect(s) - {[...new Set(runDefects.map(d => d.defectType?.replace(/_/g, ' ')))].join(', ')}
                  </span>
                )}
                {compareRunDefects.length > 0 && (
                  <span className="block mt-1">
                    Comparison Run: {compareRunDefects.length} defect(s) - {[...new Set(compareRunDefects.map(d => d.defectType?.replace(/_/g, ' ')))].join(', ')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* AI Analysis Button */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-purple-900">AI Comparative Analysis with Defect Correlation</h4>
                  <p className="text-sm text-purple-700">Get AI insights on parameter deviations, defect causes, and recommendations</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={runAIAnalysis}
                    disabled={aiAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {aiAnalyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Run AI Analysis</>
                    )}
                  </Button>
                  {aiReport && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reportText = `
PROCESS RUN COMPARISON REPORT
=============================
Date: ${new Date().toLocaleString()}
Selected Run: ${selectedRun.productCode} - ${new Date(selectedRun.dateTimeStart).toLocaleString()}
${comparisonType === "golden" ? `Golden Batch: ${selectedGoldenBatch.name}` : `Compared To: ${compareToRun.productCode} - ${new Date(compareToRun.dateTimeStart).toLocaleString()}`}

RISK LEVEL: ${aiReport.riskLevel}

SUMMARY:
${aiReport.summary}

DEFECT CORRELATIONS:
${aiReport.defectCorrelations?.map(d => `- ${d.defectType}: Likely caused by ${d.likelyParameter} - ${d.explanation}`).join('\n') || 'None identified'}

ROOT CAUSE ANALYSIS:
${aiReport.rootCauseAnalysis?.map((r, i) => `${i+1}. ${r}`).join('\n')}

CORRECTIVE ACTIONS:
${aiReport.correctiveActions?.map((a, i) => `${i+1}. ${a}`).join('\n')}

PARAMETER RECOMMENDATIONS:
${aiReport.parameterRecommendations?.map(p => `- ${p.parameter}: ${p.current} → ${p.recommended} (${p.reason})`).join('\n')}

BEST PRACTICES:
${aiReport.bestPractices?.map((b, i) => `${i+1}. ${b}`).join('\n') || 'N/A'}
                        `;
                        const blob = new Blob([reportText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `comparison-report-${new Date().toISOString().split('T')[0]}.txt`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Report */}
          {aiReport && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Analysis Report
                  <Badge className={
                    aiReport.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    aiReport.riskLevel === 'medium' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }>
                    {aiReport.riskLevel} risk
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-semibold text-blue-900 mb-2">Summary</h5>
                  <p className="text-sm text-blue-800">{aiReport.summary}</p>
                </div>

                {aiReport.defectCorrelations?.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Defect-Parameter Correlations
                    </h5>
                    <div className="space-y-2">
                      {aiReport.defectCorrelations.map((corr, idx) => (
                        <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-100 text-orange-800">{corr.defectType}</Badge>
                            <span className="text-sm">→</span>
                            <Badge variant="outline">{corr.likelyParameter}</Badge>
                          </div>
                          <p className="text-sm text-gray-700">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiReport.correctiveActions?.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2">Corrective Actions</h5>
                    <ul className="space-y-1 text-sm">
                      {aiReport.correctiveActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.parameterRecommendations?.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2">Parameter Recommendations</h5>
                    <div className="space-y-2">
                      {aiReport.parameterRecommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-purple-50 rounded-lg text-sm">
                          <p className="font-medium">{rec.parameter}</p>
                          <p className="text-gray-600">
                            Current: <Badge variant="outline">{rec.current}</Badge> → 
                            Recommended: <Badge className="bg-purple-100 text-purple-800 ml-1">{rec.recommended}</Badge>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{rec.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{okCount}</p>
                  <p className="text-sm text-green-600">Within Tolerance</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{warningCount}</p>
                  <p className="text-sm text-orange-600">Outside Tolerance</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-700">{runDefects.length}</p>
                  <p className="text-sm text-red-600">Defects (Selected)</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{comparisons.length}</p>
                  <p className="text-sm text-blue-600">Parameters Compared</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deviation Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Parameter Deviation (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[-20, 20]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                    <ReferenceLine x={0} stroke="#666" />
                    <Bar dataKey="deviation" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Parameter Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">Parameter</th>
                      <th className="text-right p-3">Selected Run</th>
                      <th className="text-right p-3">{comparisonType === "golden" ? "Golden Batch" : "Comparison Run"}</th>
                      <th className="text-right p-3">Deviation</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((comp) => (
                      <tr key={comp.key} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{comp.label}</td>
                        <td className="p-3 text-right">
                          {comp.currentValue !== undefined ? `${comp.currentValue} ${comp.unit}` : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="p-3 text-right">
                          {comp.baselineValue !== undefined ? `${comp.baselineValue} ${comp.unit}` : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="p-3 text-right">
                          {comp.currentValue !== undefined && comp.baselineValue !== undefined && (
                            <span className={comp.deviationPercent > 0 ? "text-red-600" : "text-blue-600"}>
                              {comp.deviationPercent > 0 ? '+' : ''}{comp.deviationPercent.toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {comp.status === 'ok' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />OK
                            </Badge>
                          )}
                          {comp.status === 'warning' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />Warning
                            </Badge>
                          )}
                          {(comp.status === 'missing' || comp.status === 'baseline_missing') && (
                            <Badge className="bg-gray-100 text-gray-600">
                              <Minus className="w-3 h-3 mr-1" />N/A
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedRun && (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Process Run</h3>
            <p className="text-gray-600">
              Choose a process run from the dropdown above to compare against a Golden Batch or another run
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}