import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle2,
  Target, Clock, Zap, BarChart3, Lightbulb, ArrowRight
} from "lucide-react";

export default function CAPAEffectivenessPrediction({ capa, defect, rca, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(capa.effectivenessPrediction || null);

  const runPrediction = async () => {
    setAnalyzing(true);
    try {
      // Fetch historical data for AI context
      const [allCAPAs, allDefects, spcAnalyses, doeAnalyses] = await Promise.all([
        base44.entities.CAPAPlan.list("-created_date", 100),
        base44.entities.DefectTicket.list("-created_date", 200),
        base44.entities.SPCAnalysis.list("-analysisDate", 50),
        base44.entities.DoEAnalysis.list("-analysisDate", 30)
      ]);

      // Calculate historical effectiveness
      const closedCAPAs = allCAPAs.filter(c => c.approvalState === 'closed');
      const similarDefects = allDefects.filter(d => 
        d.defectType === defect?.defectType && d.id !== defect?.id
      );
      
      // Check if similar defects recurred after previous CAPAs
      const relatedCAPAs = closedCAPAs.filter(c => {
        const capaDefect = allDefects.find(d => d.id === c.defectTicketId);
        return capaDefect?.defectType === defect?.defectType;
      });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI quality expert predicting the effectiveness of proposed CAPA actions.

CURRENT CAPA PLAN:
${JSON.stringify({
  correctiveActions: capa.correctiveActions?.map(a => ({
    action: a.action,
    complexity: a.complexity,
    ownerRole: a.ownerRole,
    verificationMethod: a.verificationMethod
  })),
  preventiveActions: capa.preventiveActions?.map(a => ({
    action: a.action,
    complexity: a.complexity,
    systemImpact: a.systemImpact,
    trainingRequired: a.trainingRequired
  })),
  fmea: capa.fmea,
  implementationStrategy: capa.implementationStrategy
}, null, 2)}

DEFECT CONTEXT:
- Type: ${defect?.defectType?.replace(/_/g, ' ')}
- Severity: ${defect?.severity}
- Line: ${defect?.line}
- Product: ${defect?.productCode}

ROOT CAUSE ANALYSIS:
${JSON.stringify({
  rootCauses: rca?.rootCauses,
  validatedHypotheses: rca?.hypothesisList?.filter(h => h.validated)
}, null, 2)}

HISTORICAL CONTEXT:
- Similar defects in past: ${similarDefects.length}
- Related CAPAs previously closed: ${relatedCAPAs.length}
- SPC analyses available: ${spcAnalyses.length}
- DoE experiments completed: ${doeAnalyses.filter(d => d.experimentResult === 'pass').length} passed

Analyze each action and predict:
1. Individual action effectiveness scores (0-100)
2. Overall CAPA success probability
3. Risk factors that could reduce effectiveness
4. Optimal implementation sequence
5. Resource optimization recommendations
6. Timeline optimization suggestions
7. Specific improvements for weak actions`,
        response_json_schema: {
          type: "object",
          properties: {
            overallSuccessProbability: { type: "number", minimum: 0, maximum: 100 },
            confidenceLevel: { type: "string", enum: ["high", "medium", "low"] },
            correctiveActionScores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  actionIndex: { type: "number" },
                  effectivenessScore: { type: "number" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } }
                }
              }
            },
            preventiveActionScores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  actionIndex: { type: "number" },
                  effectivenessScore: { type: "number" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } }
                }
              }
            },
            riskFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  likelihood: { type: "string" },
                  mitigation: { type: "string" }
                }
              }
            },
            optimalSequence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phase: { type: "number" },
                  actions: { type: "array", items: { type: "string" } },
                  duration: { type: "string" },
                  dependencies: { type: "array", items: { type: "string" } }
                }
              }
            },
            resourceOptimization: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  impact: { type: "string" },
                  effort: { type: "string" }
                }
              }
            },
            timelineOptimization: {
              type: "object",
              properties: {
                currentEstimate: { type: "string" },
                optimizedEstimate: { type: "string" },
                suggestions: { type: "array", items: { type: "string" } }
              }
            },
            overallAssessment: { type: "string" },
            keyRecommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setPrediction(result);
      
      // Save prediction to CAPA
      if (onUpdate) {
        onUpdate({
          effectivenessPrediction: {
            ...result,
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error("Prediction error:", error);
    }
    setAnalyzing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            AI Effectiveness Prediction
          </CardTitle>
          <Button
            onClick={runPrediction}
            disabled={analyzing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {prediction ? 'Re-analyze' : 'Predict Effectiveness'}
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          AI analyzes historical data and action quality to predict CAPA success
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {prediction ? (
          <>
            {/* Overall Score */}
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-purple-900">Overall Success Probability</h4>
                <Badge className={
                  prediction.confidenceLevel === 'high' ? 'bg-green-100 text-green-800' :
                  prediction.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {prediction.confidenceLevel} confidence
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${getScoreColor(prediction.overallSuccessProbability)}`}>
                  {prediction.overallSuccessProbability}%
                </div>
                <Progress 
                  value={prediction.overallSuccessProbability} 
                  className="flex-1 h-3"
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">{prediction.overallAssessment}</p>
            </div>

            {/* Action Scores */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Corrective Actions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Corrective Action Scores
                </h4>
                {prediction.correctiveActionScores?.map((score, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${getScoreBg(score.effectivenessScore)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CA {score.actionIndex + 1}</span>
                      <Badge className={getScoreBg(score.effectivenessScore)}>
                        {score.effectivenessScore}%
                      </Badge>
                    </div>
                    {score.strengths?.length > 0 && (
                      <div className="text-xs text-green-700 mb-1">
                        ✓ {score.strengths[0]}
                      </div>
                    )}
                    {score.weaknesses?.length > 0 && (
                      <div className="text-xs text-red-700 mb-1">
                        ⚠ {score.weaknesses[0]}
                      </div>
                    )}
                    {score.improvements?.length > 0 && (
                      <div className="text-xs text-blue-700">
                        💡 {score.improvements[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Preventive Actions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Preventive Action Scores
                </h4>
                {prediction.preventiveActionScores?.map((score, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${getScoreBg(score.effectivenessScore)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">PA {score.actionIndex + 1}</span>
                      <Badge className={getScoreBg(score.effectivenessScore)}>
                        {score.effectivenessScore}%
                      </Badge>
                    </div>
                    {score.strengths?.length > 0 && (
                      <div className="text-xs text-green-700 mb-1">
                        ✓ {score.strengths[0]}
                      </div>
                    )}
                    {score.weaknesses?.length > 0 && (
                      <div className="text-xs text-red-700 mb-1">
                        ⚠ {score.weaknesses[0]}
                      </div>
                    )}
                    {score.improvements?.length > 0 && (
                      <div className="text-xs text-blue-700">
                        💡 {score.improvements[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            {prediction.riskFactors?.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Factors
                </h4>
                <div className="space-y-2">
                  {prediction.riskFactors.map((risk, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-red-100">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-red-900">{risk.risk}</p>
                        <Badge variant="outline" className="text-xs">
                          {risk.likelihood}
                        </Badge>
                      </div>
                      <p className="text-xs text-red-700 mt-1">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimal Implementation Sequence */}
            {prediction.optimalSequence?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Optimal Implementation Sequence
                </h4>
                <div className="flex flex-wrap gap-2 items-center">
                  {prediction.optimalSequence.map((phase, idx) => (
                    <React.Fragment key={idx}>
                      <div className="p-3 bg-white rounded-lg border border-blue-200 min-w-[150px]">
                        <p className="text-xs font-medium text-blue-900">Phase {phase.phase}</p>
                        <p className="text-sm font-semibold">{phase.duration}</p>
                        <ul className="text-xs text-gray-600 mt-1">
                          {phase.actions?.slice(0, 2).map((a, i) => (
                            <li key={i}>• {a}</li>
                          ))}
                        </ul>
                      </div>
                      {idx < prediction.optimalSequence.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Optimization */}
            {prediction.timelineOptimization && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline Optimization
                </h4>
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  <div className="p-3 bg-white rounded border">
                    <p className="text-xs text-gray-600">Current Estimate</p>
                    <p className="text-lg font-bold text-gray-900">
                      {prediction.timelineOptimization.currentEstimate}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-green-300">
                    <p className="text-xs text-green-600">Optimized Estimate</p>
                    <p className="text-lg font-bold text-green-700">
                      {prediction.timelineOptimization.optimizedEstimate}
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-green-800 space-y-1">
                  {prediction.timelineOptimization.suggestions?.map((s, idx) => (
                    <li key={idx}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Recommendations */}
            {prediction.keyRecommendations?.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Key Recommendations
                </h4>
                <ul className="space-y-2">
                  {prediction.keyRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-purple-800">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Prediction generated: {new Date(prediction.generatedAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </p>
          </>
        ) : (
          <div className="text-center py-8">
            <Target className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No prediction yet</p>
            <p className="text-sm text-gray-500">
              Click "Predict Effectiveness" to analyze your CAPA actions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}