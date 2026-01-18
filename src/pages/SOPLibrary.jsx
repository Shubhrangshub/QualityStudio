import React, { useState, useEffect } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  FileText, Plus, Search, Sparkles, Loader2, 
  Download, Eye, Edit, CheckCircle2, Lightbulb, Link as LinkIcon, X, RotateCcw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SOPLibrary() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedSOP, setGeneratedSOP] = useState(null);
  const [viewingSOP, setViewingSOP] = useState(null);
  const [editingSOP, setEditingSOP] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [regeneratingSOP, setRegeneratingSOP] = useState(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [sopVersions, setSopVersions] = useState([]);
  
  // Link to defects/process runs/RCAs/CAPAs
  const [linkedDefectId, setLinkedDefectId] = useState("");
  const [linkedProcessRunId, setLinkedProcessRunId] = useState("");
  const [linkedRCAId, setLinkedRCAId] = useState("");
  const [linkedCAPAId, setLinkedCAPAId] = useState("");
  
  // AI suggestions
  const [suggestedData, setSuggestedData] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await api.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: sops = [], isLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: () => api.entities.SOP.list("-created_date", 100),
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-for-sop'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['runs-for-sop'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 50),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-for-sop'],
    queryFn: () => api.entities.RCARecord.list("-created_date", 50),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-for-sop'],
    queryFn: () => api.entities.CAPAPlan.list("-created_date", 50),
  });

  const createSOPMutation = useMutation({
    mutationFn: (data) => api.entities.SOP.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      setActiveTab("list");
      setGeneratedSOP(null);
      setLinkedDefectId("");
      setLinkedProcessRunId("");
      setLinkedRCAId("");
      setLinkedCAPAId("");
      setSuggestedData(null);
    }
  });

  const updateSOPMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.SOP.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
      setEditingSOP(null);
    }
  });

  const deleteSOPMutation = useMutation({
    mutationFn: (id) => api.entities.SOP.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] });
    }
  });

  // Auto-suggest relevant data when prompt changes
  useEffect(() => {
    if (aiPrompt.trim().length > 10) {
      const delayDebounceFn = setTimeout(() => {
        handleAutoSuggest();
      }, 800);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSuggestedData(null);
    }
  }, [aiPrompt]);

  const handleAutoSuggest = async () => {
    setLoadingSuggestions(true);
    
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this SOP request: "${aiPrompt}"

Available historical data:
- Defects: ${defects.slice(0, 10).map(d => `${d.defectType} (Line ${d.line})`).join(', ')}
- RCAs: ${rcas.slice(0, 5).map(r => `RCA-${r.id.slice(0, 6)} (${r.status})`).join(', ')}
- CAPAs: ${capas.slice(0, 5).map(c => `CAPA-${c.id.slice(0, 6)}`).join(', ')}

Suggest:
1. Most relevant defects (IDs and why)
2. Related RCAs (IDs and relevance)
3. Related CAPAs (IDs and relevance)
4. Related process runs if applicable

Return top 3 suggestions per category.`,
        response_json_schema: {
          type: "object",
          properties: {
            relevantDefects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  defectId: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            relevantRCAs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rcaId: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            relevantCAPAs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  capaId: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      setSuggestedData(result);
    } catch (error) {
      console.error("Auto-suggest error:", error);
    }
    
    setLoadingSuggestions(false);
  };

  const handleGenerateSOP = async () => {
    setGeneratingAI(true);

    try {
      // Build comprehensive context from all linked data
      let contextInfo = "";
      
      if (linkedDefectId) {
        const defect = defects.find(d => d.id === linkedDefectId);
        if (defect) {
          contextInfo += `\n\nLinked Defect Context:
- Type: ${defect.defectType?.replace(/_/g, ' ')}
- Line: ${defect.line}
- Product: ${defect.productCode}
- Severity: ${defect.severity}
- Immediate Action Taken: ${defect.immediateAction || 'N/A'}`;
        }
      }
      
      if (linkedProcessRunId) {
        const run = processRuns.find(r => r.id === linkedProcessRunId);
        if (run) {
          contextInfo += `\n\nLinked Process Run Context:
- Line: ${run.line}
- Product: ${run.productCode}
- Speed: ${run.lineSpeed}m/min
- Nip Pressure: ${run.nipPressure}bar
- Oven Temps: ${run.ovenZonesTemp?.join(', ') || 'N/A'}°C`;
        }
      }
      
      if (linkedRCAId) {
        const rca = rcas.find(r => r.id === linkedRCAId);
        if (rca) {
          contextInfo += `\n\nLinked RCA Findings:
- Analyst: ${rca.analyst}
- Root Causes Identified: ${rca.rootCauses?.length || 0}
- Key Root Causes: ${rca.rootCauses?.slice(0, 3).map(rc => rc.cause || rc).join(', ') || 'N/A'}
- 5-Why Depth: ${rca.fiveWhyTree?.length || 0} levels
- Status: ${rca.status}`;
        }
      }
      
      if (linkedCAPAId) {
        const capa = capas.find(c => c.id === linkedCAPAId);
        if (capa) {
          const allActions = [...(capa.correctiveActions || []), ...(capa.preventiveActions || [])];
          contextInfo += `\n\nLinked CAPA Plan:
- Total Actions: ${allActions.length}
- Implementation Strategy: ${capa.implementationStrategy || 'N/A'}
- Key Actions: ${allActions.slice(0, 3).map(a => a.action).join(', ')}`;
        }
      }

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Create detailed SOP for lamination process: ${aiPrompt}${contextInfo}

Generate comprehensive SOP with:
1. Title and scope
2. Required materials and tools
3. Critical parameters (target values, limits)
4. Step-by-step procedures with verification
5. Quality checkpoints and acceptance criteria
6. Safety precautions
7. Troubleshooting guide

Reference linked data to make SOP specific and practical.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            scope: { type: "string" },
            processStep: { type: "string" },
            materialsTools: { type: "array", items: { type: "string" } },
            parameters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  target: { type: "number" },
                  lowerLimit: { type: "number" },
                  upperLimit: { type: "number" },
                  unit: { type: "string" },
                  critical: { type: "boolean" }
                }
              }
            },
            procedureSteps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stepNumber: { type: "number" },
                  instruction: { type: "string" },
                  verificationMethod: { type: "string" },
                  cautions: { type: "array", items: { type: "string" } }
                }
              }
            },
            checksheets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  checkItem: { type: "string" },
                  frequency: { type: "string" },
                  acceptanceCriteria: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedSOP(result);
    } catch (error) {
      console.error("AI generation error:", error);
    }

    setGeneratingAI(false);
  };

  const handleSaveGeneratedSOP = async () => {
    if (!generatedSOP) return;

    try {
      const user = await api.auth.me();
      
      await createSOPMutation.mutateAsync({
        title: generatedSOP.title,
        sopNumber: `SOP-${Date.now().toString().slice(-6)}`,
        version: "1.0",
        processStep: generatedSOP.processStep || "General",
        scope: generatedSOP.scope,
        materialsTools: generatedSOP.materialsTools || [],
        parameters: generatedSOP.parameters || [],
        procedureSteps: generatedSOP.procedureSteps || [],
        checksheets: generatedSOP.checksheets || [],
        status: "draft",
        author: user.email,
        aiGenerated: true,
        linkedDefects: linkedDefectId && linkedDefectId !== "" ? [linkedDefectId] : [],
        linkedCAPAs: linkedCAPAId && linkedCAPAId !== "" ? [linkedCAPAId] : []
      });
      
      // Reset form
      setGeneratedSOP(null);
      setAiPrompt("");
      setLinkedDefectId("");
      setLinkedRCAId("");
      setLinkedCAPAId("");
      setLinkedProcessRunId("");
      setSuggestedData(null);
    } catch (error) {
      console.error("Error saving SOP:", error);
      alert("Failed to save SOP: " + (error.message || "Unknown error"));
    }
  };

  const handleDownloadSOP = (sop) => {
    let content = `STANDARD OPERATING PROCEDURE\n\n`;
    content += `Title: ${sop.title || 'Untitled'}\n`;
    content += `SOP Number: ${sop.sopNumber || 'N/A'}\n`;
    content += `Version: ${sop.version || '1.0'}\n`;
    content += `Process Step: ${sop.processStep || 'N/A'}\n`;
    content += `Author: ${sop.author || 'Unknown'}\n`;
    content += `Status: ${sop.status || 'draft'}\n\n`;
    
    if (sop.scope) {
      content += `SCOPE:\n${sop.scope}\n\n`;
    }
    
    if (sop.materialsTools?.length > 0) {
      content += `MATERIALS & TOOLS:\n`;
      sop.materialsTools.forEach((item, idx) => {
        content += `${idx + 1}. ${item}\n`;
      });
      content += '\n';
    }
    
    if (sop.parameters?.length > 0) {
      content += `CRITICAL PARAMETERS:\n`;
      sop.parameters.forEach(param => {
        content += `- ${param.parameter}: Target ${param.target || 'N/A'} ${param.unit || ''} (${param.lowerLimit || 'N/A'}-${param.upperLimit || 'N/A'})`;
        if (param.critical) content += ' [CRITICAL]';
        content += '\n';
      });
      content += '\n';
    }
    
    if (sop.procedureSteps?.length > 0) {
      content += `PROCEDURE:\n`;
      sop.procedureSteps.forEach(step => {
        content += `\nStep ${step.stepNumber}: ${step.instruction}\n`;
        if (step.verificationMethod) {
          content += `  Verification: ${step.verificationMethod}\n`;
        }
        if (step.cautions?.length > 0) {
          step.cautions.forEach(caution => {
            content += `  ⚠ CAUTION: ${caution}\n`;
          });
        }
      });
      content += '\n';
    }
    
    if (sop.checksheets?.length > 0) {
      content += `QUALITY CHECKSHEET:\n`;
      sop.checksheets.forEach(check => {
        content += `- ${check.checkItem}\n`;
        content += `  Frequency: ${check.frequency} | Acceptance: ${check.acceptanceCriteria}\n`;
      });
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sop.sopNumber || 'SOP'}-${sop.title?.replace(/\s+/g, '-') || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateStatus = async (sopId, newStatus) => {
    if (!confirm(`Change SOP status to "${newStatus}"?`)) return;
    
    try {
      await updateSOPMutation.mutateAsync({ 
        id: sopId, 
        data: { status: newStatus, effectiveDate: newStatus === 'approved' ? new Date().toISOString().split('T')[0] : undefined } 
      });
    } catch (error) {
      console.error("Error updating SOP status:", error);
      alert("Failed to update SOP status");
    }
  };

  const handleDeleteSOP = async (sopId) => {
    if (!confirm("Are you sure you want to delete this SOP? This action cannot be undone.")) return;
    
    try {
      await deleteSOPMutation.mutateAsync(sopId);
    } catch (error) {
      console.error("Error deleting SOP:", error);
      alert("Failed to delete SOP");
    }
  };

  const saveVersionHistory = async (sop, changeDescription) => {
    try {
      await api.entities.SOPVersion.create({
        sopId: sop.id,
        versionNumber: sop.version,
        title: sop.title,
        scope: sop.scope,
        processStep: sop.processStep,
        materialsTools: sop.materialsTools,
        parameters: sop.parameters,
        procedureSteps: sop.procedureSteps,
        checksheets: sop.checksheets,
        changeDescription,
        changedBy: currentUser?.email,
        status: sop.status
      });
    } catch (error) {
      console.error("Error saving version history:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSOP) return;
    
    try {
      // Find original SOP to save its version
      const originalSOP = sops.find(s => s.id === editingSOP.id);
      if (originalSOP) {
        await saveVersionHistory(originalSOP, "Manual edit");
      }
      
      // Update version number
      const newVersion = `${parseFloat(editingSOP.version || "1.0") + 0.1}`;
      
      await updateSOPMutation.mutateAsync({ 
        id: editingSOP.id, 
        data: { ...editingSOP, version: newVersion }
      });
      setEditingSOP(null);
    } catch (error) {
      console.error("Error saving SOP:", error);
      alert("Failed to save SOP");
    }
  };

  const loadVersionHistory = async (sopId) => {
    try {
      const versions = await api.entities.SOPVersion.filter({ sopId }, "-created_date", 50);
      setSopVersions(versions);
      setViewingHistory(sopId);
    } catch (error) {
      console.error("Error loading version history:", error);
    }
  };

  const handleRevertToVersion = async (version) => {
    if (!confirm(`Revert to version ${version.versionNumber}? Current version will be saved in history.`)) {
      return;
    }
    
    try {
      const currentSOP = sops.find(s => s.id === version.sopId);
      if (currentSOP) {
        await saveVersionHistory(currentSOP, `Reverted from version ${currentSOP.version}`);
      }
      
      const newVersion = `${parseFloat(currentSOP?.version || "1.0") + 0.1}`;
      
      await updateSOPMutation.mutateAsync({
        id: version.sopId,
        data: {
          title: version.title,
          scope: version.scope,
          processStep: version.processStep,
          materialsTools: version.materialsTools,
          parameters: version.parameters,
          procedureSteps: version.procedureSteps,
          checksheets: version.checksheets,
          version: newVersion,
          changeHistory: [
            ...(currentSOP?.changeHistory || []),
            {
              version: newVersion,
              date: new Date().toISOString().split('T')[0],
              changedBy: currentUser?.email,
              description: `Reverted to version ${version.versionNumber}`,
              approvedBy: null
            }
          ]
        }
      });
      
      setViewingHistory(null);
    } catch (error) {
      console.error("Error reverting version:", error);
      alert("Failed to revert to previous version");
    }
  };

  const handleRegenerateSOP = async () => {
    if (!regeneratingSOP || !regeneratePrompt.trim()) {
      alert("Please provide regeneration instructions");
      return;
    }
    
    setLoadingAI(true);
    try {
      // Save current version before regenerating
      await saveVersionHistory(regeneratingSOP, `AI Regeneration: ${regeneratePrompt}`);
      
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Regenerate the following SOP with these modifications: ${regeneratePrompt}

Original SOP:
Title: ${regeneratingSOP.title}
Scope: ${regeneratingSOP.scope}
Process Step: ${regeneratingSOP.processStep}

${regeneratingSOP.procedureSteps?.map((s, i) => `Step ${i+1}: ${s.instruction}`).join('\n')}

Provide updated SOP with same structure but incorporating the requested changes.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            scope: { type: "string" },
            processStep: { type: "string" },
            procedureSteps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stepNumber: { type: "number" },
                  instruction: { type: "string" },
                  verificationMethod: { type: "string" },
                  cautions: { type: "array", items: { type: "string" } }
                }
              }
            },
            materialsTools: { type: "array", items: { type: "string" } },
            safetyPrecautions: { type: "array", items: { type: "string" } }
          }
        }
      });

      await updateSOPMutation.mutateAsync({ 
        id: regeneratingSOP.id, 
        data: { 
          ...regeneratingSOP,
          ...result,
          version: `${parseFloat(regeneratingSOP.version || "1.0") + 0.1}`,
          changeHistory: [
            ...(regeneratingSOP.changeHistory || []),
            {
              version: `${parseFloat(regeneratingSOP.version || "1.0") + 0.1}`,
              date: new Date().toISOString().split('T')[0],
              changedBy: currentUser?.email,
              description: `AI Regeneration: ${regeneratePrompt}`,
              approvedBy: null
            }
          ]
        }
      });
      
      setRegeneratingSOP(null);
      setRegeneratePrompt("");
    } catch (error) {
      console.error("Error regenerating SOP:", error);
      alert("Failed to regenerate SOP");
    }
    setLoadingAI(false);
  };

  const handleDownloadGeneratedSOP = () => {
    if (!generatedSOP) return;
    
    const tempSOP = {
      ...generatedSOP,
      sopNumber: `SOP-DRAFT-${Date.now().toString().slice(-6)}`,
      version: "1.0",
      status: "draft"
    };
    
    handleDownloadSOP(tempSOP);
  };

  const filteredSOPs = sops.filter(sop =>
    sop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sop.processStep?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    review: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    obsolete: "bg-red-100 text-red-800"
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const canEditSOP = (sop) => {
    if (!sop) return false;
    return isAdmin || sop.author === currentUser?.email;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            SOP Library
          </h1>
          <p className="text-gray-600 mt-1">Standard Operating Procedures & AI Generation</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">All SOPs ({sops.length})</TabsTrigger>
            <TabsTrigger value="ai-generate">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Standard Operating Procedures</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search SOPs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-500">Loading SOPs...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSOPs.map((sop) => (
                      <div
                        key={sop.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{sop.title}</h3>
                              <Badge className={statusColors[sop.status]}>
                                {sop.status}
                              </Badge>
                              {sop.aiGenerated && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {sop.sopNumber} • Version {sop.version} • {sop.processStep}
                            </p>
                            <p className="text-xs text-gray-500">
                              Author: {sop.author} • Created: {new Date(sop.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setViewingSOP(sop)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadSOP(sop)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {canEditSOP(sop) && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setEditingSOP({...sop})}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                {sop.aiGenerated && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setRegeneratingSOP(sop);
                                      setRegeneratePrompt("");
                                    }}
                                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    Regenerate
                                  </Button>
                                )}
                                {sop.status === 'draft' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleUpdateStatus(sop.id, 'approved')}
                                    disabled={updateSOPMutation.isPending}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => loadVersionHistory(sop.id)}
                                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  History
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteSOP(sop.id)}
                                  disabled={deleteSOPMutation.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {deleteSOPMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                </Button>
                                </>
                                )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSOPs.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No SOPs found</p>
                        <p className="text-sm mt-1">Use AI to generate your first SOP</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-generate">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI SOP Generator
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Describe the process and link to relevant historical data for context
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>What do you need an SOP for?</Label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Preventing bubble formation during lamination, Proper web tension setup, Oven temperature calibration procedure..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  {/* AI Suggestions */}
                  {loadingSuggestions && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <p className="text-sm text-blue-900">AI is finding relevant historical data...</p>
                      </div>
                    </div>
                  )}

                  {suggestedData && !loadingSuggestions && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">AI Suggested Relevant Data</p>
                      </div>
                      
                      {suggestedData.relevantDefects?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-green-800 mb-1">Relevant Defects:</p>
                          {suggestedData.relevantDefects.map((item, idx) => {
                            const defect = defects.find(d => d.id === item.defectId);
                            return defect ? (
                              <div key={idx} className="text-xs text-green-700 ml-2 mb-1 flex items-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1"
                                  onClick={() => setLinkedDefectId(item.defectId)}
                                >
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  {defect.defectType?.replace(/_/g, ' ')} - {item.reason}
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {suggestedData.relevantRCAs?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-green-800 mb-1">Relevant RCAs:</p>
                          {suggestedData.relevantRCAs.map((item, idx) => {
                            const rca = rcas.find(r => r.id === item.rcaId);
                            return rca ? (
                              <div key={idx} className="text-xs text-green-700 ml-2 mb-1 flex items-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1"
                                  onClick={() => setLinkedRCAId(item.rcaId)}
                                >
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  RCA-{rca.id.slice(0, 6)} - {item.reason}
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {suggestedData.relevantCAPAs?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-800 mb-1">Relevant CAPAs:</p>
                          {suggestedData.relevantCAPAs.map((item, idx) => {
                            const capa = capas.find(c => c.id === item.capaId);
                            return capa ? (
                              <div key={idx} className="text-xs text-green-700 ml-2 mb-1 flex items-start gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-1"
                                  onClick={() => setLinkedCAPAId(item.capaId)}
                                >
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  CAPA-{capa.id.slice(0, 6)} - {item.reason}
                                </Button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Link Selection */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-3">📎 Link to Historical Data</p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Defect</Label>
                        <Select value={linkedDefectId} onValueChange={setLinkedDefectId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select defect..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>No defect</SelectItem>
                            {defects.slice(0, 20).map(defect => (
                              <SelectItem key={defect.id} value={defect.id}>
                                {defect.defectType?.replace(/_/g, ' ')} - Line {defect.line}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">RCA</Label>
                        <Select value={linkedRCAId} onValueChange={setLinkedRCAId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select RCA..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>No RCA</SelectItem>
                            {rcas.slice(0, 20).map(rca => (
                              <SelectItem key={rca.id} value={rca.id}>
                                RCA-{rca.id.slice(0, 6)} - {rca.status} ({rca.rootCauses?.length || 0} causes)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">CAPA</Label>
                        <Select value={linkedCAPAId} onValueChange={setLinkedCAPAId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select CAPA..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>No CAPA</SelectItem>
                            {capas.slice(0, 20).map(capa => (
                              <SelectItem key={capa.id} value={capa.id}>
                                CAPA-{capa.id.slice(0, 6)} - {capa.approvalState}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Process Run</Label>
                        <Select value={linkedProcessRunId} onValueChange={setLinkedProcessRunId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select process run..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>No process run</SelectItem>
                            {processRuns.slice(0, 20).map(run => (
                              <SelectItem key={run.id} value={run.id}>
                                {run.productCode} - Line {run.line}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateSOP}
                    disabled={generatingAI || !aiPrompt.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating SOP...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate SOP
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generatedSOP && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Generated SOP</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDownloadGeneratedSOP}
                          variant="outline"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={handleSaveGeneratedSOP}
                          disabled={createSOPMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {createSOPMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Save SOP
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{generatedSOP.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{generatedSOP.scope}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Critical Parameters</h4>
                      <div className="space-y-2">
                        {generatedSOP.parameters?.map((param, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 rounded border">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">{param.parameter}</span>
                              {param.critical && (
                                <Badge className="bg-red-100 text-red-800">Critical</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Target: {param.target} {param.unit} | Range: {param.lowerLimit} - {param.upperLimit}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Procedure Steps</h4>
                      <div className="space-y-3">
                        {generatedSOP.procedureSteps?.map((step, idx) => (
                          <div key={idx} className="p-3 border-l-4 border-blue-500 bg-blue-50 pl-4">
                            <p className="font-medium text-sm text-gray-900">
                              Step {step.stepNumber}: {step.instruction}
                            </p>
                            {step.verificationMethod && (
                              <p className="text-xs text-gray-600 mt-1">
                                ✓ Verification: {step.verificationMethod}
                              </p>
                            )}
                            {step.cautions?.length > 0 && (
                              <div className="mt-2">
                                {step.cautions.map((caution, cidx) => (
                                  <p key={cidx} className="text-xs text-orange-700">
                                    ⚠ {caution}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {generatedSOP.checksheets?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Quality Checksheet</h4>
                        <div className="space-y-2">
                          {generatedSOP.checksheets.map((check, idx) => (
                            <div key={idx} className="p-2 bg-green-50 rounded border border-green-200">
                              <p className="font-medium text-sm">{check.checkItem}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Frequency: {check.frequency} | Acceptance: {check.acceptanceCriteria}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit SOP Dialog */}
        <Dialog open={!!editingSOP} onOpenChange={() => setEditingSOP(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit SOP</DialogTitle>
            </DialogHeader>
            {editingSOP && (
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={editingSOP.title}
                    onChange={(e) => setEditingSOP({...editingSOP, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label>SOP Number</Label>
                  <Input
                    value={editingSOP.sopNumber}
                    onChange={(e) => setEditingSOP({...editingSOP, sopNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Scope</Label>
                  <Textarea
                    value={editingSOP.scope}
                    onChange={(e) => setEditingSOP({...editingSOP, scope: e.target.value})}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Process Step</Label>
                  <Input
                    value={editingSOP.processStep}
                    onChange={(e) => setEditingSOP({...editingSOP, processStep: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Procedure Steps</Label>
                  {editingSOP.procedureSteps?.map((step, idx) => (
                    <div key={idx} className="p-3 border rounded mb-2">
                      <Label className="text-xs">Step {step.stepNumber || idx + 1}</Label>
                      <Textarea
                        value={step.instruction}
                        onChange={(e) => {
                          const updated = [...editingSOP.procedureSteps];
                          updated[idx].instruction = e.target.value;
                          setEditingSOP({...editingSOP, procedureSteps: updated});
                        }}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditingSOP(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={updateSOPMutation.isPending}>
                    {updateSOPMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Regenerate SOP Dialog */}
        <Dialog open={!!regeneratingSOP} onOpenChange={() => setRegeneratingSOP(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Regenerate SOP with AI
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <p className="text-sm font-medium text-purple-900">
                  Current SOP: {regeneratingSOP?.title}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Version {regeneratingSOP?.version} • {regeneratingSOP?.procedureSteps?.length || 0} steps
                </p>
              </div>
              <div>
                <Label>What changes would you like to make?</Label>
                <Textarea
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  placeholder="E.g., Add more safety precautions, simplify step 3, add verification methods..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRegeneratingSOP(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegenerateSOP} 
                  disabled={loadingAI || !regeneratePrompt.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Regenerate SOP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Version History Dialog */}
        <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Version History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {sopVersions.length > 0 ? (
                sopVersions.map((version, idx) => (
                  <div key={version.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-900">Version {version.versionNumber}</h4>
                          <Badge className="bg-blue-100 text-blue-800">{version.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{version.title}</p>
                        <p className="text-xs text-gray-500">
                          Changed by: {version.changedBy} • {new Date(version.created_date).toLocaleString()}
                        </p>
                        {version.changeDescription && (
                          <p className="text-xs text-gray-700 mt-2 italic">
                            📝 {version.changeDescription}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertToVersion(version)}
                        disabled={updateSOPMutation.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Revert
                      </Button>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {version.procedureSteps?.length || 0} steps • {version.parameters?.length || 0} parameters
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>No version history available</p>
                  <p className="text-sm mt-1">History is created when SOPs are edited or regenerated</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* View SOP Dialog */}
        <Dialog open={!!viewingSOP} onOpenChange={() => setViewingSOP(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewingSOP?.title}</span>
                <div className="flex gap-2">
                  {canEditSOP(viewingSOP) && viewingSOP?.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(viewingSOP.id, 'approved')}
                      disabled={updateSOPMutation.isPending}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve & Finalize
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSOP(viewingSOP)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            {viewingSOP && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">SOP Number</p>
                    <p className="font-medium">{viewingSOP.sopNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Version</p>
                    <p className="font-medium">{viewingSOP.version}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Process Step</p>
                    <p className="font-medium">{viewingSOP.processStep}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge className={statusColors[viewingSOP.status]}>
                      {viewingSOP.status}
                    </Badge>
                  </div>
                </div>

                {viewingSOP.scope && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Scope</h4>
                    <p className="text-sm text-gray-700">{viewingSOP.scope}</p>
                  </div>
                )}

                {viewingSOP.materialsTools?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Materials & Tools</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {viewingSOP.materialsTools.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingSOP.parameters?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Critical Parameters</h4>
                    <div className="space-y-2">
                      {viewingSOP.parameters.map((param, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded border">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{param.parameter}</span>
                            {param.critical && (
                              <Badge className="bg-red-100 text-red-800">Critical</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Target: {param.target} {param.unit} | Range: {param.lowerLimit} - {param.upperLimit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingSOP.procedureSteps?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Procedure Steps</h4>
                    <div className="space-y-3">
                      {viewingSOP.procedureSteps.map((step, idx) => (
                        <div key={idx} className="p-3 border-l-4 border-blue-500 bg-blue-50 pl-4">
                          <p className="font-medium text-sm text-gray-900">
                            Step {step.stepNumber}: {step.instruction}
                          </p>
                          {step.verificationMethod && (
                            <p className="text-xs text-gray-600 mt-1">
                              ✓ Verification: {step.verificationMethod}
                            </p>
                          )}
                          {step.cautions?.length > 0 && (
                            <div className="mt-2">
                              {step.cautions.map((caution, cidx) => (
                                <p key={cidx} className="text-xs text-orange-700">
                                  ⚠ {caution}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingSOP.checksheets?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Quality Checksheet</h4>
                    <div className="space-y-2">
                      {viewingSOP.checksheets.map((check, idx) => (
                        <div key={idx} className="p-2 bg-green-50 rounded border border-green-200">
                          <p className="font-medium text-sm">{check.checkItem}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Frequency: {check.frequency} | Acceptance: {check.acceptanceCriteria}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}