import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Award, CheckCircle2, AlertTriangle, XCircle, TrendingUp, 
  TrendingDown, Minus, BarChart3, Sparkles, Loader2, Download, FileText
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from '@/api/apiClient';

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

export default function GoldenBatchComparison({ goldenBatches, processRuns, selectedBatch, onSelectBatch }) {
  const [selectedRunId, setSelectedRunId] = useState("");
  const [filterByBatch, setFilterByBatch] = useState(true);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState(null);

  const selectedRun = processRuns.find(r => r.id === selectedRunId);

  // Filter runs - option to show all or just compatible
  const compatibleRuns = selectedBatch && filterByBatch
    ? processRuns.filter(r => 
        r.productCode === selectedBatch.productCode || 
        r.line === selectedBatch.line
      )
    : processRuns;

  const compareParameters = () => {
    if (!selectedBatch || !selectedRun) return [];
    
    const comparisons = [];
    const params = selectedBatch.parameters || {};
    const tolerances = selectedBatch.tolerances || {};

    Object.keys(params).forEach(key => {
      const goldenValue = params[key];
      if (goldenValue === undefined || goldenValue === null) return;

      // Try to get value from direct field OR from sensor data average
      let currentValue = selectedRun[key];
      
      // If not found directly, try to average from sensorsRaw.allSensorReadings
      if ((currentValue === undefined || currentValue === null) && selectedRun.sensorsRaw?.allSensorReadings) {
        const readings = selectedRun.sensorsRaw.allSensorReadings
          .map(r => r[key])
          .filter(v => typeof v === 'number' && !isNaN(v));
        if (readings.length > 0) {
          currentValue = readings.reduce((a, b) => a + b, 0) / readings.length;
        }
      }

      const tolerance = tolerances[key] || 5;
      const toleranceValue = goldenValue * (tolerance / 100);
      const lowerBound = goldenValue - toleranceValue;
      const upperBound = goldenValue + toleranceValue;

      let status = 'missing';
      let deviation = 0;
      let deviationPercent = 0;

      if (currentValue !== undefined && currentValue !== null && !isNaN(currentValue)) {
        deviation = currentValue - goldenValue;
        deviationPercent = goldenValue !== 0 ? (deviation / goldenValue) * 100 : 0;
        
        if (currentValue >= lowerBound && currentValue <= upperBound) {
          status = 'ok';
        } else {
          status = 'warning';
        }
      }

      comparisons.push({
        key,
        label: PARAMETER_LABELS[key]?.label || key,
        unit: PARAMETER_LABELS[key]?.unit || "",
        goldenValue,
        currentValue,
        tolerance,
        lowerBound,
        upperBound,
        deviation,
        deviationPercent,
        status
      });
    });

    return comparisons;
  };

  const comparisons = compareParameters();
  const okCount = comparisons.filter(c => c.status === 'ok').length;
  const warningCount = comparisons.filter(c => c.status === 'warning').length;
  const missingCount = comparisons.filter(c => c.status === 'missing').length;

  const chartData = comparisons
    .filter(c => c.currentValue !== undefined)
    .map(c => ({
      name: c.label,
      golden: c.goldenValue,
      current: c.currentValue,
      deviation: c.deviationPercent
    }));

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Compare Against Golden Batch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Golden Batch</label>
              <Select
                value={selectedBatch?.id || ""}
                onValueChange={(val) => onSelectBatch(goldenBatches.find(b => b.id === val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a golden batch" />
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
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Select Process Run to Compare</label>
              <Select
                value={selectedRunId}
                onValueChange={setSelectedRunId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a process run" />
                </SelectTrigger>
                <SelectContent>
                  {processRuns.length === 0 ? (
                    <SelectItem value={null} disabled>No process runs available - upload data first</SelectItem>
                  ) : (
                    processRuns.slice(0, 50).map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {new Date(run.dateTimeStart).toLocaleDateString()} - {run.productCode} - Line {run.line}
                        {run.qualityMetrics?.firstPassYield && ` (FPY: ${run.qualityMetrics.firstPassYield}%)`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {processRuns.length} process run(s) available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {selectedBatch && selectedRun && (() => {
        // Check if process run has sensor data that matches golden batch parameters
        const goldenParams = Object.keys(selectedBatch.parameters || {}).filter(k => selectedBatch.parameters[k] !== undefined);
        const hasDirectFields = goldenParams.some(p => selectedRun[p] !== undefined && selectedRun[p] !== null);
        const hasSensorData = selectedRun.sensorsRaw?.allSensorReadings && selectedRun.sensorsRaw.allSensorReadings.length > 0;
        const hasMatchingSensorData = hasSensorData && goldenParams.some(p => 
          selectedRun.sensorsRaw.allSensorReadings.some(r => r[p] !== undefined && r[p] !== null)
        );
        
        // If no matching data at all (neither direct nor sensor), show error
        if (!hasDirectFields && !hasMatchingSensorData) {
          return (
            <Alert className="bg-red-50 border-red-300">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>❌ Comparison Cannot Be Done:</strong> The selected Process Run does not contain the required parameters defined in this Golden Batch.
                <div className="mt-2 text-sm">
                  <p className="font-semibold">Golden Batch expects:</p>
                  <p className="ml-2">{goldenParams.map(p => PARAMETER_LABELS[p]?.label || p).join(', ')}</p>
                  <p className="font-semibold mt-2">Process Run has:</p>
                  <p className="ml-2">
                    {Object.keys(selectedRun).filter(k => 
                      typeof selectedRun[k] === 'number' && !['id', 'created_date', 'updated_date'].includes(k)
                    ).map(k => PARAMETER_LABELS[k]?.label || k).join(', ') || 'No matching numeric parameters'}
                  </p>
                  <p className="mt-3 font-semibold text-red-800">
                    💡 Upload Process Run data via Data Upload page with columns matching the Golden Batch parameters.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          );
        }
        
        return (
          <>
            {/* Format Matching Warning */}
            <Alert className="bg-amber-50 border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Best Practice:</strong> For accurate analysis without AI hallucination, ensure the Process Run data format matches the Golden Batch parameters. 
                Both should contain the same parameter columns (e.g., lineSpeed, nipPressure, temperatures) for reliable comparison.
                {(() => {
                  const missingInRun = goldenParams.filter(p => {
                    const directValue = selectedRun[p];
                    const sensorValue = hasSensorData && selectedRun.sensorsRaw.allSensorReadings.some(r => r[p] !== undefined && r[p] !== null);
                    return (directValue === undefined || directValue === null) && !sensorValue;
                  });
                  if (missingInRun.length > 0) {
                    return (
                      <span className="block mt-2 text-red-900 font-bold">
                        ❌ Missing parameters in Process Run: {missingInRun.map(p => PARAMETER_LABELS[p]?.label || p).join(', ')}
                        <br/>
                        <span className="text-sm font-normal">Upload Process Run data with these columns via Data Upload, or they will show as "N/A" in comparison.</span>
                      </span>
                    );
                  }
                  return null;
                })()}
              </AlertDescription>
            </Alert>
          {/* AI Analysis Button */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-purple-900">AI Comparative Analysis</h4>
                  <p className="text-sm text-purple-700">Get AI insights on deviations and recommendations</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reportText = `
GOLDEN BATCH COMPARISON REPORT
==============================
Date: ${new Date().toLocaleString()}
Golden Batch: ${selectedBatch.name}
Product: ${selectedBatch.productCode}
Line: ${selectedBatch.line}

Process Run: ${new Date(selectedRun.dateTimeStart).toLocaleString()}

PARAMETER COMPARISON:
${comparisons.map(c => `${c.label}: Golden=${c.goldenValue}${c.unit}, Current=${c.currentValue !== undefined ? c.currentValue + c.unit : 'N/A'}, Deviation=${c.deviationPercent?.toFixed(2) || 'N/A'}%, Status=${c.status}`).join('\n')}

SUMMARY:
- Within Tolerance: ${okCount}
- Outside Tolerance: ${warningCount}
- Missing Data: ${missingCount}
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
                    Download Comparison
                  </Button>
                  <Button
                    onClick={async () => {
                      setAiAnalyzing(true);
                      try {
                        const result = await api.integrations.Core.InvokeLLM({
                          prompt: `Compare this process run against golden batch standards:

GOLDEN BATCH "${selectedBatch.name}":
- Product: ${selectedBatch.productCode}
- Line: ${selectedBatch.line}
- Parameters: ${JSON.stringify(selectedBatch.parameters)}
- Quality Metrics: FPY ${selectedBatch.qualityMetrics?.firstPassYield}%

ACTUAL PROCESS RUN:
- Date: ${new Date(selectedRun.dateTimeStart).toLocaleString()}
- Parameters: Line Speed ${selectedRun.lineSpeed}, Nip Pressure ${selectedRun.nipPressure}, Web Tension ${selectedRun.webTensionIn}/${selectedRun.webTensionOut}
- Temps: Chill ${selectedRun.rollTempChill}, Top ${selectedRun.rollTempTop}, Bottom ${selectedRun.rollTempBottom}

DEVIATIONS FOUND: ${warningCount} parameters outside tolerance

Provide:
1. Root cause analysis for deviations
2. Impact assessment on quality
3. Specific corrective actions
4. Parameter adjustment recommendations
5. Risk level (high/medium/low)`,
                          response_json_schema: {
                            type: "object",
                            properties: {
                              riskLevel: { type: "string" },
                              rootCauseAnalysis: { type: "array", items: { type: "string" } },
                              impactAssessment: { type: "string" },
                              correctiveActions: { type: "array", items: { type: "string" } },
                              parameterRecommendations: { type: "array", items: { type: "object", properties: { parameter: { type: "string" }, current: { type: "string" }, recommended: { type: "string" }, reason: { type: "string" } } } },
                              overallAssessment: { type: "string" }
                            }
                          }
                        });
                        setAiReport(result);
                      } catch (error) {
                        console.error("AI analysis error:", error);
                      }
                      setAiAnalyzing(false);
                    }}
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
GOLDEN BATCH COMPARISON REPORT
==============================
Date: ${new Date().toLocaleString()}
Golden Batch: ${selectedBatch.name}
Process Run: ${new Date(selectedRun.dateTimeStart).toLocaleString()}

RISK LEVEL: ${aiReport.riskLevel}

OVERALL ASSESSMENT:
${aiReport.overallAssessment}

ROOT CAUSE ANALYSIS:
${aiReport.rootCauseAnalysis?.map((r, i) => `${i+1}. ${r}`).join('\n')}

IMPACT ASSESSMENT:
${aiReport.impactAssessment}

CORRECTIVE ACTIONS:
${aiReport.correctiveActions?.map((a, i) => `${i+1}. ${a}`).join('\n')}

PARAMETER RECOMMENDATIONS:
${aiReport.parameterRecommendations?.map(p => `- ${p.parameter}: ${p.current} → ${p.recommended} (${p.reason})`).join('\n')}
                        `;
                        const blob = new Blob([reportText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `golden-batch-report-${new Date().toISOString().split('T')[0]}.txt`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Report Display */}
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
                  <h5 className="font-semibold text-blue-900 mb-2">Overall Assessment</h5>
                  <p className="text-sm text-blue-800">{aiReport.overallAssessment}</p>
                </div>
                
                {aiReport.rootCauseAnalysis?.length > 0 && (
                  <div>
                    <h5 className="font-semibold mb-2">Root Cause Analysis</h5>
                    <ul className="space-y-1 text-sm">
                      {aiReport.rootCauseAnalysis.map((cause, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                          {cause}
                        </li>
                      ))}
                    </ul>
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
          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-4">
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
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Minus className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-700">{missingCount}</p>
                  <p className="text-sm text-gray-600">Missing Data</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {warningCount > 0 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{warningCount} parameter(s)</strong> are outside the golden batch tolerance. 
                Review and adjust to match optimal conditions.
              </AlertDescription>
            </Alert>
          )}

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
                    <Bar 
                      dataKey="deviation" 
                      fill={(entry) => entry.deviation > 0 ? "#EF4444" : "#3B82F6"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comparison Table */}
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
                      <th className="text-right p-3">Golden Value</th>
                      <th className="text-right p-3">Current Value</th>
                      <th className="text-right p-3">Tolerance</th>
                      <th className="text-right p-3">Deviation</th>
                      <th className="text-center p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((comp) => (
                      <tr key={comp.key} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{comp.label}</td>
                        <td className="p-3 text-right">
                          {comp.goldenValue} {comp.unit}
                        </td>
                        <td className="p-3 text-right">
                          {comp.currentValue !== undefined 
                            ? `${comp.currentValue} ${comp.unit}`
                            : <span className="text-gray-400">N/A</span>
                          }
                        </td>
                        <td className="p-3 text-right">±{comp.tolerance}%</td>
                        <td className="p-3 text-right">
                          {comp.currentValue !== undefined && (
                            <span className={comp.deviationPercent > 0 ? "text-red-600" : "text-blue-600"}>
                              {comp.deviationPercent > 0 ? '+' : ''}{comp.deviationPercent.toFixed(2)}%
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {comp.status === 'ok' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
                          {comp.status === 'warning' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Warning
                            </Badge>
                          )}
                          {comp.status === 'missing' && (
                            <Badge className="bg-gray-100 text-gray-600">
                              <Minus className="w-3 h-3 mr-1" />
                              Missing
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
        );
      })()}

      {!selectedBatch && (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Golden Batch</h3>
            <p className="text-gray-600">
              Choose a golden batch from the dropdown above to compare against process runs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}