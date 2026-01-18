import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, AlertTriangle, TrendingUp, Clock, Activity, Loader2 
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnomalyDetector({ anomalies, loading, processRuns, defects }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">AI is analyzing process parameters for anomalies...</p>
          <p className="text-sm text-gray-500 mt-2">
            Checking {processRuns.length} process runs and {defects.length} defects
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!anomalies) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Run anomaly detection to find unusual patterns</p>
          <p className="text-sm text-gray-400">
            AI will analyze process parameters for spikes, dips, and abnormal behavior
          </p>
        </CardContent>
      </Card>
    );
  }

  const severityColors = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' }
  };

  const anomalyTypeIcons = {
    spike: TrendingUp,
    dip: TrendingUp,
    drift: Activity,
    instability: Zap
  };

  const totalAnomalies = 
    (anomalies.parameterAnomalies?.length || 0) +
    (anomalies.correlationAnomalies?.length || 0) +
    (anomalies.temporalAnomalies?.length || 0) +
    (anomalies.qualityAnomalies?.length || 0);

  const criticalAnomalies = anomalies.parameterAnomalies?.filter(a => a.severity === 'critical').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      {totalAnomalies > 0 && (
        <Alert className={criticalAnomalies > 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
          <AlertTriangle className={criticalAnomalies > 0 ? "h-5 w-5 text-red-600" : "h-5 w-5 text-blue-600"} />
          <AlertDescription className={criticalAnomalies > 0 ? "text-red-800" : "text-blue-800"}>
            <strong>{totalAnomalies} anomalies detected</strong>
            {criticalAnomalies > 0 && ` - ${criticalAnomalies} require immediate attention`}
          </AlertDescription>
        </Alert>
      )}

      {/* Parameter Anomalies */}
      {anomalies.parameterAnomalies && anomalies.parameterAnomalies.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              Process Parameter Anomalies ({anomalies.parameterAnomalies.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Unusual spikes, dips, or drift in process parameters
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.parameterAnomalies.map((anomaly, idx) => {
                const colors = severityColors[anomaly.severity?.toLowerCase()] || severityColors.low;
                const TypeIcon = anomalyTypeIcons[anomaly.anomalyType] || Zap;
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`w-5 h-5 ${colors.text}`} />
                        <div>
                          <h4 className="font-semibold text-gray-900">{anomaly.parameter}</h4>
                          <p className="text-sm text-gray-600">Line {anomaly.line}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${colors.bg} ${colors.text}`}>
                          {anomaly.severity} - {anomaly.anomalyType}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{anomaly.detectedAt}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mb-3 text-sm">
                      <div className="p-2 bg-white rounded">
                        <p className="text-xs text-gray-600">Actual Value</p>
                        <p className="font-semibold text-gray-900">{anomaly.actualValue}</p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <p className="text-xs text-gray-600">Expected Range</p>
                        <p className="font-semibold text-gray-900">{anomaly.expectedRange}</p>
                      </div>
                      <div className="p-2 bg-white rounded">
                        <p className="text-xs text-gray-600">Deviation</p>
                        <p className={`font-semibold ${colors.text}`}>{anomaly.deviation}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-white rounded border">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Impact:</p>
                        <p className="text-sm text-gray-600">{anomaly.impact}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Suggested Cause:</p>
                        <p className="text-sm text-blue-700">{anomaly.suggestedCause}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-900 mb-1">Recommendation:</p>
                        <p className="text-sm text-green-700">{anomaly.recommendation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Correlation Anomalies */}
      {anomalies.correlationAnomalies && anomalies.correlationAnomalies.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Correlation Anomalies ({anomalies.correlationAnomalies.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Parameters behaving abnormally in relation to each other
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.correlationAnomalies.map((corr, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border-2 border-purple-200">
                  <div className="mb-3">
                    <p className="font-semibold text-gray-900 mb-1">
                      Unusual correlation detected on Line {corr.line}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {corr.parameters?.map((param, pidx) => (
                        <Badge key={pidx} variant="outline" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{corr.description}</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-900">Normal:</p>
                      <p className="text-blue-700">{corr.normalBehavior}</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded text-xs">
                      <p className="font-medium text-orange-900">Observed:</p>
                      <p className="text-orange-700">{corr.observedBehavior}</p>
                    </div>
                  </div>
                  {corr.possibleCauses && corr.possibleCauses.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                      <p className="text-xs font-semibold text-purple-900 mb-1">Possible Causes:</p>
                      <ul className="space-y-1">
                        {corr.possibleCauses.map((cause, cidx) => (
                          <li key={cidx} className="text-sm text-purple-700">• {cause}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temporal Anomalies */}
      {anomalies.temporalAnomalies && anomalies.temporalAnomalies.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Temporal Anomalies ({anomalies.temporalAnomalies.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Time-based patterns and shift-related variations
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.temporalAnomalies.map((temp, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">{temp.pattern}</h4>
                  <p className="text-sm text-gray-700 mb-2">{temp.description}</p>
                  {temp.affectedShifts && temp.affectedShifts.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      <p className="text-xs text-gray-600">Affected Shifts:</p>
                      {temp.affectedShifts.map((shift, sidx) => (
                        <Badge key={sidx} variant="outline" className="text-xs">
                          Shift {shift}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-xs font-medium text-green-900">Recommendation:</p>
                    <p className="text-sm text-green-700">{temp.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Anomalies */}
      {anomalies.qualityAnomalies && anomalies.qualityAnomalies.length > 0 && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Quality Anomalies ({anomalies.qualityAnomalies.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Unexpected quality variations and defect spikes
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.qualityAnomalies.map((qual, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border-2 border-red-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{qual.metric}</h4>
                      <p className="text-sm text-gray-600">Line {qual.line} • {qual.timeframe}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Quality Alert</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{qual.anomalyDescription}</p>
                  <div className="space-y-2">
                    <div className="p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-xs font-medium text-orange-900">Likely Trigger:</p>
                      <p className="text-sm text-orange-700">{qual.likelyTrigger}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs font-medium text-green-900">Corrective Action:</p>
                      <p className="text-sm text-green-700">{qual.correctiveAction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Anomalies Found */}
      {totalAnomalies === 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-900 mb-2">
              No Anomalies Detected
            </h3>
            <p className="text-gray-600">
              Process parameters are within normal ranges. System is operating as expected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}