import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, AlertTriangle, CheckCircle2, X, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ParameterInsights({ uploadSummary, analysis }) {
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [showSelector, setShowSelector] = useState(true);

  // Load saved parameters on mount
  useEffect(() => {
    const saved = localStorage.getItem('parameterInsights_selected');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedParameters(parsed);
      } catch (e) {}
    }
  }, []);

  // Save selected parameters
  useEffect(() => {
    if (selectedParameters.length > 0) {
      localStorage.setItem('parameterInsights_selected', JSON.stringify(selectedParameters));
    }
  }, [selectedParameters]);

  if (!analysis || !uploadSummary) return null;

  const numericColumns = analysis.numericColumns || [];
  
  const toggleParameter = (param) => {
    setSelectedParameters(prev => {
      if (prev.includes(param)) {
        return prev.filter(p => p !== param);
      } else if (prev.length < 10) {
        return [...prev, param];
      }
      return prev;
    });
  };

  // Find parameter-specific data from uploadSummary
  const getParameterInsights = (param) => {
    const correlations = analysis.correlations?.filter(c => c.col1 === param || c.col2 === param) || [];
    const anomalies = uploadSummary.anomaliesDetected?.filter(a => 
      a.toLowerCase().includes(param.toLowerCase())
    ) || [];
    const actions = [
      ...(uploadSummary.actionableInsights?.immediateActions || []),
      ...(uploadSummary.actionableInsights?.qualityMonitoring || []),
      ...(uploadSummary.actionableInsights?.processOptimization || [])
    ].filter(a => a.toLowerCase().includes(param.toLowerCase()));

    return { correlations, anomalies, actions };
  };

  const downloadReport = () => {
    let reportText = `MULTI-PARAMETER ANALYSIS REPORT\n${'='.repeat(80)}\n`;
    reportText += `Generated: ${new Date().toLocaleString()}\n`;
    reportText += `Parameters Analyzed: ${selectedParameters.join(', ')}\n\n`;

    selectedParameters.forEach(param => {
      const insights = getParameterInsights(param);
      const stats = analysis.statistics?.[param];
      
      reportText += `\n${'='.repeat(80)}\nPARAMETER: ${param}\n${'='.repeat(80)}\n\n`;

      if (stats) {
        reportText += `STATISTICS:\n`;
        reportText += `  Count: ${stats.count}\n`;
        reportText += `  Mean: ${stats.mean}\n`;
        reportText += `  Std Dev: ${stats.stdDev}\n`;
        reportText += `  Min: ${stats.min}\n`;
        reportText += `  Median: ${stats.median}\n`;
        reportText += `  Max: ${stats.max}\n\n`;
      }

      if (insights.correlations.length > 0) {
        reportText += `CORRELATIONS:\n`;
        insights.correlations.forEach(c => {
          reportText += `  ${c.col1} ↔ ${c.col2}: r=${c.correlation} (${c.strength})\n`;
        });
        reportText += `\n`;
      }

      if (insights.anomalies.length > 0) {
        reportText += `ANOMALIES:\n`;
        insights.anomalies.forEach(a => reportText += `  • ${a}\n`);
        reportText += `\n`;
      }

      if (insights.actions.length > 0) {
        reportText += `RECOMMENDED ACTIONS:\n`;
        insights.actions.forEach(a => reportText += `  • ${a}\n`);
        reportText += `\n`;
      }
    });

    // Add correlation matrix
    if (analysis.correlationMatrix && selectedParameters.length > 1) {
      reportText += `\n${'='.repeat(80)}\nCORRELATION MATRIX\n${'='.repeat(80)}\n\n`;
      reportText += `           `;
      selectedParameters.forEach(p => reportText += `${p.substring(0, 10).padEnd(12)} `);
      reportText += `\n`;
      selectedParameters.forEach(pY => {
        reportText += `${pY.substring(0, 10).padEnd(12)} `;
        selectedParameters.forEach(pX => {
          const val = analysis.correlationMatrix[pY]?.[pX];
          reportText += `${val !== undefined ? val.toFixed(2).padEnd(12) : 'N/A'.padEnd(12)} `;
        });
        reportText += `\n`;
      });
    }

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parameter-analysis-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🎯 Multi-Parameter Analysis
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Select up to 10 parameters to analyze ({selectedParameters.length}/10 selected)
            </p>
          </div>
          {selectedParameters.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-1" />
                Download Report
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedParameters([])}>
                Clear All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parameter Selector */}
        <div className="p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Available Parameters ({numericColumns.length})</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSelector(!showSelector)}
            >
              {showSelector ? 'Hide' : 'Show'} Selector
            </Button>
          </div>
          
          {showSelector && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {numericColumns.map((col) => (
                <div 
                  key={col}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                    selectedParameters.includes(col) 
                      ? 'bg-blue-50 border-blue-400' 
                      : 'hover:bg-gray-50 border-gray-200'
                  } ${selectedParameters.length >= 10 && !selectedParameters.includes(col) ? 'opacity-50' : ''}`}
                  onClick={() => toggleParameter(col)}
                >
                  <Checkbox
                    checked={selectedParameters.includes(col)}
                    onCheckedChange={() => toggleParameter(col)}
                    disabled={selectedParameters.length >= 10 && !selectedParameters.includes(col)}
                  />
                  <label className="text-sm cursor-pointer flex-1">{col}</label>
                </div>
              ))}
            </div>
          )}
          {selectedParameters.length >= 10 && (
            <p className="text-xs text-orange-600 mt-2">Maximum 10 parameters selected</p>
          )}
        </div>

        {/* Selected Parameters Display */}
        {selectedParameters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedParameters.map(param => (
              <Badge key={param} className="bg-blue-600 text-white flex items-center gap-1 px-3 py-1">
                {param}
                <X 
                  className="w-3 h-3 cursor-pointer hover:bg-blue-700 rounded" 
                  onClick={() => toggleParameter(param)}
                />
              </Badge>
            ))}
          </div>
        )}

        {selectedParameters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Select parameters above to see detailed insights</p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedParameters.map(param => {
              const insights = getParameterInsights(param);
              const stats = analysis.statistics?.[param];
              
              return (
                <div key={param} className="p-4 bg-white rounded-lg border-2 border-indigo-300">
                  <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    📊 {param}
                    <Badge variant="outline" className="text-xs">
                      {stats?.count || 0} values
                    </Badge>
                  </h4>

                  {/* Statistics */}
                  {stats && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Statistics:</p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Mean</p>
                          <p className="font-bold">{stats.mean}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Std Dev</p>
                          <p className="font-bold">{stats.stdDev}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Min</p>
                          <p className="font-bold">{stats.min}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Median</p>
                          <p className="font-bold">{stats.median}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Max</p>
                          <p className="font-bold">{stats.max}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-gray-600">Count</p>
                          <p className="font-bold">{stats.count}</p>
                        </div>
                      </div>
                    </div>
                  )}



                  {/* Anomalies */}
                  {insights.anomalies.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-orange-600" />
                        Anomalies Detected:
                      </p>
                      <ul className="space-y-1">
                        {insights.anomalies.map((anomaly, idx) => (
                          <li key={idx} className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                            • {anomaly}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  {insights.actions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        Recommended Actions:
                      </p>
                      <ul className="space-y-1">
                        {insights.actions.map((action, idx) => (
                          <li key={idx} className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                            • {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!insights.correlations.length && !insights.anomalies.length && !insights.actions.length && (
                    <p className="text-xs text-gray-500 italic">No specific insights found for this parameter.</p>
                  )}
                </div>
              );
            })}

            {/* Correlation Matrix for selected parameters */}
            {selectedParameters.length > 1 && analysis.correlationMatrix && (() => {
              // Detect multicollinear clusters
              const clusters = [];
              for (let i = 0; i < selectedParameters.length; i++) {
                for (let j = i + 1; j < selectedParameters.length; j++) {
                  for (let k = j + 1; k < selectedParameters.length; k++) {
                    const p1 = selectedParameters[i];
                    const p2 = selectedParameters[j];
                    const p3 = selectedParameters[k];
                    const r12 = Math.abs(analysis.correlationMatrix[p1]?.[p2] || 0);
                    const r13 = Math.abs(analysis.correlationMatrix[p1]?.[p3] || 0);
                    const r23 = Math.abs(analysis.correlationMatrix[p2]?.[p3] || 0);
                    
                    if (r12 >= 0.8 && r13 >= 0.8 && r23 >= 0.8) {
                      const clusterKey = [p1, p2, p3].sort().join('-');
                      if (!clusters.some(c => c.key === clusterKey)) {
                        clusters.push({ key: clusterKey, params: [p1, p2, p3] });
                      }
                    }
                  }
                }
              }
              
              return (
                <div className="p-4 bg-white rounded-lg border-2 border-purple-300">
                  <p className="text-sm font-semibold text-purple-900 mb-3">
                    🔥 Correlation Matrix for Selected Parameters
                  </p>
                  
                  {clusters.length > 0 && (
                    <Alert className="mb-4 bg-red-50 border-red-300">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>⚠️ Multicollinearity Detected!</strong>
                        <div className="mt-2 space-y-1">
                          {clusters.map((cluster, idx) => (
                            <div key={idx} className="text-xs">
                              Cluster {idx + 1}: {cluster.params.join(', ')} (all |r| ≥ 0.8)
                            </div>
                          ))}
                        </div>
                        <p className="text-xs mt-2">These parameters are highly correlated and may cause redundancy in models.</p>
                      </AlertDescription>
                    </Alert>
                  )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border bg-gray-50 sticky left-0 z-10 w-[140px] text-left font-semibold text-[10px]"></th>
                        {selectedParameters.map((p, idx) => (
                          <th key={idx} className="p-2 border bg-gray-50 w-[100px]">
                            <div className="font-semibold text-gray-700 text-[10px] leading-tight break-words hyphens-auto" style={{wordBreak: 'break-word'}}>
                              {p}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedParameters.map((pY, idxY) => (
                        <tr key={idxY}>
                          <td className="p-2 border bg-gray-50 font-semibold text-left sticky left-0 z-10 text-[10px] leading-tight" style={{wordBreak: 'break-word'}}>
                            {pY}
                          </td>
                          {selectedParameters.map((pX, idxX) => {
                            const value = analysis.correlationMatrix[pY]?.[pX];
                            const absValue = Math.abs(value || 0);
                            const bgColor = 
                              absValue > 0.8 ? (value > 0 ? 'bg-green-600' : 'bg-red-600') :
                              absValue > 0.6 ? (value > 0 ? 'bg-green-500' : 'bg-red-500') :
                              absValue > 0.4 ? (value > 0 ? 'bg-green-400' : 'bg-red-400') :
                              absValue > 0.2 ? (value > 0 ? 'bg-green-300' : 'bg-red-300') :
                              'bg-gray-200';
                            const textColor = absValue > 0.5 ? 'text-white' : 'text-gray-900';
                            return (
                              <td
                                key={idxX}
                                className={`p-3 border text-center font-bold ${bgColor} ${textColor}`}
                                title={`${pY} vs ${pX}: ${value !== null && value !== undefined ? value.toFixed(3) : 'N/A'}`}
                              >
                                {value !== null && value !== undefined ? value.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 items-center text-xs mt-3">
                  <span className="font-medium">Legend:</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span>Strong +</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>Strong -</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span>Weak</span>
                  </div>
                </div>
              </div>
            );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}