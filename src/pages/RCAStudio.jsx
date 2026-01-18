import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GitBranch, Plus, Sparkles, Check, AlertTriangle, 
  TrendingUp, ChevronRight, Loader2, FileText 
} from "lucide-react";

import FiveWhyAnalysis from "../components/rca/FiveWhyAnalysis";
import IshikawaDiagram from "../components/rca/IshikawaDiagram";
import RCAList from "../components/rca/RCAList";
import DefectSelector from "../components/rca/DefectSelector";
import HypothesisTesting from "../components/rca/HypothesisTesting";
import AIRCASuggestions from "../components/rca/AIRCASuggestions";
import RelatedDocuments from "../components/knowledge/RelatedDocuments";
import DefectInsights from "../components/defect/DefectInsights";
import ComprehensiveRCAReport from "../components/rca/ComprehensiveRCAReport";
import AICAPAGenerator from "../components/rca/AICAPAGenerator";

export default function RCAStudio() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedDefectId, setSelectedDefectId] = useState(null);
  const [currentRCA, setCurrentRCA] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // NEW: Show defect insights when selecting defect
  const [selectedDefectForRCA, setSelectedDefectForRCA] = useState(null);

  const queryClient = useQueryClient();

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 50),
  });

  const { data: allDefects = [] } = useQuery({
    queryKey: ['defects-for-rca'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 100),
  });

  // Filter defects: only show those without an existing RCA
  const defectsWithoutRCA = allDefects.filter(defect => 
    !rcas.some(rca => rca.defectTicketId === defect.id)
  );
  
  // For display purposes, keep reference to all defects
  const defects = allDefects;

  // NEW: Fetch CAPA records for historical insights
  const { data: capas = [] } = useQuery({
    queryKey: ['capas'],
    queryFn: () => api.entities.CAPARecord.list("-created_date", 50), // Assuming CAPARecord entity
  });

  // NEW: Fetch DoE records for historical insights
  const { data: does = [] } = useQuery({
    queryKey: ['does'],
    queryFn: () => api.entities.DoERecord.list("-created_date", 50), // Assuming DoERecord entity
  });

  const createRCAMutation = useMutation({
    mutationFn: (data) => api.entities.RCARecord.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      setCurrentRCA(data);
      setActiveTab("analysis");
    }
  });

  const updateRCAMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.RCARecord.update(id, data),
    onSuccess: (updatedRCA) => { // updatedRCA is the data returned from the mutation
      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      // Update local state so UI reflects changes immediately
      setCurrentRCA(updatedRCA);
    }
  });

  const handleStartRCA = async (defectId) => {
    setSelectedDefectId(defectId);
    
    // NEW: Load the defect to show insights
    const selectedDefect = defects.find(d => d.id === defectId);
    setSelectedDefectForRCA(selectedDefect);
    
    const user = await api.auth.me();
    createRCAMutation.mutate({
      defectTicketId: defectId,
      analyst: user.email,
      status: "in_progress",
      fiveWhyTree: [],
      ishikawa: {
        man: [],
        machine: [],
        material: [],
        method: [],
        environment: [],
        measurement: []
      },
      hypothesisList: [],
      rootCauses: [],
      linkedDocumentIds: [], // Initialize linkedDocumentIds
      aiRecommendations: [] // Initialize aiRecommendations
    });
  };

  const handleGetAISuggestions = async () => {
    if (!currentRCA) return;
    
    setLoadingAI(true);
    try {
      const defect = defects.find(d => d.id === currentRCA.defectTicketId);
      
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You are a quality engineer expert in lamination processes for window films and PPF.
        
        Defect Information:
        - Type: ${defect?.defectType}
        - Severity: ${defect?.severity}
        - Line: ${defect?.line}
        - Product: ${defect?.productCode}
        - Film Stack: ${defect?.filmStack}
        - Adhesive: ${defect?.adhesiveType}
        
        Provide root cause analysis with:
        1. Top 5 most likely root causes with likelihood scores
        2. Specific tests to validate each hypothesis
        3. Historical evidence or common patterns
        4. Ishikawa diagram categorization
        
        Be specific to lamination parameters like line speed, nip pressure, web tension, oven temps, etc.`,
        response_json_schema: {
          type: "object",
          properties: {
            rootCauses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause: { type: "string" },
                  likelihood: { type: "number" },
                  category: { type: "string" },
                  suggestedTests: { type: "array", items: { type: "string" } },
                  historicalEvidence: { type: "string" }
                }
              }
            },
            ishikawaSuggestions: {
              type: "object",
              properties: {
                man: { type: "array", items: { type: "string" } },
                machine: { type: "array", items: { type: "string" } },
                material: { type: "array", items: { type: "string" } },
                method: { type: "array", items: { type: "string" } },
                environment: { type: "array", items: { type: "string" } },
                measurement: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAiSuggestions(result);
      
      // Auto-update RCA with AI suggestions
      updateRCAMutation.mutate({
        id: currentRCA.id,
        data: {
          ...currentRCA,
          aiRecommendations: result.rootCauses,
          ishikawa: {
            ...currentRCA.ishikawa,
            ...result.ishikawaSuggestions
          }
        }
      });
    } catch (error) {
      console.error("AI error:", error);
    }
    setLoadingAI(false);
  };

  const handleSaveRCA = (updates) => {
    if (!currentRCA) return;
    
    // Merge updates with current RCA
    const updatedData = { ...currentRCA, ...updates };
    
    updateRCAMutation.mutate({
      id: currentRCA.id,
      data: updatedData
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-blue-600" />
            RCA Studio
          </h1>
          <p className="text-gray-600 mt-1">Root Cause Analysis with AI assistance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">Active RCAs ({rcas.filter(r => r.status !== "closed").length})</TabsTrigger>
            <TabsTrigger value="new">Start New RCA</TabsTrigger>
            {currentRCA && <TabsTrigger value="analysis">Analysis</TabsTrigger>}
            {currentRCA && <TabsTrigger value="capa-gen">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate CAPA
            </TabsTrigger>}
            {currentRCA && <TabsTrigger value="report">
              <FileText className="w-4 h-4 mr-2" />
              Comprehensive Report
            </TabsTrigger>}
          </TabsList>

          <TabsContent value="list">
            <RCAList 
              rcas={rcas} 
              defects={defects}
              onSelect={(rca) => {
                setCurrentRCA(rca);
                setSelectedDefectForRCA(defects.find(d => d.id === rca.defectTicketId));
                setActiveTab("analysis");
              }} 
            />
          </TabsContent>

          <TabsContent value="new">
            {/* NEW: Show defect insights if available */}
            {selectedDefectForRCA?.aiInsights && (
              <div className="mb-6">
                <Card className="border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50 mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-semibold text-purple-900">
                          AI Already Analyzed This Defect!
                        </p>
                        <p className="text-sm text-purple-700 mt-1">
                          Found {selectedDefectForRCA.aiInsights.suggestedRootCauses?.length || 0} potential root causes and {selectedDefectForRCA.aiInsights.similarDefectIds?.length || 0} similar historical cases
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <DefectInsights 
                  insights={selectedDefectForRCA.aiInsights}
                  defect={selectedDefectForRCA}
                  historicalData={{
                    similarDefects: defects.filter(d => 
                      selectedDefectForRCA.aiInsights.similarDefectIds?.includes(d.id)
                    ),
                    relatedRCAs: rcas.filter(r => 
                      selectedDefectForRCA.aiInsights.relatedRCAIds?.includes(r.id)
                    ),
                    relatedCAPAs: capas.filter(c => 
                      selectedDefectForRCA.aiInsights.relatedCAPAIds?.includes(c.id)
                    ),
                    relatedDoEs: does.filter(d => 
                      selectedDefectForRCA.aiInsights.relatedDoEIds?.includes(d.id)
                    )
                  }}
                />
              </div>
            )}

            <DefectSelector 
              defects={defectsWithoutRCA} 
              onSelect={handleStartRCA}
              isLoading={createRCAMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="analysis">
            {currentRCA ? (
              <div className="space-y-6">
                {/* AI Suggestions */}
                <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI RCA Copilot
                      </CardTitle>
                      <Button
                        onClick={handleGetAISuggestions}
                        disabled={loadingAI}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {loadingAI ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Get AI Suggestions
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {aiSuggestions && (
                    <CardContent>
                      <AIRCASuggestions suggestions={aiSuggestions} />
                    </CardContent>
                  )}
                </Card>

                {/* NEW: Related Documents */}
                <RelatedDocuments 
                  context={{ 
                    type: 'rca', 
                    data: currentRCA
                  }}
                  onLink={async (docId) => {
                    // Update the KnowledgeDocument to link it to this RCA
                    await api.entities.KnowledgeDocument.update(docId, {
                      linkedRCAIds: [...(currentRCA.linkedRCAIds || []), currentRCA.id]
                    });
                    
                    // Update the current RCA to include the linked document
                    handleSaveRCA({
                      linkedDocumentIds: [...(currentRCA.linkedDocumentIds || []), docId]
                    });
                  }}
                />

                {/* Analysis Tools */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <FiveWhyAnalysis 
                    rca={currentRCA}
                    onUpdate={handleSaveRCA}
                  />
                  <IshikawaDiagram 
                    rca={currentRCA}
                    onUpdate={handleSaveRCA}
                  />
                </div>

                <HypothesisTesting 
                  rca={currentRCA}
                  onUpdate={handleSaveRCA}
                />

                {/* Complete RCA & Generate CAPA */}
                <Card className="border-2 border-green-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">Ready to Complete RCA & Generate CAPA?</p>
                        <p className="text-sm text-gray-600 mt-1">
                          This will save your RCA analysis and navigate to CAPA generation
                        </p>
                      </div>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          // Consolidate root causes from different sources
                          const consolidatedRootCauses = [
                            ...(currentRCA.rootCauses || []),
                            ...(currentRCA.aiRecommendations || []).map(ai => ({
                              cause: ai.cause,
                              confidence: ai.likelihood,
                              category: ai.category,
                              source: 'AI'
                            })),
                            ...(currentRCA.fiveWhyTree || [])
                              .filter(why => why.answer && why.answer.trim())
                              .map(why => ({
                                cause: why.answer,
                                source: '5-Why',
                                level: why.level
                              }))
                          ];

                          // Save RCA as completed with all data
                          handleSaveRCA({
                            status: "completed",
                            completedDate: new Date().toISOString(),
                            rootCauses: consolidatedRootCauses
                          });
                          // Navigate to CAPA generation tab
                          setActiveTab("capa-gen");
                        }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Complete & Generate CAPA
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select an RCA from the list or start a new one</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="capa-gen">
            {currentRCA ? (
              <AICAPAGenerator 
                rca={currentRCA}
                defect={defects.find(d => d.id === currentRCA.defectTicketId)}
                onCAPACreated={(capa) => {
                  queryClient.invalidateQueries({ queryKey: ['capas'] });
                }}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select an RCA to generate CAPA plan</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="report">
            {currentRCA ? (
              <ComprehensiveRCAReport 
                rca={currentRCA}
                defect={defects.find(d => d.id === currentRCA.defectTicketId)}
                onExport={() => {
                  // Optional: show success message
                  alert("RCA report exported successfully!");
                }}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select an RCA to view the comprehensive report</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}