import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, Sparkles, Loader2, Download, CheckCircle2, 
  Target, Shield, Eye, Zap, TrendingDown
} from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function FMEAAssessment({ capa, defect, rca, onUpdate }) {
  const [fmea, setFMEA] = useState(capa.fmea || {
    severity: 5,
    occurrence: 5,
    detection: 5,
    rpn: 125,
    notes: '',
    failureModes: [],
    controls: [],
    aiAnalysis: null
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isClosed = capa.approvalState === 'closed';

  useEffect(() => {
    if (capa.fmea) {
      setFMEA(capa.fmea);
    }
  }, [capa.id, capa.fmea]);

  const calculateRPN = (s, o, d) => s * o * d;

  const updateValue = (field, value) => {
    const numValue = Math.min(10, Math.max(1, parseInt(value) || 1));
    const updated = { ...fmea, [field]: numValue };
    
    if (field === 'severity' || field === 'occurrence' || field === 'detection') {
      updated.rpn = calculateRPN(
        field === 'severity' ? numValue : fmea.severity,
        field === 'occurrence' ? numValue : fmea.occurrence,
        field === 'detection' ? numValue : fmea.detection
      );
    }
    
    setFMEA(updated);
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an FMEA expert analyzing a manufacturing defect for a lamination/film production process.

DEFECT CONTEXT:
- Type: ${defect?.defectType?.replace(/_/g, ' ') || 'Unknown'}
- Severity: ${defect?.severity || 'Unknown'}
- Line: ${defect?.line || 'Unknown'}
- Product: ${defect?.productCode || 'Unknown'}

ROOT CAUSE ANALYSIS:
${JSON.stringify(rca?.rootCauses || [], null, 2)}

CURRENT CAPA ACTIONS:
Corrective: ${capa.correctiveActions?.map(a => a.action).join('; ') || 'None'}
Preventive: ${capa.preventiveActions?.map(a => a.action).join('; ') || 'None'}

Perform a detailed FMEA analysis:
1. Identify potential failure modes related to this defect
2. Assess severity, occurrence, and detection scores with justification
3. Identify current controls and their effectiveness
4. Recommend additional controls to reduce RPN
5. Provide before/after RPN projection`,
        response_json_schema: {
          type: "object",
          properties: {
            failureModes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mode: { type: "string" },
                  effect: { type: "string" },
                  cause: { type: "string" },
                  severity: { type: "number" },
                  occurrence: { type: "number" },
                  detection: { type: "number" },
                  rpn: { type: "number" }
                }
              }
            },
            recommendedSeverity: { type: "number" },
            severityJustification: { type: "string" },
            recommendedOccurrence: { type: "number" },
            occurrenceJustification: { type: "string" },
            recommendedDetection: { type: "number" },
            detectionJustification: { type: "string" },
            currentControls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  control: { type: "string" },
                  type: { type: "string" },
                  effectiveness: { type: "string" }
                }
              }
            },
            recommendedControls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  control: { type: "string" },
                  type: { type: "string" },
                  expectedImpact: { type: "string" },
                  rpnReduction: { type: "number" }
                }
              }
            },
            projectedRPNAfterActions: { type: "number" },
            riskMitigation: { type: "string" },
            overallAssessment: { type: "string" }
          }
        }
      });

      const updatedFMEA = {
        ...fmea,
        severity: result.recommendedSeverity || fmea.severity,
        occurrence: result.recommendedOccurrence || fmea.occurrence,
        detection: result.recommendedDetection || fmea.detection,
        rpn: (result.recommendedSeverity || fmea.severity) * 
             (result.recommendedOccurrence || fmea.occurrence) * 
             (result.recommendedDetection || fmea.detection),
        failureModes: result.failureModes || [],
        controls: result.currentControls || [],
        recommendedControls: result.recommendedControls || [],
        aiAnalysis: {
          ...result,
          generatedAt: new Date().toISOString()
        }
      };

      setFMEA(updatedFMEA);
    } catch (error) {
      console.error("FMEA AI analysis error:", error);
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdate({ fmea });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    setSaving(false);
  };

  const downloadFMEA = () => {
    const fmeaReport = {
      reportTitle: "FMEA Risk Assessment Report",
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + " IST",
      capaId: capa.id,
      defect: {
        type: defect?.defectType?.replace(/_/g, ' '),
        severity: defect?.severity,
        line: defect?.line,
        product: defect?.productCode
      },
      riskAssessment: {
        severity: { score: fmea.severity, justification: fmea.aiAnalysis?.severityJustification },
        occurrence: { score: fmea.occurrence, justification: fmea.aiAnalysis?.occurrenceJustification },
        detection: { score: fmea.detection, justification: fmea.aiAnalysis?.detectionJustification },
        rpn: fmea.rpn,
        riskLevel: getRPNLevel(fmea.rpn)
      },
      failureModes: fmea.failureModes || [],
      currentControls: fmea.controls || [],
      recommendedControls: fmea.recommendedControls || [],
      projectedRPNAfterActions: fmea.aiAnalysis?.projectedRPNAfterActions,
      overallAssessment: fmea.aiAnalysis?.overallAssessment,
      notes: fmea.notes
    };

    const blob = new Blob([JSON.stringify(fmeaReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FMEA_Report_${capa.id?.slice(0, 8) || 'draft'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRPNColor = (rpn) => {
    if (rpn >= 200) return 'bg-red-100 text-red-800 border-red-300';
    if (rpn >= 100) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRPNLevel = (rpn) => {
    if (rpn >= 200) return 'High Risk';
    if (rpn >= 100) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            FMEA Risk Assessment
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={runAIAnalysis}
              disabled={analyzing || isClosed}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI Analysis
                </>
              )}
            </Button>
            <Button
              onClick={downloadFMEA}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Failure Mode and Effects Analysis - Assess severity, occurrence, and detection
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              FMEA assessment saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Score Inputs with Justifications */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-red-600" />
              <Label className="font-semibold text-red-900">Severity (1-10)</Label>
            </div>
            <Input
              type="number"
              min="1"
              max="10"
              value={fmea.severity}
              onChange={(e) => updateValue('severity', e.target.value)}
              className="mb-2"
              disabled={isClosed}
            />
            <p className="text-xs text-red-700">Impact of failure on customer/process</p>
            {fmea.aiAnalysis?.severityJustification && (
              <p className="text-xs text-red-600 mt-2 p-2 bg-white rounded">
                <strong>AI:</strong> {fmea.aiAnalysis.severityJustification}
              </p>
            )}
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <Label className="font-semibold text-yellow-900">Occurrence (1-10)</Label>
            </div>
            <Input
              type="number"
              min="1"
              max="10"
              value={fmea.occurrence}
              onChange={(e) => updateValue('occurrence', e.target.value)}
              className="mb-2"
              disabled={isClosed}
            />
            <p className="text-xs text-yellow-700">Frequency of cause occurrence</p>
            {fmea.aiAnalysis?.occurrenceJustification && (
              <p className="text-xs text-yellow-600 mt-2 p-2 bg-white rounded">
                <strong>AI:</strong> {fmea.aiAnalysis.occurrenceJustification}
              </p>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <Label className="font-semibold text-blue-900">Detection (1-10)</Label>
            </div>
            <Input
              type="number"
              min="1"
              max="10"
              value={fmea.detection}
              onChange={(e) => updateValue('detection', e.target.value)}
              className="mb-2"
              disabled={isClosed}
            />
            <p className="text-xs text-blue-700">Ability to detect before reaching customer</p>
            {fmea.aiAnalysis?.detectionJustification && (
              <p className="text-xs text-blue-600 mt-2 p-2 bg-white rounded">
                <strong>AI:</strong> {fmea.aiAnalysis.detectionJustification}
              </p>
            )}
          </div>
        </div>

        {/* RPN Display */}
        <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-lg font-semibold text-gray-900">Risk Priority Number (RPN)</span>
              <p className="text-sm text-gray-600">RPN = Severity × Occurrence × Detection</p>
            </div>
            <div className="text-right">
              <Badge className={`${getRPNColor(fmea.rpn)} text-2xl px-4 py-2`}>
                {fmea.rpn}
              </Badge>
              <p className="text-sm mt-1">
                <Badge className={getRPNColor(fmea.rpn)}>{getRPNLevel(fmea.rpn)}</Badge>
              </p>
            </div>
          </div>

          {fmea.aiAnalysis?.projectedRPNAfterActions && (
            <div className="mt-4 p-3 bg-white rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Projected RPN After CAPA:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 line-through">{fmea.rpn}</span>
                <span className="text-xl font-bold text-green-600">
                  {fmea.aiAnalysis.projectedRPNAfterActions}
                </span>
                <Badge className="bg-green-100 text-green-800">
                  -{Math.round(((fmea.rpn - fmea.aiAnalysis.projectedRPNAfterActions) / fmea.rpn) * 100)}%
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Failure Modes Table */}
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Identified Failure Modes
                </h4>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        // Add a new empty failure mode
                        const newMode = {
                            mode: "New Failure Mode",
                            effect: "",
                            cause: "",
                            severity: 5,
                            occurrence: 5,
                            detection: 5,
                            rpn: 125
                        };
                        setFMEA({
                            ...fmea,
                            failureModes: [...(fmea.failureModes || []), newMode]
                        });
                    }}
                    disabled={isClosed}
                >
                    + Add Manual Mode
                </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left border-b">Failure Mode</th>
                    <th className="p-2 text-left border-b">Effect</th>
                    <th className="p-2 text-left border-b">Cause</th>
                    <th className="p-2 text-center border-b w-16">S</th>
                    <th className="p-2 text-center border-b w-16">O</th>
                    <th className="p-2 text-center border-b w-16">D</th>
                    <th className="p-2 text-center border-b w-20">RPN</th>
                    <th className="p-2 text-center border-b w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(fmea.failureModes || []).map((fm, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                          <Input 
                              value={fm.mode} 
                              onChange={(e) => {
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].mode = e.target.value;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2">
                          <Input 
                              value={fm.effect} 
                              onChange={(e) => {
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].effect = e.target.value;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2">
                          <Input 
                              value={fm.cause} 
                              onChange={(e) => {
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].cause = e.target.value;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2 text-center">
                          <Input 
                              type="number" 
                              min="1" max="10"
                              value={fm.severity} 
                              onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].severity = val;
                                  newModes[idx].rpn = val * newModes[idx].occurrence * newModes[idx].detection;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs w-14 mx-auto text-center"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2 text-center">
                          <Input 
                              type="number" 
                              min="1" max="10"
                              value={fm.occurrence} 
                              onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].occurrence = val;
                                  newModes[idx].rpn = newModes[idx].severity * val * newModes[idx].detection;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs w-14 mx-auto text-center"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2 text-center">
                          <Input 
                              type="number" 
                              min="1" max="10"
                              value={fm.detection} 
                              onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  const newModes = [...fmea.failureModes];
                                  newModes[idx].detection = val;
                                  newModes[idx].rpn = newModes[idx].severity * newModes[idx].occurrence * val;
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              className="h-8 text-xs w-14 mx-auto text-center"
                              disabled={isClosed}
                          />
                      </td>
                      <td className="p-2 text-center">
                        <Badge className={getRPNColor(fm.rpn)}>{fm.rpn}</Badge>
                      </td>
                      <td className="p-2 text-center">
                          <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                  const newModes = fmea.failureModes.filter((_, i) => i !== idx);
                                  setFMEA({...fmea, failureModes: newModes});
                              }}
                              disabled={isClosed}
                          >
                              ×
                          </Button>
                      </td>
                    </tr>
                  ))}
                  {(fmea.failureModes || []).length === 0 && (
                      <tr>
                          <td colSpan="8" className="p-4 text-center text-gray-500 text-xs">
                              No failure modes identified. Click "AI Analysis" or "Add Manual Mode".
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Current Controls */}
        {fmea.controls && fmea.controls.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Current Controls
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {fmea.controls.map((ctrl, idx) => (
                <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900">{ctrl.control}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{ctrl.type}</Badge>
                    <Badge className={
                      ctrl.effectiveness === 'High' ? 'bg-green-100 text-green-800' :
                      ctrl.effectiveness === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>{ctrl.effectiveness}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Controls */}
        {fmea.recommendedControls && fmea.recommendedControls.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI Recommended Controls
            </h4>
            <div className="space-y-3">
              {fmea.recommendedControls.map((ctrl, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-purple-900">{ctrl.control}</p>
                      <p className="text-sm text-purple-700 mt-1">{ctrl.expectedImpact}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      RPN -{ctrl.rpnReduction}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">{ctrl.type}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Assessment */}
        {fmea.aiAnalysis?.overallAssessment && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">AI Overall Assessment</h4>
            <p className="text-sm text-purple-800">{fmea.aiAnalysis.overallAssessment}</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label>Additional FMEA Notes</Label>
          <Textarea
            value={fmea.notes || ''}
            onChange={(e) => setFMEA({ ...fmea, notes: e.target.value })}
            placeholder="Additional risk assessment notes, observations, or action items..."
            rows={3}
            className="mt-1"
            disabled={isClosed}
          />
        </div>

        {/* Guidelines */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">FMEA Guidelines:</p>
          <div className="grid md:grid-cols-3 gap-4 text-xs text-blue-800">
            <div>
              <p className="font-medium">Severity (S)</p>
              <ul className="mt-1 space-y-0.5">
                <li>10: Hazardous without warning</li>
                <li>7-9: Very high impact</li>
                <li>4-6: Moderate impact</li>
                <li>1-3: Minor/negligible</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Occurrence (O)</p>
              <ul className="mt-1 space-y-0.5">
                <li>10: Very high (&gt;1 in 2)</li>
                <li>7-9: High (1 in 20)</li>
                <li>4-6: Moderate (1 in 400)</li>
                <li>1-3: Low (&lt;1 in 10000)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Detection (D)</p>
              <ul className="mt-1 space-y-0.5">
                <li>10: Almost impossible</li>
                <li>7-9: Remote/very remote</li>
                <li>4-6: Moderate chance</li>
                <li>1-3: Almost certain</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="font-medium">RPN Thresholds:</p>
            <ul className="mt-1 space-y-0.5">
              <li>• RPN ≥ 200: <span className="text-red-700 font-medium">High priority - immediate action required</span></li>
              <li>• RPN 100-199: <span className="text-orange-700 font-medium">Medium priority - plan corrective actions</span></li>
              <li>• RPN &lt; 100: <span className="text-green-700 font-medium">Low priority - monitor and document</span></li>
            </ul>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={saving || isClosed}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save FMEA Assessment
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}