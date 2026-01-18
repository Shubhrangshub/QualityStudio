import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import {
  BarChart3, TrendingUp, Target, AlertTriangle,
  CheckCircle2, Activity, Download, Info, Sparkles, 
  Loader2, Play, Database, Sliders, Save, History, Trash2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from "date-fns";

export default function SPCCapability() {
  const [selectedFileId, setSelectedFileId] = useState(null); // NEW: File-based selection
  const [selectedParameter, setSelectedParameter] = useState("lineSpeed");
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");
  const [target, setTarget] = useState("");
  const [selectedRunIds, setSelectedRunIds] = useState([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [simulationParams, setSimulationParams] = useState({});
  const [simulationResult, setSimulationResult] = useState(null);

  const { data: uploadHistory = [] } = useQuery({
    queryKey: ['upload-history-spc'],
    queryFn: async () => {
      const history = await api.entities.FileUploadHistory.filter({ fileType: 'process_run' }, "-created_date", 100);
      console.log('📋 SPC fetched', history.length, 'upload history records');
      console.log('📋 Upload history IDs:', history.map(h => ({ id: h.id?.slice(0, 12), fileName: h.fileName })));
      return history;
    },
  });

  const { data: allProcessRuns = [] } = useQuery({
    queryKey: ['runs-spc'],
    queryFn: async () => {
      const runs = await api.entities.ProcessRun.list("-dateTimeStart", 500);
      console.log('📊 SPC fetched', runs.length, 'ProcessRuns');
      console.log('📊 Sample runs with uploadHistoryId:', runs.slice(0, 5).map(r => ({
        id: r.id?.slice(0, 8),
        uploadHistoryId: r.uploadHistoryId,
        line: r.line,
        product: r.productCode,
        hasSensors: !!r.sensorsRaw?.allSensorReadings
      })));
      return runs;
    },
    refetchOnMount: true,
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-spc'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 50),
  });

  const queryClient = useQueryClient();

  const saveSPCAnalysisMutation = useMutation({
    mutationFn: (data) => api.entities.SPCAnalysis.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spc-history'] });
    }
  });

  // FILE-BASED FILTERING: Filter runs based on selected file
  const selectedFile = uploadHistory.find(f => f.id === selectedFileId);
  
  const filteredRuns = selectedFileId && selectedFile
    ? allProcessRuns.filter(run => {
        const matches = run.uploadHistoryId === selectedFileId;
        return matches;
      })
    : [];
  
  // DEBUG: Enhanced logging
  React.useEffect(() => {
    if (selectedFileId) {
      const runsWithUploadId = allProcessRuns.filter(r => r.uploadHistoryId);
      const matchingRuns = allProcessRuns.filter(r => r.uploadHistoryId === selectedFileId);
      
      console.log('🔍 SPC Debug - DETAILED:', {
        selectedFileId: selectedFileId,
        selectedFileId_type: typeof selectedFileId,
        selectedFileName: selectedFile?.fileName,
        totalProcessRuns: allProcessRuns.length,
        runsWithUploadHistoryId: runsWithUploadId.length,
        filteredRuns: filteredRuns.length,
        allUploadHistoryIds: [...new Set(allProcessRuns.map(r => r.uploadHistoryId).filter(Boolean))],
        uploadHistoryIdTypes: runsWithUploadId.map(r => typeof r.uploadHistoryId),
        exactMatch: matchingRuns.length,
        sampleRunsDetails: allProcessRuns.slice(0, 5).map(r => ({
          id: r.id?.slice(0, 8),
          uploadHistoryId: r.uploadHistoryId,
          uploadHistoryId_type: typeof r.uploadHistoryId,
          line: r.line,
          product: r.productCode,
          hasUploadId: !!r.uploadHistoryId,
          hasSensorData: !!r.sensorsRaw?.allSensorReadings,
          sensorReadingCount: r.sensorsRaw?.allSensorReadings?.length || 0,
          matchesSelectedFile: r.uploadHistoryId === selectedFileId,
          strictMatch: r.uploadHistoryId === selectedFileId,
          looseMatch: String(r.uploadHistoryId) === String(selectedFileId)
        }))
      });
      
      if (matchingRuns.length === 0 && runsWithUploadId.length > 0) {
        console.error('❌ NO MATCH FOUND!');
        console.log('Selected file ID:', selectedFileId);
        console.log('Available uploadHistoryIds in ProcessRuns:', runsWithUploadId.map(r => r.uploadHistoryId));
        console.log('ID comparison:', runsWithUploadId.map(r => ({
          runUploadId: r.uploadHistoryId,
          selectedId: selectedFileId,
          equal: r.uploadHistoryId === selectedFileId,
          stringEqual: String(r.uploadHistoryId) === String(selectedFileId)
        })));
      } else if (matchingRuns.length > 0) {
        console.log('✅ Found', matchingRuns.length, 'matching runs');
        console.log('First matching run sensor data:', matchingRuns[0].sensorsRaw?.allSensorReadings?.length, 'readings');
      }
    }
  }, [selectedFileId, allProcessRuns.length]);

  const selectedLine = selectedFile?.keyMetrics?.line || "Not specified";
  const selectedProduct = selectedFile?.keyMetrics?.productCode || "Not specified";
  
  const filteredDefects = defects.filter(def => {
    if (selectedLine !== "Not specified" && def.line && def.line !== selectedLine) return false;
    if (selectedProduct !== "Not specified" && def.productCode && def.productCode !== selectedProduct) return false;
    return true;
  });

  // Get parameters from SELECTED FILE ONLY
  const allParameterColumns = selectedFile?.keyMetrics?.columns || [];
  
  // Alternative: extract from the actual filtered runs if columns not in metadata
  const parametersFromRuns = selectedFileId && filteredRuns.length > 0
    ? [...new Set(
        filteredRuns.flatMap(run => {
          const columns = new Set();
          
          if (run.sensorsRaw?.originalRow && typeof run.sensorsRaw.originalRow === 'object') {
            Object.keys(run.sensorsRaw.originalRow).forEach(key => columns.add(key));
          }
          
          Object.keys(run).forEach(k => {
            if (typeof run[k] === 'number' && !['id', 'created_date', 'updated_date'].includes(k)) {
              columns.add(k);
            }
          });
          
          return Array.from(columns);
        })
      )].filter(Boolean)
    : [];
  
  const finalParameterColumns = allParameterColumns.length > 0 ? allParameterColumns : parametersFromRuns;

  // Parameter options - from selected file only
  const parameterOptions = finalParameterColumns.map(col => ({
    value: col,
    label: col,
    defaultUSL: 100,
    defaultLSL: 0,
    defaultTarget: 50
  }));

  const selectedParamOption = parameterOptions.find(p => p.value === selectedParameter);

  // Use defaults if not set
  const effectiveUSL = usl ? parseFloat(usl) : selectedParamOption?.defaultUSL || 100;
  const effectiveLSL = lsl ? parseFloat(lsl) : selectedParamOption?.defaultLSL || 0;
  const effectiveTarget = target ? parseFloat(target) : selectedParamOption?.defaultTarget || 50;

  // Calculate capability from filteredRuns - extract from sensorsRaw.allSensorReadings
  const calculateCapability = () => {
    // Extract all sensor readings from all matching runs
    const values = filteredRuns.flatMap(run => {
      // New format: sensorsRaw.allSensorReadings = array of sensor reading objects
      if (run.sensorsRaw?.allSensorReadings && Array.isArray(run.sensorsRaw.allSensorReadings)) {
        return run.sensorsRaw.allSensorReadings
          .map(reading => reading[selectedParameter])
          .filter(v => typeof v === 'number' && !isNaN(v));
      }
      return [];
    });

    if (values.length < 2) return null;

    // Calculate statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);

    // Calculate Cp (Process Capability - potential)
    const cp = (effectiveUSL - effectiveLSL) / (6 * stdDev);

    // Calculate Cpk (Process Capability - actual, considering centering)
    const cpuUpper = (effectiveUSL - mean) / (3 * stdDev);
    const cplLower = (mean - effectiveLSL) / (3 * stdDev);
    const cpk = Math.min(cpuUpper, cplLower);

    // Calculate Ppk (long-term performance)
    const ppk = cpk; // Simplified - in practice would use different sigma calculation

    // Control limits (±3σ)
    const ucl = mean + 3 * stdDev;
    const lcl = mean - 3 * stdDev;

    return {
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(3),
      cp: cp.toFixed(2),
      cpk: cpk.toFixed(2),
      ppk: ppk.toFixed(2),
      ucl: ucl.toFixed(2),
      lcl: lcl.toFixed(2),
      sampleSize: values.length,
      withinSpec: values.filter(v => v >= effectiveLSL && v <= effectiveUSL).length,
      outOfSpec: values.filter(v => v < effectiveLSL || v > effectiveUSL).length
    };
  };

  const capability = calculateCapability();

  // Control chart data - extract from sensorsRaw.allSensorReadings
  const controlChartData = filteredRuns.flatMap(run => {
    // Extract all sensor readings from this run
    if (run.sensorsRaw?.allSensorReadings && Array.isArray(run.sensorsRaw.allSensorReadings)) {
      return run.sensorsRaw.allSensorReadings.map((reading, idx) => ({
        date: reading.timestamp || reading.dateTimeStart || reading.DateTime || `Reading ${idx + 1}`,
        value: reading[selectedParameter],
        line: run.line,
        product: run.productCode,
        source: 'sensor'
      })).filter(d => typeof d.value === 'number' && !isNaN(d.value));
    }
    return [];
  }).slice(0, 500);

  // Process parameter histogram data - from all sensor readings
  const getHistogramData = () => {
    const values = filteredRuns.flatMap(run => {
      if (run.sensorsRaw?.allSensorReadings && Array.isArray(run.sensorsRaw.allSensorReadings)) {
        return run.sensorsRaw.allSensorReadings
          .map(reading => reading[selectedParameter])
          .filter(v => typeof v === 'number' && !isNaN(v));
      }
      return [];
    });

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 12;
    const binSize = (max - min) / binCount;

    const bins = Array(binCount).fill(0);
    values.forEach(val => {
      const binIndex = Math.min(Math.floor((val - min) / binSize), binCount - 1);
      bins[binIndex]++;
    });

    return bins.map((count, idx) => ({
      range: `${(min + idx * binSize).toFixed(1)}`,
      count,
      binCenter: (min + (idx + 0.5) * binSize)
    }));
  };

  const histogramData = getHistogramData();
  
  // Extract unique lines from upload history for simulation
  const lines = [...new Set(uploadHistory.map(f => f.keyMetrics?.line).filter(Boolean))];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            SPC & Process Capability
          </h1>
          <p className="text-gray-600 mt-1">Statistical Process Control and Capability Analysis</p>
        </div>

        {/* Data Source Info */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📊 How to Use:</strong> (1) Upload CSV via "Data Upload" with Line/Product tags → (2) Select that file below by name → (3) Choose parameter from that file → (4) Set USL/LSL → (5) View analysis.
            Auto-selects {controlChartData.length > 30 ? 'X̄-R' : 'I-MR'} chart based on sample size.
            {selectedFile && ` Analyzing: "${selectedFile.fileName}" (${filteredRuns.length} runs)`}
          </AlertDescription>
        </Alert>

        {/* Sample Size Warning */}
        {capability && capability.sampleSize < 30 && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>⚠️ Small Sample Size:</strong> {capability.sampleSize} data points (using {filteredRuns.length <= 30 ? 'I-MR' : 'X̄-R'} chart). 
              Industry standard: ≥30 samples for reliable Cp/Cpk. Upload more data or change filters to include more runs.
            </AlertDescription>
          </Alert>
        )}
        
        {/* No File Selected Warning */}
        {!selectedFileId && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>👇 Select a file below to begin analysis.</strong> {uploadHistory.length} uploaded file(s) available. 
              {uploadHistory.length === 0 && ' Upload data via "Data Upload" page first.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* No Data in Selected File Warning */}
        {selectedFileId && filteredRuns.length === 0 && allProcessRuns.length > 0 && (
          <Alert className="mb-6 bg-red-50 border-red-300">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>❌ No ProcessRun records found</strong> for file "{selectedFile?.fileName}". 
              <br />
              <span className="text-sm">
                File ID: {selectedFileId?.slice(0, 12)}... | 
                Total ProcessRuns in system: {allProcessRuns.length} | 
                Records with uploadHistoryId: {allProcessRuns.filter(r => r.uploadHistoryId).length}
              </span>
              <br />
              <span className="text-sm font-semibold mt-2 block">
                ⚠️ This usually means the upload didn't complete. Please re-upload the file via Data Upload page.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* File Selection & Spec Limits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Analysis Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Label>Select Data File</Label>
                <Select value={selectedFileId || ""} onValueChange={setSelectedFileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose uploaded file..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadHistory.map(file => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.fileName} ({file.recordCount} records)
                      </SelectItem>
                    ))}
                    {uploadHistory.length === 0 && (
                      <SelectItem value="none" disabled>No files uploaded yet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    Line: {selectedFile.keyMetrics?.line || 'N/A'} | Product: {selectedFile.keyMetrics?.productCode || 'N/A'}
                  </p>
                )}
              </div>
              <div>
                <Label>Parameter</Label>
                <Select 
                  value={selectedParameter} 
                  onValueChange={(val) => {
                    setSelectedParameter(val);
                    const param = parameterOptions.find(p => p.value === val);
                    if (param) {
                      setUsl(param.defaultUSL.toString());
                      setLsl(param.defaultLSL.toString());
                      setTarget(param.defaultTarget.toString());
                    }
                  }}
                  disabled={!selectedFileId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select file first..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parameterOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                    {parameterOptions.length === 0 && (
                      <SelectItem value="none" disabled>No parameters available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>USL (Upper)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={usl}
                  onChange={(e) => setUsl(e.target.value)}
                  placeholder={selectedParamOption?.defaultUSL?.toString()}
                />
              </div>
              <div>
                <Label>Target</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={selectedParamOption?.defaultTarget?.toString()}
                />
              </div>
              <div>
                <Label>LSL (Lower)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={lsl}
                  onChange={(e) => setLsl(e.target.value)}
                  placeholder={selectedParamOption?.defaultLSL?.toString()}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Data Summary */}
            <div className="mt-4 grid md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-xs text-blue-700 font-medium">Total Runs</p>
                <p className="text-lg font-bold text-blue-900">{filteredRuns.length}</p>
                <p className="text-xs text-blue-600">After filters</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">In Spec</p>
                <p className="text-lg font-bold text-green-900">
                  {capability ? capability.withinSpec : '-'}
                </p>
                <p className="text-xs text-green-600">
                  {capability ? `${((capability.withinSpec / capability.sampleSize) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700 font-medium">Out of Spec</p>
                <p className="text-lg font-bold text-red-900">
                  {capability ? capability.outOfSpec : '-'}
                </p>
                <p className="text-xs text-red-600">
                  {capability ? `${((capability.outOfSpec / capability.sampleSize) * 100).toFixed(1)}%` : '-'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-700 font-medium">Linked Defects</p>
                <p className="text-lg font-bold text-purple-900">{filteredDefects.length}</p>
                <p className="text-xs text-purple-600">In period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="control-chart" className="space-y-6">
          <TabsList>
            <TabsTrigger value="control-chart">Control Chart</TabsTrigger>
            <TabsTrigger value="capability">Capability</TabsTrigger>
            <TabsTrigger value="histogram">Distribution</TabsTrigger>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
          </TabsList>

          {/* Control Chart Tab */}
          <TabsContent value="control-chart">
            <div className="space-y-6">
              {/* Capability Summary Cards */}
              {capability && (
                <div className="grid md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Mean (μ)</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{capability.mean}</p>
                      <p className="text-xs text-gray-500 mt-1">n = {capability.sampleSize}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Std Dev (σ)</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{capability.stdDev}</p>
                      <p className="text-xs text-gray-500 mt-1">From process data</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Cp</p>
                      <p className={`text-2xl font-bold mt-1 ${capability.cp >= 1.33 ? 'text-green-600' : capability.cp >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {capability.cp}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Potential</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Cpk</p>
                      <p className={`text-2xl font-bold mt-1 ${capability.cpk >= 1.33 ? 'text-green-600' : capability.cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {capability.cpk}
                      </p>
                      <Badge className={`mt-1 ${capability.cpk >= 1.33 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {capability.cpk >= 1.33 ? 'Capable' : capability.cpk >= 1.0 ? 'Marginal' : 'Not Capable'}
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">UCL / LCL</p>
                      <p className="text-lg font-bold text-red-600 mt-1">
                        {capability.ucl}
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        {capability.lcl}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">±3σ limits</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!capability && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900">
                    <strong>No process data available.</strong> Upload process runs via "Data Upload" page to see capability analysis.
                  </AlertDescription>
                </Alert>
              )}

              {/* Control Chart */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {controlChartData.length > 30 ? 'X̄-R Control Chart' : 'I-MR Control Chart'} - {selectedParamOption?.label}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {controlChartData.length > 30 
                          ? 'Subgroup averages with range chart for large datasets'
                          : 'Individual measurements with moving range for small datasets'
                        } (±3σ control limits)
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">Spec Limits:</p>
                      <p className="font-mono text-xs">
                        LSL: {effectiveLSL} | Target: {effectiveTarget} | USL: {effectiveUSL}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {controlChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={controlChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name={selectedParamOption?.label}
                          dot={{ r: 3 }}
                        />
                        {capability && (
                          <>
                            <Line
                              type="monotone"
                              dataKey={() => capability.ucl}
                              stroke="#ef4444"
                              strokeDasharray="5 5"
                              name="UCL (μ+3σ)"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={() => capability.mean}
                              stroke="#22c55e"
                              strokeDasharray="3 3"
                              strokeWidth={2}
                              name="Mean (μ)"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={() => capability.lcl}
                              stroke="#ef4444"
                              strokeDasharray="5 5"
                              name="LCL (μ-3σ)"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={() => effectiveUSL}
                              stroke="#9333ea"
                              strokeDasharray="2 2"
                              name="USL (Spec)"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={() => effectiveLSL}
                              stroke="#9333ea"
                              strokeDasharray="2 2"
                              name="LSL (Spec)"
                              dot={false}
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No process run data for selected filters</p>
                        <p className="text-sm mt-2">Upload ProcessRun data via Data Upload page</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Capability Analysis Tab */}
          <TabsContent value="capability">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Process Capability Indices</CardTitle>
                  <p className="text-sm text-gray-500 mt-2">
                    Calculated from {capability?.sampleSize || 0} ProcessRun measurements
                  </p>
                </CardHeader>
                <CardContent>
                  {capability ? (
                    <div className="space-y-4">
                      {/* Formulas Card */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3">📐 Calculation Formulas:</h4>
                        <div className="space-y-2 text-sm text-blue-800">
                          <div className="p-2 bg-white rounded">
                            <p className="font-mono text-xs">Cp = (USL - LSL) / (6σ)</p>
                            <p className="text-xs text-gray-600 mt-1">= ({effectiveUSL} - {effectiveLSL}) / (6 × {capability.stdDev})</p>
                            <p className="text-xs text-blue-700 mt-1">= <strong>{capability.cp}</strong></p>
                          </div>
                          <div className="p-2 bg-white rounded">
                            <p className="font-mono text-xs">Cpk = min(Cpu, Cpl)</p>
                            <p className="text-xs text-gray-600 mt-1">Cpu = (USL - μ) / 3σ, Cpl = (μ - LSL) / 3σ</p>
                            <p className="text-xs text-blue-700 mt-1">= <strong>{capability.cpk}</strong></p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Cp (Potential Capability)</span>
                          <span className={`text-2xl font-bold ${capability.cp >= 1.33 ? 'text-green-600' : capability.cp >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {capability.cp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Process spread vs. specification width (ignores centering)
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Cpk (Actual Capability)</span>
                          <span className={`text-2xl font-bold ${capability.cpk >= 1.33 ? 'text-green-600' : capability.cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {capability.cpk}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Actual capability accounting for process centering
                        </p>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Capability Interpretation:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Cpk ≥ 1.33: <strong>Process is capable</strong> (≤64 PPM defects)</li>
                          <li>• 1.0 ≤ Cpk &lt; 1.33: <strong>Marginal</strong> (needs improvement)</li>
                          <li>• Cpk &lt; 1.0: <strong>Not capable</strong> (high defect rate)</li>
                        </ul>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-3">Process Statistics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sample Size (n):</span>
                            <span className="font-medium">{capability.sampleSize} runs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Process Mean (μ):</span>
                            <span className="font-medium">{capability.mean}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Std Dev (σ):</span>
                            <span className="font-medium">{capability.stdDev}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Upper Control Limit:</span>
                            <span className="font-medium">{capability.ucl}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lower Control Limit:</span>
                            <span className="font-medium">{capability.lcl}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-gray-600">Spec Range:</span>
                            <span className="font-medium">{effectiveLSL} to {effectiveUSL}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="font-medium mb-2">No Process Data Available</p>
                      <p className="text-sm">Upload ProcessRun data to calculate Cp/Cpk</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Capability Visualization</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Process distribution vs. specification limits
                  </p>
                </CardHeader>
                <CardContent>
                  {histogramData.length > 0 && capability ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={histogramData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      No data for distribution chart
                    </div>
                  )}

                  {capability && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>LSL: {effectiveLSL}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Target: {effectiveTarget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>USL: {effectiveUSL}</span>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          μ = {capability.mean}, σ = {capability.stdDev}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Capability Analysis Tab */}
          <TabsContent value="capability">
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  How Capability is Calculated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-semibold text-gray-900 mb-1">Step 1: Data Collection</p>
                    <p className="text-gray-700">
                      System pulls <strong>{selectedParameter}</strong> values from file <strong>"{selectedFile?.fileName || 'None selected'}"</strong>
                      (Line: {selectedLine}, Product: {selectedProduct})
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Currently using: {capability?.sampleSize || 0} data points from {filteredRuns.length} process runs in this file
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-semibold text-gray-900 mb-1">Step 2: Statistical Calculation</p>
                    <ul className="text-gray-700 space-y-1 list-disc list-inside">
                      <li>Mean (μ) = Average of all values</li>
                      <li>Std Dev (σ) = √(Σ(x-μ)² / (n-1))</li>
                      <li>UCL/LCL = μ ± 3σ (control limits)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-lg border">
                    <p className="font-semibold text-gray-900 mb-1">Step 3: Capability Indices</p>
                    <ul className="text-gray-700 space-y-1 list-disc list-inside">
                      <li><strong>Cp</strong> = (USL - LSL) / 6σ = Process spread vs spec width</li>
                      <li><strong>Cpk</strong> = min[(USL-μ)/3σ, (μ-LSL)/3σ] = Accounts for centering</li>
                    </ul>
                    <p className="text-xs text-purple-600 mt-2">
                      File: "{selectedFile?.fileName}" | Spec limits: USL={effectiveUSL}, LSL={effectiveLSL}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {capability && (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Capability Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="text-xs text-gray-600">Process Mean</p>
                        <p className="text-xl font-bold">{capability.mean}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="text-xs text-gray-600">Std Deviation</p>
                        <p className="text-xl font-bold">{capability.stdDev}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="text-xs text-gray-600">Cp</p>
                        <p className={`text-xl font-bold ${capability.cp >= 1.33 ? 'text-green-600' : 'text-red-600'}`}>
                          {capability.cp}
                        </p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="text-xs text-gray-600">Cpk</p>
                        <p className={`text-xl font-bold ${capability.cpk >= 1.33 ? 'text-green-600' : 'text-red-600'}`}>
                          {capability.cpk}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border-2 rounded-lg">
                      <h4 className="font-semibold mb-2">Specification Compliance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Within Specification:</span>
                          <span className="font-bold text-green-600">
                            {capability.withinSpec} / {capability.sampleSize}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Out of Specification:</span>
                          <span className="font-bold text-red-600">
                            {capability.outOfSpec} / {capability.sampleSize}
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm">Yield Rate:</span>
                            <span className="font-bold">
                              {((capability.withinSpec / capability.sampleSize) * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${
                      capability.cpk >= 1.33 ? 'bg-green-50 border-green-300' :
                      capability.cpk >= 1.0 ? 'bg-yellow-50 border-yellow-300' :
                      'bg-red-50 border-red-300'
                    }`}>
                      <h4 className="font-semibold mb-2">Process Assessment</h4>
                      <p className="text-sm mb-3">
                        {capability.cpk >= 1.33 ? (
                          <>✅ <strong>Process is capable.</strong> Expected defect rate ≤ 64 PPM</>
                        ) : capability.cpk >= 1.0 ? (
                          <>⚠️ <strong>Marginal capability.</strong> Process improvement recommended</>
                        ) : (
                          <>❌ <strong>Process not capable.</strong> Immediate action required</>
                        )}
                      </p>
                      {capability.cpk < 1.33 && (
                        <div className="text-xs space-y-1">
                          <p><strong>Recommendations:</strong></p>
                          <ul className="list-disc list-inside space-y-1">
                            {capability.cp > capability.cpk ? (
                              <li>Process is off-center - adjust {selectedParameter} to target ({effectiveTarget})</li>
                            ) : (
                              <li>Reduce process variation - investigate inconsistent parameters</li>
                            )}
                            <li>Review process controls and operator training</li>
                            <li>Consider DoE study to optimize {selectedParameter}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Quality & Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3">📊 Data Being Analyzed:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Selected File:</span>
                          <Badge className="bg-blue-600 text-white">{selectedFile?.fileName || 'None'}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Records in File:</span>
                          <Badge className="bg-green-600 text-white">{filteredRuns.length}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Parameter:</span>
                          <Badge variant="outline">{selectedParamOption?.label || selectedParameter}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Line (from file):</span>
                          <Badge variant="outline">{selectedLine}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Product (from file):</span>
                          <Badge variant="outline">{selectedProduct}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Control Chart:</span>
                          <Badge className="bg-purple-100 text-purple-800">
                            {controlChartData.length > 30 ? 'X̄-R (n>30)' : 'I-MR (n≤30)'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Specification Limits</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Upper Spec Limit (USL):</span>
                          <span className="font-bold text-purple-700">{effectiveUSL}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Target Value:</span>
                          <span className="font-bold text-green-700">{effectiveTarget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lower Spec Limit (LSL):</span>
                          <span className="font-bold text-purple-700">{effectiveLSL}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Specification Width:</span>
                          <span className="font-medium">{(effectiveUSL - effectiveLSL).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Process Spread (6σ):</span>
                          <span className="font-medium">{(6 * parseFloat(capability.stdDev)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">💡 How It Works:</h4>
                      <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                        <li>Upload CSV → Specify Line/Product → Creates ProcessRun records</li>
                        <li>Select Parameter from dropdown (all CSV columns available)</li>
                        <li>Set USL/LSL/Target values</li>
                        <li>View Control Chart, Cp/Cpk, Distribution across all tabs</li>
                        <li>Run Simulation or AI Analysis for insights</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Histogram/Distribution Tab */}
          <TabsContent value="histogram">
            <Card>
              <CardHeader>
                <CardTitle>Process Distribution - {selectedParamOption?.label}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Histogram from {filteredRuns.length} ProcessRun measurements
                </p>
              </CardHeader>
              <CardContent>
                {histogramData.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={histogramData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {capability && (
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-3 border rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Process Centered?</p>
                          <p className={`text-lg font-bold ${
                            Math.abs(parseFloat(capability.mean) - effectiveTarget) / (effectiveUSL - effectiveLSL) < 0.1
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }`}>
                            {Math.abs(parseFloat(capability.mean) - effectiveTarget) / (effectiveUSL - effectiveLSL) < 0.1
                              ? 'Yes ✓'
                              : 'No ⚠️'
                            }
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Offset: {(parseFloat(capability.mean) - effectiveTarget).toFixed(2)}
                          </p>
                        </div>
                        <div className="p-3 border rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Process Spread</p>
                          <p className="text-lg font-bold text-gray-900">
                            {(6 * parseFloat(capability.stdDev)).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">6σ range</p>
                        </div>
                        <div className="p-3 border rounded-lg text-center">
                          <p className="text-xs text-gray-600 mb-1">Spec Utilization</p>
                          <p className="text-lg font-bold text-blue-600">
                            {((6 * parseFloat(capability.stdDev)) / (effectiveUSL - effectiveLSL) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">of tolerance</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p>No process run data available</p>
                      <p className="text-sm mt-2">Upload data and set Line/Product</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulation Tab - SIMPLIFIED */}
          <TabsContent value="simulation">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-600" />
                    Process Run Simulation
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Select parameters and simulate process outcomes
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Parameter Selection */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="text-sm font-medium text-blue-900 mb-2 block">Select Parameters to Simulate</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {parameterOptions.map(param => (
                        <div key={param.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`sim-${param.value}`}
                            checked={simulationParams[param.value]?.enabled ?? false}
                            onCheckedChange={(checked) => {
                              setSimulationParams(prev => ({
                                ...prev,
                                [param.value]: {
                                  ...prev[param.value],
                                  enabled: checked,
                                  value: prev[param.value]?.value ?? param.defaultTarget
                                }
                              }));
                            }}
                          />
                          <label htmlFor={`sim-${param.value}`} className="text-sm cursor-pointer">
                            {param.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Line Selection */}
                  <div>
                    <Label>Production Line</Label>
                    <Select 
                      value={simulationParams.line || "all"} 
                      onValueChange={(val) => setSimulationParams(prev => ({ ...prev, line: val }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Lines</SelectItem>
                        {lines.map(line => (
                          <SelectItem key={line} value={line}>{line}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parameter Sliders */}
                  <div className="space-y-4 max-h-64 overflow-y-auto p-2">
                    {parameterOptions.filter(p => simulationParams[p.value]?.enabled).map(param => (
                      <div key={param.value}>
                        <div className="flex justify-between items-center mb-2">
                          <Label>{param.label}</Label>
                          <Input
                            type="number"
                            value={simulationParams[param.value]?.value ?? param.defaultTarget}
                            onChange={(e) => setSimulationParams(prev => ({
                              ...prev,
                              [param.value]: { ...prev[param.value], value: parseFloat(e.target.value) }
                            }))}
                            className="w-24 h-8 text-sm"
                          />
                        </div>
                        <Slider
                          value={[simulationParams[param.value]?.value ?? param.defaultTarget]}
                          onValueChange={([val]) => setSimulationParams(prev => ({
                            ...prev,
                            [param.value]: { ...prev[param.value], value: val }
                          }))}
                          min={param.defaultLSL * 0.5}
                          max={param.defaultUSL * 1.5}
                          step={0.1}
                        />
                      </div>
                    ))}
                  </div>

                  {Object.values(simulationParams).some(p => p?.enabled) && (
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          setAiAnalyzing(true);
                          try {
                            const enabledParams = Object.entries(simulationParams)
                              .filter(([k, v]) => v?.enabled && k !== 'line')
                              .map(([k, v]) => ({ param: k, value: v.value }));

                            const result = await api.integrations.Core.InvokeLLM({
                              prompt: `Simulate process outcome for lamination with these parameters:
${enabledParams.map(p => `- ${p.param}: ${p.value}`).join('\n')}
Line: ${simulationParams.line || 'All'}

Based on lamination process knowledge, predict:
1. Expected quality outcomes (FPY, defect risk)
2. Process stability assessment
3. Recommendations for optimization
4. Parameter interactions`,
                              response_json_schema: {
                                type: "object",
                                properties: {
                                  predictedFPY: { type: "number" },
                                  stabilityScore: { type: "number" },
                                  defectRisks: { type: "array", items: { type: "object", properties: { defect: { type: "string" }, risk: { type: "string" }, probability: { type: "number" } } } },
                                  recommendations: { type: "array", items: { type: "string" } },
                                  parameterInteractions: { type: "array", items: { type: "string" } },
                                  overallAssessment: { type: "string" }
                                }
                              }
                            });
                            setSimulationResult(result);
                          } catch (error) {
                            console.error("Simulation error:", error);
                          }
                          setAiAnalyzing(false);
                        }}
                        disabled={aiAnalyzing}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        {aiAnalyzing ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
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
                  )}

                  {!Object.values(simulationParams).some(p => p?.enabled) && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Select parameters above to enable simulation
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Simulation Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {simulationResult ? (
                    <>
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

                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm">{simulationResult.overallAssessment}</p>
                      </div>

                      {simulationResult.defectRisks?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Defect Risks</h4>
                          <div className="space-y-2">
                            {simulationResult.defectRisks.map((risk, idx) => (
                              <div key={idx} className="p-2 bg-orange-50 rounded border border-orange-200 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{risk.defect}</span>
                                  <Badge className={risk.probability > 20 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                    {risk.probability}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{risk.risk}</p>
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
                              .filter(([k, v]) => v?.enabled)
                              .map(([k, v]) => `${k}: ${v.value}`)
                              .join(', ');
                            const reportText = `SPC SIMULATION REPORT\n${'='.repeat(50)}\nDate: ${new Date().toLocaleString()}\nLine: ${simulationParams.line || 'All'}\n\nPARAMETERS:\n${params}\n\nRESULTS:\nPredicted FPY: ${simulationResult.predictedFPY}%\nStability Score: ${simulationResult.stabilityScore}/100\n\n${simulationResult.overallAssessment}\n\nRECOMMENDATIONS:\n${simulationResult.recommendations?.join('\n')}`;
                            const blob = new Blob([reportText], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `spc-simulation-${new Date().toISOString().split('T')[0]}.txt`;
                            a.click();
                          }}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={async () => {
                            const user = await api.auth.me();
                            saveSPCAnalysisMutation.mutate({
                              analysisDate: new Date().toISOString(),
                              line: selectedLine,
                              productCode: selectedProduct,
                              parameter: selectedParameter,
                              fileName: selectedFile?.fileName,
                              uploadHistoryId: selectedFileId,
                              sampleSize: filteredRuns.length,
                              capabilityMetrics: capability ? {
                                mean: parseFloat(capability.mean),
                                stdDev: parseFloat(capability.stdDev),
                                cp: parseFloat(capability.cp),
                                cpk: parseFloat(capability.cpk),
                                ucl: parseFloat(capability.ucl),
                                lcl: parseFloat(capability.lcl),
                                withinSpec: capability.withinSpec,
                                outOfSpec: capability.outOfSpec
                              } : null,
                              specLimits: { usl: effectiveUSL, lsl: effectiveLSL, target: effectiveTarget },
                              simulationResults: {
                                parameters: simulationParams,
                                predictedFPY: simulationResult.predictedFPY,
                                stabilityScore: simulationResult.stabilityScore,
                                defectRisks: simulationResult.defectRisks,
                                recommendations: simulationResult.recommendations
                              },
                              analysisType: 'simulation',
                              analyst: user.email
                            });
                          }}
                          disabled={saveSPCAnalysisMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Sliders className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select parameters and run simulation</p>
                      <p className="text-sm">to see predicted outcomes</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Analysis Tab - COMPREHENSIVE */}
          <TabsContent value="ai-analysis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI Analysis & Report
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Comprehensive analysis with formatted tables and PDF export
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 mb-3">
                      AI will analyze <strong>{filteredRuns.length}</strong> process runs for parameter <strong>{selectedParameter}</strong> and generate professional report with tables.
                    </p>
                    <Button
                      onClick={async () => {
                        setAiAnalyzing(true);
                        try {
                          const runsToAnalyze = selectedRunIds.length > 0 
                            ? filteredRuns.filter(r => selectedRunIds.includes(r.id))
                            : filteredRuns;

                          const result = await api.integrations.Core.InvokeLLM({
                            prompt: `Perform a professional SPC analysis for lamination process parameter "${selectedParameter}":

PROCESS DATA (${runsToAnalyze.length} runs):
${runsToAnalyze.slice(0, 20).map(r => {
  const val = r[selectedParameter] || r.sensorsRaw?.originalRow?.[selectedParameter];
  return `- ${r.productCode}, Line ${r.line}: ${selectedParameter}=${val}, FPY=${r.qualityMetrics?.firstPassYield || 'N/A'}%`;
}).join('\n')}

CAPABILITY METRICS:
- Parameter: ${selectedParamOption?.label}
- Mean: ${capability?.mean || 'N/A'}
- Std Dev: ${capability?.stdDev || 'N/A'}
- Cp: ${capability?.cp || 'N/A'}
- Cpk: ${capability?.cpk || 'N/A'}
- Spec Limits: LSL=${effectiveLSL}, Target=${effectiveTarget}, USL=${effectiveUSL}

DEFECTS IN PERIOD (${filteredDefects.length}):
${filteredDefects.slice(0, 10).map(d => `- ${d.defectType}: ${d.severity} on ${d.line}`).join('\n')}

Provide:
1. Overall process health assessment
2. Root cause analysis linking capability issues to defects
3. Specific parameter adjustment recommendations with values
4. DoE experiments to run for optimization
5. Predicted impact of improvements
6. Action priority matrix`,
                            response_json_schema: {
                              type: "object",
                              properties: {
                                overallHealth: { type: "string" },
                                healthScore: { type: "number" },
                                rootCauseAnalysis: { type: "array", items: { type: "string" } },
                                defectCorrelations: { 
                                  type: "array", 
                                  items: { 
                                    type: "object", 
                                    properties: { 
                                      defectType: { type: "string" }, 
                                      likelyParameter: { type: "string" },
                                      correlation: { type: "string" }
                                    } 
                                  } 
                                },
                                parameterRecommendations: { 
                                  type: "array", 
                                  items: { 
                                    type: "object", 
                                    properties: { 
                                      parameter: { type: "string" }, 
                                      currentValue: { type: "string" }, 
                                      recommendedValue: { type: "string" }, 
                                      expectedImpact: { type: "string" } 
                                    } 
                                  } 
                                },
                                suggestedExperiments: { 
                                  type: "array", 
                                  items: { 
                                    type: "object", 
                                    properties: { 
                                      objective: { type: "string" }, 
                                      factors: { type: "array", items: { type: "string" } },
                                      expectedBenefit: { type: "string" }
                                    } 
                                  } 
                                },
                                actionPriority: { 
                                  type: "array", 
                                  items: { 
                                    type: "object", 
                                    properties: { 
                                      action: { type: "string" }, 
                                      priority: { type: "string" },
                                      effort: { type: "string" },
                                      impact: { type: "string" }
                                    } 
                                  } 
                                },
                                predictedImprovements: { type: "array", items: { type: "string" } }
                              }
                            }
                          });
                          setAiInsights(result);
                        } catch (error) {
                          console.error("AI analysis error:", error);
                        }
                        setAiAnalyzing(false);
                      }}
                      disabled={aiAnalyzing || filteredRuns.length === 0}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {aiAnalyzing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Run Holistic AI Analysis</>
                      )}
                      </Button>
                      </div>

                      {!selectedFileId && (
                      <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Select a file from "Analysis Configuration" above to enable AI analysis
                      </AlertDescription>
                      </Alert>
                      )}

                      {aiInsights && (
                    <div className="space-y-4">
                      {/* Health Score */}
                      <div className={`p-4 rounded-lg border-2 ${
                        aiInsights.healthScore >= 80 ? 'bg-green-50 border-green-300' :
                        aiInsights.healthScore >= 60 ? 'bg-yellow-50 border-yellow-300' :
                        'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Process Health Score</h4>
                          <Badge className={`text-lg px-3 py-1 ${
                            aiInsights.healthScore >= 80 ? 'bg-green-600' :
                            aiInsights.healthScore >= 60 ? 'bg-yellow-600' :
                            'bg-red-600'
                          } text-white`}>
                            {aiInsights.healthScore}/100
                          </Badge>
                        </div>
                        <p className="text-sm">{aiInsights.overallHealth}</p>
                      </div>

                      {/* Defect Correlations */}
                      {aiInsights.defectCorrelations?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Defect-Parameter Correlations</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {aiInsights.defectCorrelations.map((corr, idx) => (
                                <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-orange-100 text-orange-800">{corr.defectType}</Badge>
                                    <span>→</span>
                                    <Badge variant="outline">{corr.likelyParameter}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-700">{corr.correlation}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Parameter Recommendations */}
                      {aiInsights.parameterRecommendations?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Parameter Recommendations</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {aiInsights.parameterRecommendations.map((rec, idx) => (
                                <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="font-medium">{rec.parameter}</p>
                                  <p className="text-sm text-gray-600">
                                    Current: <Badge variant="outline">{rec.currentValue}</Badge> → 
                                    Recommended: <Badge className="bg-blue-100 text-blue-800 ml-1">{rec.recommendedValue}</Badge>
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">{rec.expectedImpact}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Suggested Experiments */}
                      {aiInsights.suggestedExperiments?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Suggested DoE Experiments</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {aiInsights.suggestedExperiments.map((exp, idx) => (
                                <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <p className="font-medium">{exp.objective}</p>
                                  <p className="text-sm text-gray-600">
                                    Factors: {exp.factors?.join(', ')}
                                  </p>
                                  <p className="text-xs text-purple-700 mt-1">{exp.expectedBenefit}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Action Priority */}
                      {aiInsights.actionPriority?.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Action Priority Matrix</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Action</th>
                                  <th className="text-center py-2">Priority</th>
                                  <th className="text-center py-2">Effort</th>
                                  <th className="text-center py-2">Impact</th>
                                </tr>
                              </thead>
                              <tbody>
                                {aiInsights.actionPriority.map((action, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="py-2">{action.action}</td>
                                    <td className="text-center">
                                      <Badge className={
                                        action.priority === 'high' ? 'bg-red-100 text-red-800' :
                                        action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }>{action.priority}</Badge>
                                    </td>
                                    <td className="text-center">{action.effort}</td>
                                    <td className="text-center">{action.impact}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // COMPREHENSIVE SPC REPORT - ALL 5 SECTIONS
                            let report = `COMPREHENSIVE SPC & CAPABILITY ANALYSIS REPORT\n${'='.repeat(80)}\n\n`;
                            report += `Generated: ${new Date().toLocaleString()}\n`;
                            report += `File: ${selectedFile?.fileName || 'N/A'}\n`;
                            report += `Line: ${selectedLine} | Product: ${selectedProduct}\n`;
                            report += `Parameter: ${selectedParameter}\n`;
                            report += `Sample Size: ${capability?.sampleSize || 0} measurements\n\n`;

                            // SECTION 1: CONTROL CHART DATA
                            report += `${'='.repeat(80)}\nSECTION 1: CONTROL CHART\n${'='.repeat(80)}\n\n`;
                            report += `Chart Type: ${controlChartData.length > 30 ? 'X̄-R (Subgroup Averages)' : 'I-MR (Individual Measurements)'}\n`;
                            report += `Spec Limits: LSL=${effectiveLSL}, Target=${effectiveTarget}, USL=${effectiveUSL}\n\n`;
                            if (capability) {
                              report += `Process Statistics:\n`;
                              report += `  Mean (μ): ${capability.mean}\n`;
                              report += `  Std Dev (σ): ${capability.stdDev}\n`;
                              report += `  UCL: ${capability.ucl}\n`;
                              report += `  LCL: ${capability.lcl}\n\n`;
                            }

                            // SECTION 2: CAPABILITY INDICES
                            report += `${'='.repeat(80)}\nSECTION 2: PROCESS CAPABILITY\n${'='.repeat(80)}\n\n`;
                            if (capability) {
                              report += `Cp (Potential): ${capability.cp} - ${capability.cp >= 1.33 ? 'CAPABLE' : capability.cp >= 1.0 ? 'MARGINAL' : 'NOT CAPABLE'}\n`;
                              report += `Cpk (Actual): ${capability.cpk} - ${capability.cpk >= 1.33 ? 'CAPABLE' : capability.cpk >= 1.0 ? 'MARGINAL' : 'NOT CAPABLE'}\n`;
                              report += `Ppk (Performance): ${capability.ppk}\n\n`;
                              report += `Specification Compliance:\n`;
                              report += `  Within Spec: ${capability.withinSpec} / ${capability.sampleSize} (${((capability.withinSpec / capability.sampleSize) * 100).toFixed(2)}%)\n`;
                              report += `  Out of Spec: ${capability.outOfSpec} / ${capability.sampleSize} (${((capability.outOfSpec / capability.sampleSize) * 100).toFixed(2)}%)\n\n`;
                            }

                            // SECTION 3: DISTRIBUTION ANALYSIS
                            report += `${'='.repeat(80)}\nSECTION 3: DISTRIBUTION ANALYSIS\n${'='.repeat(80)}\n\n`;
                            if (capability) {
                              const centered = Math.abs(parseFloat(capability.mean) - effectiveTarget) / (effectiveUSL - effectiveLSL) < 0.1;
                              report += `Process Centered: ${centered ? 'YES ✓' : 'NO ⚠️'}\n`;
                              report += `  Offset from Target: ${(parseFloat(capability.mean) - effectiveTarget).toFixed(2)}\n`;
                              report += `Process Spread (6σ): ${(6 * parseFloat(capability.stdDev)).toFixed(2)}\n`;
                              report += `Spec Utilization: ${((6 * parseFloat(capability.stdDev)) / (effectiveUSL - effectiveLSL) * 100).toFixed(1)}% of tolerance\n\n`;
                            }

                            // SECTION 4: SIMULATION RESULTS
                            report += `${'='.repeat(80)}\nSECTION 4: SIMULATION RESULTS\n${'='.repeat(80)}\n\n`;
                            if (simulationResult) {
                              report += `Predicted FPY: ${simulationResult.predictedFPY?.toFixed(1)}%\n`;
                              report += `Stability Score: ${simulationResult.stabilityScore}/100\n`;
                              report += `Overall Assessment: ${simulationResult.overallAssessment}\n\n`;
                              if (simulationResult.recommendations?.length > 0) {
                                report += `Recommendations:\n`;
                                simulationResult.recommendations.forEach(r => report += `  • ${r}\n`);
                              }
                            } else {
                              report += `No simulation run for this analysis.\n`;
                            }
                            report += `\n`;

                            // SECTION 5: AI ANALYSIS
                            report += `${'='.repeat(80)}\nSECTION 5: AI COMPREHENSIVE ANALYSIS\n${'='.repeat(80)}\n\n`;
                            if (aiInsights) {
                              report += `Process Health Score: ${aiInsights.healthScore}/100\n`;
                              report += `${aiInsights.overallHealth}\n\n`;
                              
                              if (aiInsights.rootCauseAnalysis?.length > 0) {
                                report += `Root Cause Analysis:\n`;
                                aiInsights.rootCauseAnalysis.forEach(r => report += `  • ${r}\n`);
                                report += `\n`;
                              }
                              
                              if (aiInsights.defectCorrelations?.length > 0) {
                                report += `Defect-Parameter Correlations:\n`;
                                aiInsights.defectCorrelations.forEach(c => report += `  • ${c.defectType} → ${c.likelyParameter}: ${c.correlation}\n`);
                                report += `\n`;
                              }
                              
                              if (aiInsights.parameterRecommendations?.length > 0) {
                                report += `Parameter Recommendations:\n`;
                                aiInsights.parameterRecommendations.forEach(r => 
                                  report += `  • ${r.parameter}: ${r.currentValue} → ${r.recommendedValue} (${r.expectedImpact})\n`
                                );
                                report += `\n`;
                              }
                              
                              if (aiInsights.suggestedExperiments?.length > 0) {
                                report += `Suggested DoE Experiments:\n`;
                                aiInsights.suggestedExperiments.forEach(e => {
                                  report += `  • ${e.objective}\n`;
                                  report += `    Factors: ${e.factors?.join(', ')}\n`;
                                  report += `    Benefit: ${e.expectedBenefit}\n`;
                                });
                                report += `\n`;
                              }
                              
                              if (aiInsights.actionPriority?.length > 0) {
                                report += `Action Priority Matrix:\n`;
                                report += `  ${'Action'.padEnd(40)} Priority   Effort   Impact\n`;
                                report += `  ${'-'.repeat(70)}\n`;
                                aiInsights.actionPriority.forEach(a => {
                                  report += `  ${a.action.padEnd(40)} ${a.priority.padEnd(10)} ${a.effort.padEnd(9)} ${a.impact}\n`;
                                });
                              }
                            } else {
                              report += `No AI analysis run for this dataset.\n`;
                            }

                            report += `\n${'='.repeat(80)}\nEND OF REPORT\n${'='.repeat(80)}\n`;
                            report += `Generated by RCA & CAPA Studio - SPC Module\n`;

                            const blob = new Blob([report], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `spc-comprehensive-report-${selectedFile?.fileName?.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.txt`;
                            a.click();
                          }}
                          disabled={!capability && !aiInsights && !simulationResult}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Full Report (5 Sections)
                        </Button>
                        <Button
                          onClick={async () => {
                            const user = await api.auth.me();
                            saveSPCAnalysisMutation.mutate({
                              analysisDate: new Date().toISOString(),
                              line: selectedLine,
                              productCode: selectedProduct,
                              parameter: selectedParameter,
                              fileName: selectedFile?.fileName,
                              uploadHistoryId: selectedFileId,
                              sampleSize: filteredRuns.length,
                              capabilityMetrics: capability ? {
                                mean: parseFloat(capability.mean),
                                stdDev: parseFloat(capability.stdDev),
                                cp: parseFloat(capability.cp),
                                cpk: parseFloat(capability.cpk),
                                ucl: parseFloat(capability.ucl),
                                lcl: parseFloat(capability.lcl),
                                withinSpec: capability.withinSpec,
                                outOfSpec: capability.outOfSpec
                              } : null,
                              specLimits: { usl: effectiveUSL, lsl: effectiveLSL, target: effectiveTarget },
                              aiInsights: aiInsights,
                              analysisType: 'ai_analysis',
                              analyst: user.email
                            });
                          }}
                          disabled={saveSPCAnalysisMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}