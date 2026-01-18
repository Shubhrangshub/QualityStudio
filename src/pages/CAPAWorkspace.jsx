import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Plus, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Loader2, GitBranch, ArrowRight, Sparkles
} from "lucide-react";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import CAPAList from "../components/capa/CAPAList";
import CAPAEditor from "../components/capa/CAPAEditor";
import FMEAAssessment from "../components/capa/FMEAAssessment";
import EffectivenessTracker from "../components/capa/EffectivenessTracker";
import CAPAExporter from "../components/capa/CAPAExporter";
import CAPAEffectivenessPrediction from "../components/capa/CAPAEffectivenessPrediction";
import CAPADashboard from "../components/capa/CAPADashboard";

// Query for complaints to enable full traceability

export default function CAPAWorkspace() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedCAPA, setSelectedCAPA] = useState(null);
  const [generatingCAPA, setGeneratingCAPA] = useState(false);

  const queryClient = useQueryClient();

  const { data: capas = [] } = useQuery({
    queryKey: ['capas'],
    queryFn: () => api.entities.CAPAPlan.list("-created_date", 50),
  });

  const { data: allRCAs = [] } = useQuery({
    queryKey: ['rcas-completed'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 50),
  });

  // Filter RCAs: only show completed ones without an existing CAPA
  const rcasWithoutCAPA = allRCAs.filter(rca => 
    rca.status === "completed" && !capas.some(capa => capa.rcaId === rca.id)
  );
  
  // For display purposes, keep reference to all RCAs
  const rcas = allRCAs;

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-capa'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 100),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints-for-capa'],
    queryFn: () => api.entities.CustomerComplaint.list("-dateLogged", 100),
  });

  const createCAPAMutation = useMutation({
    mutationFn: (data) => api.entities.CAPAPlan.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      setSelectedCAPA(data);
      setActiveTab("edit");
    }
  });

  const updateCAPAMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.CAPAPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
    }
  });

  const handleCreateFromRCA = async (rcaId) => {
    setGeneratingCAPA(true);
    
    try {
      const rca = rcas.find(r => r.id === rcaId);
      if (!rca) return;

      const defect = defects.find(d => d.id === rca.defectTicketId);
      const user = await api.auth.me();

      // Fetch additional historical data for AI context
      const allRCAs = await api.entities.RCARecord.list("-created_date", 30);
      const allCAPAs = await api.entities.CAPAPlan.list("-created_date", 30);
      const allDoEs = await api.entities.DoE.list("-created_date", 20); // Though DoE isn't directly used in prompt, good to fetch for future context
      const allProcessRuns = await api.entities.ProcessRun.list("-dateTimeStart", 30); // Same for process runs

      // Get related knowledge documents for context
      const knowledgeDocs = await api.entities.KnowledgeDocument.filter({ status: "active" }, "-created_date", 50);
      
      const relevantDocsContext = knowledgeDocs
        .filter(doc => 
          doc.defectTypes?.includes(defect?.defectType) ||
          doc.keywords?.some(kw => 
            defect?.defectType?.includes(kw.toLowerCase()) ||
            rca.rootCauses?.some(rc => rc.cause?.toLowerCase().includes(kw.toLowerCase()))
          )
        )
        .slice(0, 5) // Limit to top 5 most relevant documents
        .map(doc => `- ${doc.title} (${doc.documentType}): ${doc.summary}`)
        .join('\n');

      // Calculate historical context for AI
      const similarDefects = defects.filter(d => d.defectType === defect.defectType && d.severity === defect.severity && d.id !== defect.id).length;
      const relatedRCAs = allRCAs.filter(r => {
        const rcaDefect = defects.find(d => d.id === r.defectTicketId);
        return rcaDefect && rcaDefect.defectType === defect.defectType && r.id !== rca.id;
      }).length;
      const relatedCAPAs = allCAPAs.filter(c => {
        const capaDefect = defects.find(d => d.id === c.defectTicketId);
        return capaDefect && capaDefect.defectType === defect.defectType && c.approvalState === "closed"; // Only count effective (closed) CAPAs
      }).length;

      // Use AI to generate comprehensive CAPA actions
      const aiCAPAResult = await api.integrations.Core.InvokeLLM({
        prompt: `You are a quality engineering expert creating a CAPA (Corrective and Preventive Action) plan for a lamination manufacturing defect.

DEFECT CONTEXT:
- Type: ${defect?.defectType?.replace(/_/g, ' ')}
- Severity: ${defect?.severity}
- Line: ${defect?.line}
- Product: ${defect?.productCode}
- Date: ${new Date(defect?.dateTime || defect?.created_date).toLocaleString()}

ROOT CAUSE ANALYSIS FINDINGS:
${JSON.stringify({
  rootCauses: rca.rootCauses,
  fiveWhyAnalysis: rca.fiveWhyTree,
  ishikawaDiagram: rca.ishikawa,
  hypothesisTesting: rca.hypothesisList
}, null, 2)}

AVAILABLE KNOWLEDGE BASE DOCUMENTS:
${relevantDocsContext || 'No directly related documents found'}

HISTORICAL CONTEXT:
- Similar Defects: ${similarDefects} past similar defects of type "${defect.defectType?.replace(/_/g, ' ')}" and severity "${defect.severity}".
- Related RCAs: ${relatedRCAs} past Root Cause Analyses for similar defects.
- Effective CAPAs: ${relatedCAPAs} past effective (closed) CAPAs for similar defects.

Generate a comprehensive CAPA plan with:

1. CORRECTIVE ACTIONS (3-5 specific actions to fix the immediate issue):
   - Be specific and actionable (not generic)
   - Focus on addressing the root causes directly
   - Include verification steps
   - Suggest appropriate owner role based on action type
   - Estimate complexity (simple/moderate/complex) for due date calculation

2. PREVENTIVE ACTIONS (3-5 actions to prevent recurrence):
   - Update processes, procedures, or controls
   - Training and competency improvements
   - System/equipment improvements
   - Monitoring and early warning systems
   - Suggest appropriate owner role
   - Estimate complexity

3. SOP RECOMMENDATIONS:
   - Identify existing SOPs that need updates based on available documents
   - Suggest new SOPs that should be created
   - Specify training materials needed

OWNER ROLE OPTIONS:
- "Quality Lead" - for quality systems, audits, verification
- "Process Engineer" - for process parameter changes, optimization
- "Maintenance" - for equipment repairs, calibration, PM
- "Production Supervisor" - for operator training, work instructions
- "Quality Engineer" - for inspection methods, testing protocols
- "Line Operator" - for immediate operational changes

COMPLEXITY LEVELS:
- simple: Can be done in 1-2 weeks (quick fixes, adjustments)
- moderate: Needs 3-4 weeks (requires coordination, testing)
- complex: Needs 6-8 weeks (equipment changes, extensive validation)

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
                }
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
                }
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
              }
            },
            successCriteria: { type: "array", items: { type: "string" } }
          },
          required: ["correctiveActions", "preventiveActions", "sopRecommendations", "implementationStrategy", "riskAssessment", "successCriteria"]
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

      // Format corrective actions
      const correctiveActions = aiCAPAResult.correctiveActions.map(ca => ({
        action: ca.action,
        owner: user.email, // Default to current user, can be reassigned
        ownerRole: ca.ownerRole,
        dueDate: getDueDate(ca.complexity),
        status: "not_started",
        verificationMethod: ca.verificationMethod,
        linkedRootCause: ca.linkedRootCause,
        complexity: ca.complexity,
        estimatedCost: ca.estimatedCost
      }));

      // Format preventive actions
      const preventiveActions = aiCAPAResult.preventiveActions.map(pa => ({
        action: pa.action,
        owner: user.email,
        ownerRole: pa.ownerRole,
        dueDate: getDueDate(pa.complexity),
        status: "not_started",
        systemImpact: pa.systemImpact,
        trainingRequired: pa.trainingRequired,
        documentationUpdate: pa.documentationUpdate,
        complexity: pa.complexity
      }));

      // Calculate RPN from AI assessment
      const fmea = aiCAPAResult.riskAssessment ? {
        severity: aiCAPAResult.riskAssessment.severity,
        occurrence: aiCAPAResult.riskAssessment.occurrence,
        detection: aiCAPAResult.riskAssessment.detection,
        rpn: aiCAPAResult.riskAssessment.severity * 
             aiCAPAResult.riskAssessment.occurrence * 
             aiCAPAResult.riskAssessment.detection,
        notes: aiCAPAResult.riskAssessment.reasoning
      } : {
        severity: 7,
        occurrence: 5,
        detection: 6,
        rpn: 210
      };

      createCAPAMutation.mutate({
        rcaId: rcaId,
        defectTicketId: rca.defectTicketId,
        correctiveActions,
        preventiveActions,
        approvalState: "draft",
        aiGeneratedDraft: true,
        fmea,
        implementationStrategy: aiCAPAResult.implementationStrategy,
        successCriteria: aiCAPAResult.successCriteria,
        sopRecommendations: aiCAPAResult.sopRecommendations,
        aiMetadata: {
          generatedDate: new Date().toISOString(),
          rcaAnalysisDepth: {
            rootCauses: rca.rootCauses?.length || 0,
            fiveWhyLevels: rca.fiveWhyTree?.length || 0,
            ishikawaCategories: Object.keys(rca.ishikawa || {}).length,
            hypothesesTested: rca.hypothesisList?.length || 0
          },
          relevantDocumentsUsed: relevantDocsContext ? relevantDocsContext.split('\n').length : 0,
          historicalContext: {
            similarDefects,
            relatedRCAs,
            relatedCAPAs
          }
        }
      });

    } catch (error) {
      console.error("AI CAPA generation error:", error);
      // Fallback to basic CAPA if AI fails
      const rca = rcas.find(r => r.id === rcaId);
      const user = await api.auth.me();
      
      createCAPAMutation.mutate({
        rcaId: rcaId,
        defectTicketId: rca.defectTicketId,
        correctiveActions: [{
          action: "Review and address root causes from RCA",
          owner: user.email,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "not_started"
        }],
        preventiveActions: [{
          action: "Update procedures to prevent recurrence",
          owner: user.email,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "not_started"
        }],
        approvalState: "draft",
        aiGeneratedDraft: false,
        fmea: { severity: 7, occurrence: 5, detection: 6, rpn: 210 }
      });
    } finally {
      setGeneratingCAPA(false);
    }
  };

  const handleSave = (updates) => {
    if (!selectedCAPA) return;
    updateCAPAMutation.mutate({
      id: selectedCAPA.id,
      data: { ...selectedCAPA, ...updates }
    });
  };

  const openCapas = capas.filter(c => c.approvalState !== "closed");
  const overdueCapas = capas.filter(c => {
    if (c.approvalState === "closed") return false;
    const actions = [...(c.correctiveActions || []), ...(c.preventiveActions || [])];
    return actions.some(a => a.status !== "completed" && new Date(a.dueDate) < new Date());
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            CAPA Workspace
          </h1>
          <p className="text-gray-600 mt-1">Corrective & Preventive Action Management</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open CAPAs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{openCapas.length}</p>
                </div>
                <ClipboardList className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{overdueCapas.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {capas.filter(c => c.approvalState === "pending_review").length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {capas.filter(c => c.approvalState === "closed").length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="list">All CAPAs</TabsTrigger>
            <TabsTrigger value="new">Create from RCA</TabsTrigger>
            {selectedCAPA && <TabsTrigger value="edit">Edit CAPA</TabsTrigger>}
          </TabsList>

          <TabsContent value="dashboard">
            <CAPADashboard capas={capas} defects={defects} />
          </TabsContent>

          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>Create CAPA from Completed RCA</CardTitle>
                <div className="mt-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-900 font-medium mb-2">📋 How AI-Powered CAPA Works:</p>
                  <ol className="text-sm text-purple-800 space-y-1 ml-4 list-decimal">
                    <li>Complete an RCA (Root Cause Analysis) first</li>
                    <li>Select the completed RCA below</li>
                    <li><strong>AI analyzes all RCA findings</strong> (5-Why, Ishikawa, hypotheses)</li>
                    <li><strong>AI generates specific, actionable Corrective & Preventive Actions</strong></li>
                    <li><strong>AI suggests appropriate owners and realistic due dates</strong></li>
                    <li>Review, adjust, and assign owners</li>
                    <li>Track completion and verify effectiveness</li>
                  </ol>
                </div>

                {generatingCAPA && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          🤖 AI is analyzing RCA findings and generating CAPA plan...
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          This may take 10-15 seconds. AI is reviewing root causes, creating specific actions, and estimating timelines.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {rcasWithoutCAPA.length > 0 ? (
                          <div className="space-y-3">
                            {rcasWithoutCAPA.map((rca) => {
                              const defect = defects.find(d => d.id === rca.defectTicketId);
                      
                      return (
                        <div
                          key={rca.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-mono text-sm text-gray-600">
                                  RCA #{rca.id.slice(0, 8)}
                                </p>
                                {rca.aiRecommendations && rca.aiRecommendations.length > 0 && (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI-Enhanced
                                  </Badge>
                                )}
                              </div>
                              
                              {defect && (
                                <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                                  <p className="text-xs font-medium text-orange-900">
                                    Defect: {defect.defectType?.replace(/_/g, ' ')} ({defect.severity})
                                  </p>
                                  <p className="text-xs text-orange-700">
                                    Line {defect.line} • {defect.productCode}
                                  </p>
                                </div>
                              )}

                              <div className="text-sm text-gray-700 space-y-1">
                                <p>Analyst: {rca.analyst}</p>
                                {rca.rootCauses && (
                                  <p>✓ {rca.rootCauses.length} root causes identified</p>
                                )}
                                {rca.fiveWhyTree && rca.fiveWhyTree.length > 0 && (
                                  <p>✓ {rca.fiveWhyTree.length}-level 5-Why analysis</p>
                                )}
                                {rca.hypothesisList && rca.hypothesisList.length > 0 && (
                                  <p>✓ {rca.hypothesisList.filter(h => h.validated).length}/{rca.hypothesisList.length} hypotheses validated</p>
                                )}
                              </div>
                              
                              <p className="text-xs text-gray-500 mt-2">
                                Completed: {rca.completedDate ? format(new Date(rca.completedDate), 'MMM d, yyyy') : 'Recently'}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleCreateFromRCA(rca.id)}
                              disabled={generatingCAPA || createCAPAMutation.isPending}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                              {generatingCAPA || createCAPAMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate AI CAPA
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium text-lg mb-2">No Completed RCAs Available</p>
                    <p className="text-gray-600 text-sm mb-6">
                      Complete an RCA in the RCA Studio first, then return here to create CAPA actions.
                    </p>
                    <Link to={createPageUrl("RCAStudio")}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <GitBranch className="w-4 h-4 mr-2" />
                        Go to RCA Studio
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <CAPAList 
              capas={capas}
              defects={defects}
              rcas={rcas}
              onSelect={(capa) => {
                setSelectedCAPA(capa);
                setActiveTab("edit");
              }} 
            />
          </TabsContent>

          <TabsContent value="edit">
            {selectedCAPA ? (
              <div className="space-y-6">
                <CAPAEditor capa={selectedCAPA} onUpdate={handleSave} />
                <CAPAEffectivenessPrediction 
                  capa={selectedCAPA}
                  defect={defects.find(d => d.id === selectedCAPA.defectTicketId)}
                  rca={rcas.find(r => r.id === selectedCAPA.rcaId)}
                  onUpdate={handleSave}
                />
                <CAPAExporter 
                        capa={selectedCAPA} 
                        defect={defects.find(d => d.id === selectedCAPA.defectTicketId)}
                        rca={rcas.find(r => r.id === selectedCAPA.rcaId)}
                        complaint={complaints.find(c => c.id === defects.find(d => d.id === selectedCAPA.defectTicketId)?.linkedComplaintId)}
                      />
                <FMEAAssessment 
                  capa={selectedCAPA} 
                  defect={defects.find(d => d.id === selectedCAPA.defectTicketId)}
                  rca={rcas.find(r => r.id === selectedCAPA.rcaId)}
                  onUpdate={handleSave} 
                />
                <EffectivenessTracker capa={selectedCAPA} onUpdate={handleSave} />
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a CAPA from the list</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}