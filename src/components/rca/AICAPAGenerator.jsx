import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, Calendar, User, ArrowRight } from "lucide-react";
import { api } from '@/api/apiClient';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AICAPAGenerator({ rca, defect, onCAPACreated }) {
  const [generating, setGenerating] = useState(false);
  const [generatedCAPA, setGeneratedCAPA] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleGenerateCAPA = async () => {
    setGenerating(true);

    try {
      // Get knowledge documents for context
      const knowledgeDocs = await api.entities.KnowledgeDocument.filter({ status: "active" }, "-created_date", 50);
      
      const relevantDocsContext = knowledgeDocs
        .filter(doc => 
          doc.defectTypes?.includes(defect?.defectType) ||
          doc.keywords?.some(kw => 
            defect?.defectType?.includes(kw.toLowerCase()) ||
            rca.rootCauses?.some(rc => {
              const causeText = typeof rc === 'object' ? rc.cause : rc;
              return causeText?.toLowerCase().includes(kw.toLowerCase());
            })
          )
        )
        .slice(0, 5)
        .map(doc => `- ${doc.title} (${doc.documentType}): ${doc.summary}`)
        .join('\n');

      // Generate AI CAPA plan
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You are a quality engineering expert creating a CAPA (Corrective and Preventive Action) plan for a lamination manufacturing defect.

DEFECT CONTEXT:
- Type: ${defect?.defectType?.replace(/_/g, ' ')}
- Severity: ${defect?.severity}
- Line: ${defect?.line}
- Product: ${defect?.productCode}
- Film Stack: ${defect?.filmStack}
- Adhesive: ${defect?.adhesiveType}

ROOT CAUSE ANALYSIS FINDINGS:
${JSON.stringify({
  rootCauses: rca.rootCauses,
  fiveWhyAnalysis: rca.fiveWhyTree,
  ishikawaDiagram: rca.ishikawa,
  hypothesisTesting: rca.hypothesisList,
  aiRecommendations: rca.aiRecommendations
}, null, 2)}

AVAILABLE KNOWLEDGE BASE:
${relevantDocsContext || 'No directly related documents found'}

Generate a comprehensive CAPA plan with:

1. CORRECTIVE ACTIONS (3-5 specific actions to fix the immediate issue):
   - Be specific and actionable
   - Focus on addressing the identified root causes
   - Include verification methods
   - Suggest appropriate owner role: "Quality Lead", "Process Engineer", "Maintenance", "Production Supervisor", "Quality Engineer", "Line Operator"
   - Estimate complexity: "simple" (1-2 weeks), "moderate" (3-4 weeks), "complex" (6-8 weeks)

2. PREVENTIVE ACTIONS (3-5 actions to prevent recurrence):
   - Update processes, procedures, or controls
   - Training and competency improvements
   - System/equipment improvements
   - Suggest appropriate owner role
   - Estimate complexity

3. SOP RECOMMENDATIONS:
   - Identify existing SOPs needing updates
   - Suggest new SOPs to create
   - Specify training materials needed

4. IMPLEMENTATION STRATEGY:
   - Overall approach to implementing actions
   - Success criteria
   - Risk assessment (severity, occurrence, detection scores 1-10)

Be specific to lamination processes (web tension, nip pressure, oven temps, line speed, etc.)`,
        response_json_schema: {
          type: "object",
          properties: {
            correctiveActions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  ownerRole: { type: "string" },
                  complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                  verificationMethod: { type: "string" },
                  linkedRootCause: { type: "string" },
                  estimatedCost: { type: "string" }
                },
                required: ["action", "ownerRole", "complexity"]
              }
            },
            preventiveActions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  ownerRole: { type: "string" },
                  complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                  systemImpact: { type: "string" },
                  trainingRequired: { type: "boolean" },
                  documentationUpdate: { type: "string" }
                },
                required: ["action", "ownerRole", "complexity"]
              }
            },
            sopRecommendations: {
              type: "object",
              properties: {
                sopUpdatesNeeded: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      existingSOPTitle: { type: "string" },
                      requiredChanges: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    }
                  }
                },
                newSOPsNeeded: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      suggestedTitle: { type: "string" },
                      purpose: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    }
                  }
                },
                trainingMaterialsNeeded: { type: "array", items: { type: "string" } }
              }
            },
            implementationStrategy: { type: "string" },
            riskAssessment: {
              type: "object",
              properties: {
                severity: { type: "number", minimum: 1, maximum: 10 },
                occurrence: { type: "number", minimum: 1, maximum: 10 },
                detection: { type: "number", minimum: 1, maximum: 10 },
                reasoning: { type: "string" }
              },
              required: ["severity", "occurrence", "detection"]
            },
            successCriteria: { type: "array", items: { type: "string" } }
          },
          required: ["correctiveActions", "preventiveActions", "implementationStrategy", "successCriteria"]
        }
      });

      // Calculate due dates based on complexity
      const getDueDate = (complexity) => {
        const daysToAdd = {
          simple: 14,      // 2 weeks
          moderate: 28,    // 4 weeks
          complex: 56      // 8 weeks
        };
        return new Date(Date.now() + (daysToAdd[complexity] || 21) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      };

      // Format actions with due dates
      const correctiveActions = result.correctiveActions.map(ca => ({
        ...ca,
        dueDate: getDueDate(ca.complexity),
        status: "not_started"
      }));

      const preventiveActions = result.preventiveActions.map(pa => ({
        ...pa,
        dueDate: getDueDate(pa.complexity),
        status: "not_started"
      }));

      // Calculate RPN
      const fmea = result.riskAssessment ? {
        severity: result.riskAssessment.severity,
        occurrence: result.riskAssessment.occurrence,
        detection: result.riskAssessment.detection,
        rpn: result.riskAssessment.severity * result.riskAssessment.occurrence * result.riskAssessment.detection,
        notes: result.riskAssessment.reasoning
      } : null;

      setGeneratedCAPA({
        correctiveActions,
        preventiveActions,
        sopRecommendations: result.sopRecommendations,
        implementationStrategy: result.implementationStrategy,
        successCriteria: result.successCriteria,
        fmea
      });

    } catch (error) {
      console.error("AI CAPA generation error:", error);
      alert("Failed to generate CAPA plan. Please try again.");
    }

    setGenerating(false);
  };

  const handleSaveAndNavigate = async () => {
    if (!generatedCAPA) return;

    setSaving(true);
    try {
      const user = await api.auth.me();

      // Format actions with owner email
      const correctiveActions = generatedCAPA.correctiveActions.map(ca => ({
        ...ca,
        owner: user.email
      }));

      const preventiveActions = generatedCAPA.preventiveActions.map(pa => ({
        ...pa,
        owner: user.email
      }));

      // Create CAPA record
      const newCAPA = await api.entities.CAPAPlan.create({
        rcaId: rca.id,
        defectTicketId: rca.defectTicketId,
        correctiveActions,
        preventiveActions,
        sopRecommendations: generatedCAPA.sopRecommendations,
        implementationStrategy: generatedCAPA.implementationStrategy,
        successCriteria: generatedCAPA.successCriteria,
        fmea: generatedCAPA.fmea,
        approvalState: "draft",
        aiGeneratedDraft: true,
        aiMetadata: {
          generatedDate: new Date().toISOString(),
          rcaId: rca.id,
          defectId: rca.defectTicketId
        }
      });

      // Update RCA status
      await api.entities.RCARecord.update(rca.id, {
        status: "completed",
        completedDate: new Date().toISOString()
      });

      if (onCAPACreated) onCAPACreated(newCAPA);

      // Navigate to CAPA workspace
      navigate(createPageUrl("CAPAWorkspace"));
    } catch (error) {
      console.error("Error saving CAPA:", error);
      alert("Failed to save CAPA. Please try again.");
    }
    setSaving(false);
  };

  const complexityColors = {
    simple: "bg-green-100 text-green-800",
    moderate: "bg-yellow-100 text-yellow-800",
    complex: "bg-orange-100 text-orange-800"
  };

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-green-600" />
              AI CAPA Generator
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Generate comprehensive CAPA plan from RCA findings
            </p>
          </div>
          {!generatedCAPA && (
            <Button
              onClick={handleGenerateCAPA}
              disabled={generating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate CAPA Plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {generating && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-2">
              🤖 AI is analyzing RCA findings and generating CAPA actions...
            </p>
            <p className="text-sm text-gray-600">
              This includes corrective actions, preventive measures, SOP recommendations, and risk assessment
            </p>
          </div>
        )}

        {generatedCAPA && (
          <div className="space-y-6">
            <Alert className="bg-green-100 border-green-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>CAPA Plan Generated!</strong> Review the AI-generated actions below and save to CAPA Workspace.
              </AlertDescription>
            </Alert>

            {/* Corrective Actions */}
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Corrective Actions ({generatedCAPA.correctiveActions.length})
              </h3>
              <div className="space-y-3">
                {generatedCAPA.correctiveActions.map((action, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900 flex-1">{action.action}</p>
                      <Badge className={complexityColors[action.complexity]}>
                        {action.complexity}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="w-3 h-3" />
                        <span>{action.ownerRole}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {action.dueDate}</span>
                      </div>
                      {action.estimatedCost && (
                        <div className="text-gray-600">
                          <span>Cost: {action.estimatedCost}</span>
                        </div>
                      )}
                    </div>
                    {action.verificationMethod && (
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Verification:</strong> {action.verificationMethod}
                      </p>
                    )}
                    {action.linkedRootCause && (
                      <p className="text-xs text-blue-600 mt-1">
                        <strong>Addresses:</strong> {action.linkedRootCause}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preventive Actions */}
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Preventive Actions ({generatedCAPA.preventiveActions.length})
              </h3>
              <div className="space-y-3">
                {generatedCAPA.preventiveActions.map((action, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900 flex-1">{action.action}</p>
                      <Badge className={complexityColors[action.complexity]}>
                        {action.complexity}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="w-3 h-3" />
                        <span>{action.ownerRole}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {action.dueDate}</span>
                      </div>
                      {action.trainingRequired && (
                        <div>
                          <Badge variant="outline" className="text-xs">Training Required</Badge>
                        </div>
                      )}
                    </div>
                    {action.systemImpact && (
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Impact:</strong> {action.systemImpact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SOP Recommendations */}
            {generatedCAPA.sopRecommendations && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-3">📋 SOP Recommendations</h4>
                {generatedCAPA.sopRecommendations.sopUpdatesNeeded?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Updates Needed:</p>
                    <ul className="space-y-1 text-sm">
                      {generatedCAPA.sopRecommendations.sopUpdatesNeeded.map((sop, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Badge className="mt-0.5" variant="outline">{sop.priority}</Badge>
                          <div>
                            <p className="font-medium">{sop.existingSOPTitle}</p>
                            <p className="text-xs text-gray-600">{sop.requiredChanges}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {generatedCAPA.sopRecommendations.newSOPsNeeded?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">New SOPs to Create:</p>
                    <ul className="space-y-1 text-sm">
                      {generatedCAPA.sopRecommendations.newSOPsNeeded.map((sop, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Badge className="mt-0.5" variant="outline">{sop.priority}</Badge>
                          <div>
                            <p className="font-medium">{sop.suggestedTitle}</p>
                            <p className="text-xs text-gray-600">{sop.purpose}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Implementation Strategy & Risk */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">Implementation Strategy</h4>
                <p className="text-sm text-gray-700">{generatedCAPA.implementationStrategy}</p>
              </div>
              {generatedCAPA.fmea && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Risk Assessment (FMEA)</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Severity:</strong> {generatedCAPA.fmea.severity}/10</p>
                    <p><strong>Occurrence:</strong> {generatedCAPA.fmea.occurrence}/10</p>
                    <p><strong>Detection:</strong> {generatedCAPA.fmea.detection}/10</p>
                    <p className="pt-2 border-t"><strong>RPN:</strong> {generatedCAPA.fmea.rpn}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Success Criteria */}
            {generatedCAPA.successCriteria?.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-2">Success Criteria</h4>
                <ul className="space-y-1 text-sm list-disc list-inside text-gray-700">
                  {generatedCAPA.successCriteria.map((criteria, idx) => (
                    <li key={idx}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                Total Actions: {generatedCAPA.correctiveActions.length + generatedCAPA.preventiveActions.length}
              </p>
              <Button
                onClick={handleSaveAndNavigate}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save & Go to CAPA Workspace
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!generating && !generatedCAPA && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">
              Generate an AI-powered CAPA plan based on your RCA findings
            </p>
            <p className="text-sm text-gray-500">
              AI will analyze root causes, 5-Why, Ishikawa, and hypothesis testing to create actionable CAPA items
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}