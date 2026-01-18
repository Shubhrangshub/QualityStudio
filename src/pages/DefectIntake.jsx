import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, Upload, AlertCircle, CheckCircle2, Loader2, 
  FileText, Image as ImageIcon, Video, Sparkles, AlertTriangle 
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ImageUploader from "../components/defect/ImageUploader";
import DefectList from "../components/defect/DefectList";
import AIClassification from "../components/defect/AIClassification";
import RelatedDocuments from "../components/knowledge/RelatedDocuments";
import DefectInsights from "../components/defect/DefectInsights";
import TraceabilityDiagram from "../components/traceability/TraceabilityDiagram";

const DEFAULT_DEFECT_TYPES = [
  "bubbles_voids", "delamination", "fisheyes", "gels_contamination",
  "haze", "orange_peel", "streaks_banding", "scratches",
  "curl", "blocking", "telescoping", "optical_distortion", "adhesive_ooze"
];

const SEVERITY_LEVELS = ["critical", "major", "minor"];
const INSPECTION_METHODS = ["visual", "microscope", "inline_camera", "manual_measurement", "automated_scanner"];

export default function DefectIntake() {
  // Check if coming from dashboard with critical filter
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');
  
  const [activeTab, setActiveTab] = useState(filterParam === 'critical' ? 'list' : 'new');
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    dateTime: new Date().toISOString().slice(0, 16),
    line: "",
    lane: "", // Renamed to 'block' in UI, but variable name remains 'lane'
    webPositionMD: "",
    webPositionCD: "",
    shift: "",
    productCode: "",
    filmStack: "",
    srcType: "", // NEW FIELD
    tsType: "", // NEW FIELD
    filmForDyed: "", // NEW FIELD
    filmForDyedDetails: "", // NEW FIELD
    adhesiveType: "",
    linkedComplaintId: "", // Link to QFIR/Complaint
    releaseLiner: "",
    operator: "",
    defectType: "",
    severity: "major",
    inspectionMethod: "visual",
    immediateAction: "",
    assignedTo: "",
    images: [],
    videos: []
  });
  const [isUploading, setIsUploading] = useState(false);
  const [aiClassifying, setAiClassifying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // NEW: AI Insights state
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [defectInsights, setDefectInsights] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [createdDefectId, setCreatedDefectId] = useState(null);

  const queryClient = useQueryClient();

  const { data: defects = [] } = useQuery({
    queryKey: ['defects'],
    queryFn: () => base44.entities.DefectTicket.list("-created_date", 50),
  });

  const { data: pendingQFIRs = [] } = useQuery({
    queryKey: ['pending-qfirs-defect'],
    queryFn: () => base44.entities.CustomerComplaint.filter({ status: "pending_qfir" }, "-dateLogged", 20),
  });

  // Fetch all complaints for linking (not just pending)
  const { data: allComplaints = [] } = useQuery({
    queryKey: ['all-complaints-for-linking'],
    queryFn: () => base44.entities.CustomerComplaint.list("-dateLogged", 100),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-for-traceability'],
    queryFn: () => base44.entities.RCARecord.list("-created_date", 100),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-for-traceability'],
    queryFn: () => base44.entities.CAPAPlan.list("-created_date", 100),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => base44.entities.User.list(),
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        // Read user from localStorage instead of Base44
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Filter defects based on URL parameter
  const displayedDefects = filterParam === 'critical' 
    ? defects.filter(d => d.severity === 'critical' && d.status !== 'closed')
    : defects;

  // NEW: Load material options
  const { data: materialOptions = [] } = useQuery({
    queryKey: ['material-options'],
    queryFn: () => base44.entities.MaterialOption.filter({ isActive: true }),
  });

  const srcTypes = materialOptions.filter(m => m.category === 'srcType');
  const tsTypes = materialOptions.filter(m => m.category === 'tsType');
  const filmForDyedOptions = materialOptions.filter(m => m.category === 'filmForDyed');
  const adhesiveTypes = materialOptions.filter(m => m.category === 'adhesiveType');
  const customDefectTypes = materialOptions.filter(m => m.category === 'defectType');
  
  // Combine default defect types with custom ones from database
  const allDefectTypes = [
    ...DEFAULT_DEFECT_TYPES,
    ...customDefectTypes.map(d => d.value).filter(v => !DEFAULT_DEFECT_TYPES.includes(v))
  ];

  // State for adding new defect type
  const [newDefectType, setNewDefectType] = useState("");
  const [addingDefectType, setAddingDefectType] = useState(false);

  const handleAddDefectType = async () => {
    if (!newDefectType.trim()) return;
    setAddingDefectType(true);
    try {
      const formattedValue = newDefectType.trim().toLowerCase().replace(/\s+/g, '_');
      await base44.entities.MaterialOption.create({
        category: 'defectType',
        value: formattedValue,
        isActive: true
      });
      queryClient.invalidateQueries({ queryKey: ['material-options'] });
      setFormData({...formData, defectType: formattedValue});
      setNewDefectType("");
    } catch (error) {
      console.error("Error adding defect type:", error);
    }
    setAddingDefectType(false);
  };

  const createDefectMutation = useMutation({
    mutationFn: async (data) => {
      // If linked to complaint, use complaint ticket# as anchor
      let ticketId = null;
      if (data.linkedComplaintId) {
        const complaint = allComplaints.find(c => c.id === data.linkedComplaintId);
        ticketId = complaint?.ticketNumber || await generateTicketId(data.line);
      } else {
        ticketId = await generateTicketId(data.line);
      }
      return base44.entities.DefectTicket.create({ ...data, ticketId });
    },
    onSuccess: async (createdDefect) => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      setSuccess(true);
      setCreatedDefectId(createdDefect.id);
      
      // Auto-generate AI insights
      await generateDefectInsights(createdDefect);
      
      // Don't reset form immediately - let user see insights first
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }
  });

  const generateTicketId = async (line) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 25 for 2025
    const monthLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const month = monthLetters[now.getMonth()]; // A-L for Jan-Dec
    
    // Find or create counter for this year/month/line
    const counterKey = `${year}${month}${line}`;
    const counters = await base44.entities.TicketCounter.filter({ 
      year: parseInt('20' + year), 
      month, 
      line 
    });
    
    let sequence = 1;
    if (counters.length > 0) {
      const counter = counters[0];
      sequence = (counter.lastSequence || 0) + 1;
      await base44.entities.TicketCounter.update(counter.id, { lastSequence: sequence });
    } else {
      await base44.entities.TicketCounter.create({ 
        year: parseInt('20' + year), 
        month, 
        line, 
        lastSequence: 1 
      });
    }
    
    return `${year}${month}${line}${sequence.toString().padStart(5, '0')}`;
  };

  // NEW: Generate AI Insights for new defect
  const generateDefectInsights = async (defect) => {
    setGeneratingInsights(true);
    
    try {
      // Get all historical data
      const allDefects = await base44.entities.DefectTicket.list("-created_date", 50);
      const allRCAs = await base44.entities.RCARecord.list("-created_date", 30);
      const allCAPAs = await base44.entities.CAPAPlan.list("-created_date", 30);
      const allDoEs = await base44.entities.DoE.list("-created_date", 20);
      const allProcessRuns = await base44.entities.ProcessRun.list("-dateTimeStart", 30);

      // Find similar defects
      const similarDefects = allDefects.filter(d => 
        d.id !== defect.id && // Exclude the current defect
        (d.defectType === defect.defectType ||
         (d.line && d.line === defect.line) ||
         (d.productCode && d.productCode === defect.productCode))
      );

      // Find related RCAs
      const relatedRCAs = allRCAs.filter(rca => {
        const rcaDefect = allDefects.find(d => d.id === rca.defectTicketId);
        return rcaDefect && (
          (rcaDefect.defectType && rcaDefect.defectType === defect.defectType) ||
          (rcaDefect.line && rcaDefect.line === defect.line)
        );
      });

      // Find related CAPAs
      const relatedCAPAs = allCAPAs.filter(capa => {
        const capaDefect = allDefects.find(d => d.id === capa.defectTicketId);
        return capaDefect && (
          (capaDefect.defectType && capaDefect.defectType === defect.defectType) ||
          (capaDefect.line && capaDefect.line === defect.line)
        );
      });

      // Find related DoEs
      const relatedDoEs = allDoEs.filter(doe => {
        const doeDefect = allDefects.find(d => d.id === doe.relatedDefectId);
        return doeDefect && (
          (doeDefect.defectType && doeDefect.defectType === defect.defectType) ||
          (doeDefect.line && doeDefect.line === defect.line)
        );
      });

      // Find process run at time of defect
      let processRunAtDefect = null;
      if (defect.line && defect.dateTime) {
        const defectTime = new Date(defect.dateTime).getTime();
        processRunAtDefect = allProcessRuns.find(r => 
          r.line === defect.line &&
          r.dateTimeStart && r.dateTimeEnd &&
          defectTime >= new Date(r.dateTimeStart).getTime() &&
          defectTime <= new Date(r.dateTimeEnd).getTime()
        );
      }

      // Use AI to analyze and suggest root causes
      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze NEW defect:
Type: ${defect.defectType?.replace(/_/g, ' ')}
Severity: ${defect.severity}
Line: ${defect.line}
Product: ${defect.productCode}

PROCESS AT DEFECT:
${processRunAtDefect ? `Speed: ${processRunAtDefect.lineSpeed}m/min, Pressure: ${processRunAtDefect.nipPressure}bar` : 'N/A'}

HISTORICAL: ${similarDefects.length} similar, ${relatedRCAs.length} RCAs, ${relatedCAPAs.length} CAPAs

Provide:
1. Top 5 root causes (Man/Machine/Material/Method/Environment/Measurement)
2. Investigation steps
3. Parameter anomalies
4. Quick wins`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestedRootCauses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause: { type: "string" },
                  likelihood: { type: "number", minimum: 0, maximum: 1 },
                  category: { 
                    type: "string",
                    enum: ["Man", "Machine", "Material", "Method", "Environment", "Measurement", "Unknown"]
                  },
                  historicalEvidence: { type: "string" }
                },
                required: ["cause", "likelihood", "category"]
              }
            },
            suggestedInvestigations: {
              type: "array",
              items: { type: "string" }
            },
            parameterAnomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  expectedRange: { type: "string" },
                  suspectedIssue: { type: "string" }
                },
                required: ["parameter", "suspectedIssue"]
              }
            },
            quickWins: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  successRate: { type: "string" }, // e.g., "high", "medium", "low" or "70%"
                  implementationTime: { type: "string" } // e.g., "immediate", "within 1 hour", "within shift"
                },
                required: ["action"]
              }
            }
          },
          required: ["suggestedRootCauses", "suggestedInvestigations"]
        }
      });

      // Store insights with the defect
      const insights = {
        ...aiAnalysis,
        similarDefectIds: similarDefects.slice(0, 10).map(d => d.id),
        relatedRCAIds: relatedRCAs.slice(0, 10).map(r => r.id),
        relatedCAPAIds: relatedCAPAs.slice(0, 10).map(c => c.id),
        relatedDoEIds: relatedDoEs.slice(0, 10).map(d => d.id),
        generatedAt: new Date().toISOString()
      };

      // Update the defect with insights
      await base44.entities.DefectTicket.update(defect.id, {
        aiInsights: insights
      });

      setDefectInsights(insights);
      setHistoricalData({
        similarDefects: similarDefects.slice(0, 10),
        relatedRCAs: relatedRCAs.slice(0, 10),
        relatedCAPAs: relatedCAPAs.slice(0, 10),
        relatedDoEs: relatedDoEs.slice(0, 10)
      });

    } catch (error) {
      console.error("Error generating insights:", error);
      // Optionally, set an error state for the user
    }
    
    setGeneratingInsights(false);
  };

  const handleResetForm = () => {
    setFormData({
      dateTime: new Date().toISOString().slice(0, 16),
      line: "",
      lane: "",
      webPositionMD: "",
      webPositionCD: "",
      shift: "",
      productCode: "",
      filmStack: "",
      srcType: "", // Reset new field
      tsType: "", // Reset new field
      filmForDyed: "", // Reset new field
      filmForDyedDetails: "", // Reset new field
      adhesiveType: "",
      linkedComplaintId: "",
      releaseLiner: "",
      operator: "",
      defectType: "",
      severity: "major",
      inspectionMethod: "visual",
      immediateAction: "",
      assignedTo: "",
      images: [],
      videos: []
    });
    setAiResult(null);
    setDefectInsights(null);
    setHistoricalData(null);
    setCreatedDefectId(null);
    setSuccess(false); // Reset success message
    setActiveTab("new"); // Ensure we go back to the new defect tab
  };

  const handleImageUpload = async (files) => {
    setIsUploading(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    setIsUploading(false);

    // Trigger AI classification if we have images
    if (uploadedUrls.length > 0 && !aiResult) {
      handleAIClassification(uploadedUrls[0]);
    }
  };

  const handleAIClassification = async (imageUrl) => {
    setAiClassifying(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this defect image from a window film/PPF lamination process. 
        Identify the defect type from: ${DEFECT_TYPES.join(', ')}.
        Also suggest 3 quick checks or parameter adjustments to try.
        Be specific and technical.`,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            defectType: { type: "string" },
            confidence: { type: "number" },
            quickChecks: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" }
          }
        }
      });

      setAiResult(result);
      if (result.defectType && result.confidence > 0.6) {
        setFormData(prev => ({ 
          ...prev, 
          defectType: result.defectType,
          aiClassification: result
        }));
      }
    } catch (error) {
      console.error("AI classification error:", error);
    }
    setAiClassifying(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    createDefectMutation.mutate({
      ...formData,
      webPositionMD: formData.webPositionMD ? parseFloat(formData.webPositionMD) : undefined,
      webPositionCD: formData.webPositionCD ? parseFloat(formData.webPositionCD) : undefined,
      status: "open",
      aiClassification: aiResult
    });
  };

  const isAdmin = (currentUser?.customRole || currentUser?.role)?.toLowerCase() === 'admin';
  const isLoading = currentUser === null;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Defect Intake</h1>
          <p className="text-gray-600 mt-1">Report and track quality defects</p>
        </div>

        {!isLoading && !isAdmin && (
          <Alert className="mb-6 bg-orange-50 border-orange-300">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Admin Access Only:</strong> Only administrators can create new defect tickets. 
              If you need to report a defect, please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Defect ticket created successfully! AI is analyzing and finding similar cases...
            </AlertDescription>
          </Alert>
        )}

        {/* NEW: AI Insights after defect creation */}
        {generatingInsights && (
          <Card className="mb-6 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900">
                    🤖 AI is analyzing your defect and generating insights...
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Finding similar cases, suggesting root causes, and identifying related investigations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {defectInsights && !generatingInsights && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-purple-600" />
                AI Investigation Assistant
              </h2>
              <Button onClick={handleResetForm} variant="outline">
                Create Another Defect
              </Button>
            </div>
            <DefectInsights 
              insights={defectInsights}
              defect={defects.find(d => d.id === createdDefectId)}
              historicalData={historicalData}
            />
          </div>
        )}

        {!defectInsights && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="new">New Defect</TabsTrigger>
              <TabsTrigger value="list">
                {filterParam === 'critical' 
                  ? `Critical Defects (${displayedDefects.length})` 
                  : `All Defects (${defects.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new">
              {isLoading ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading...</p>
                  </CardContent>
                </Card>
              ) : !isAdmin ? (
                <Card className="border-orange-300 bg-orange-50">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-orange-900 mb-2">
                      Admin Access Required
                    </h3>
                    <p className="text-orange-800 mb-4">
                      Only administrators can create new defect tickets. Please contact your administrator to report defects.
                    </p>
                    <Link to={createPageUrl("Dashboard")}>
                      <Button variant="outline">
                        Back to Dashboard
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Image Upload */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-blue-600" />
                          Defect Images/Videos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ImageUploader 
                          onUpload={handleImageUpload}
                          isUploading={isUploading}
                          images={formData.images}
                          onRemove={(idx) => setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx)
                          }))}
                        />
                      </CardContent>
                    </Card>

                    {/* AI Classification */}
                    {(aiClassifying || aiResult) && (
                      <AIClassification 
                        isLoading={aiClassifying}
                        result={aiResult}
                      />
                    )}

                    {/* Link to QFIR/Complaint with Enhanced Display */}
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                          <FileText className="w-5 h-5" />
                          Link to Customer Complaint (Optional)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Select QFIR/Complaint to Link</Label>
                          <Select 
                            value={formData.linkedComplaintId || ""} 
                            onValueChange={(val) => setFormData({...formData, linkedComplaintId: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a complaint to link (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>No Link</SelectItem>
                              {allComplaints.map(complaint => (
                                <SelectItem key={complaint.id} value={complaint.id}>
                                  {complaint.ticketNumber} - {complaint.customerName} ({complaint.status?.replace(/_/g, ' ')})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-orange-700 mt-2">
                            Linking creates traceability: Complaint → QFIR → Defect → RCA → CAPA
                          </p>
                        </div>

                        {/* Show QFIR Details if linked */}
                        {formData.linkedComplaintId && (() => {
                          const linkedComplaint = allComplaints.find(c => c.id === formData.linkedComplaintId);
                          if (!linkedComplaint) return null;
                          
                          return (
                            <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                              <h4 className="font-semibold text-gray-900 mb-3">Linked Complaint Details</h4>
                              
                              <div className="space-y-2 text-sm">
                                <div className="grid md:grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-gray-600">Customer:</span>
                                    <span className="ml-2 font-medium">{linkedComplaint.customerName}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Film Type:</span>
                                    <span className="ml-2 font-medium">{linkedComplaint.filmType}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-600">Issue:</span>
                                    <span className="ml-2 font-medium">{linkedComplaint.issueDescription}</span>
                                  </div>
                                </div>

                                {linkedComplaint.qfirData && (
                                  <>
                                    <div className="pt-3 border-t mt-3">
                                      <Badge className="bg-blue-100 text-blue-800 mb-2">QFIR Completed</Badge>
                                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                                        {linkedComplaint.qfirData.pname && (
                                          <div><strong>Pname:</strong> {linkedComplaint.qfirData.pname}</div>
                                        )}
                                        {linkedComplaint.qfirData.dateOfComplaint && (
                                          <div><strong>Complaint Date:</strong> {linkedComplaint.qfirData.dateOfComplaint}</div>
                                        )}
                                        {linkedComplaint.qfirData.sampleSentByCustomer && (
                                          <div><strong>Sample Sent:</strong> {linkedComplaint.qfirData.sampleSentByCustomer}</div>
                                        )}
                                        {linkedComplaint.qfirData.counterSampleAvailable && (
                                          <div><strong>Counter Sample:</strong> {linkedComplaint.qfirData.counterSampleAvailable}</div>
                                        )}
                                      </div>

                                      {linkedComplaint.qfirData.rollsData && linkedComplaint.qfirData.rollsData.length > 0 && (
                                        <div className="mt-3 p-2 bg-gray-50 rounded border">
                                          <p className="font-medium text-xs mb-2">Rolls ({linkedComplaint.qfirData.rollsData.length})</p>
                                          {linkedComplaint.qfirData.rollsData.map((roll, idx) => (
                                            <div key={idx} className="text-xs mb-1">
                                              {roll.rollNo || `Roll ${idx + 1}`}: {roll.sizeOfRoll} - {roll.qtyInvolveLsf} Lsf
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {linkedComplaint.qfirData.productionDetails && (
                                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                                          <p className="font-medium text-xs mb-2">Production Details</p>
                                          <div className="grid grid-cols-2 gap-1 text-xs">
                                            {linkedComplaint.qfirData.productionDetails.cNo && (
                                              <div>C No: {linkedComplaint.qfirData.productionDetails.cNo}</div>
                                            )}
                                            {linkedComplaint.qfirData.productionDetails.lineSpeed && (
                                              <div>Line Speed: {linkedComplaint.qfirData.productionDetails.lineSpeed}</div>
                                            )}
                                            {linkedComplaint.qfirData.productionDetails.psBatch && (
                                              <div>PS Batch: {linkedComplaint.qfirData.productionDetails.psBatch}</div>
                                            )}
                                            {linkedComplaint.qfirData.productionDetails.tsBatch && (
                                              <div>TS Batch: {linkedComplaint.qfirData.productionDetails.tsBatch}</div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}

                                {linkedComplaint.allocatedTo && (
                                  <div className="text-xs pt-2 border-t">
                                    <strong>Allocated To:</strong> {linkedComplaint.allocatedTo}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Defect Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Date & Time *</Label>
                            <Input
                              type="datetime-local"
                              value={formData.dateTime}
                              onChange={(e) => setFormData({...formData, dateTime: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <Label>Production Line *</Label>
                            <Input
                              value={formData.line}
                              onChange={(e) => setFormData({...formData, line: e.target.value})}
                              placeholder="e.g., Line 1, Line 2"
                              required
                            />
                          </div>
                          <div>
                            <Label>Block</Label>
                            <Input
                              value={formData.lane}
                              onChange={(e) => setFormData({...formData, lane: e.target.value})}
                              placeholder="e.g., Block A"
                            />
                          </div>
                          <div>
                            <Label>Shift *</Label>
                            <Select value={formData.shift} onValueChange={(val) => setFormData({...formData, shift: val})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shift" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">Shift A</SelectItem>
                                <SelectItem value="B">Shift B</SelectItem>
                                <SelectItem value="C">Shift C</SelectItem>
                                <SelectItem value="D">Shift D</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Web Position MD (m)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.webPositionMD}
                              onChange={(e) => setFormData({...formData, webPositionMD: e.target.value})}
                              placeholder="Machine direction"
                            />
                          </div>
                          <div>
                            <Label>Web Position CD (mm)</Label>
                            <Input
                              type="number"
                              step="1"
                              value={formData.webPositionCD}
                              onChange={(e) => setFormData({...formData, webPositionCD: e.target.value})}
                              placeholder="Cross direction"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Product & Material Info */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Product & Material Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Product Code *</Label>
                            <Input
                              value={formData.productCode}
                              onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                              placeholder="e.g., WF-2024-001"
                              required
                            />
                          </div>
                          <div>
                            <Label>Operator *</Label>
                            <Input
                              value={formData.operator}
                              onChange={(e) => setFormData({...formData, operator: e.target.value})}
                              placeholder="Operator name"
                              required
                            />
                          </div>
                          <div>
                            <Label>Film Stack</Label>
                            <Input
                              value={formData.filmStack}
                              onChange={(e) => setFormData({...formData, filmStack: e.target.value})}
                              placeholder="e.g., PET/Adhesive/Liner"
                            />
                          </div>
                          <div>
                            <Label>SRC Type</Label>
                            <Select value={formData.srcType} onValueChange={(val) => setFormData({...formData, srcType: val})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select SRC Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {srcTypes.map(type => (
                                  <SelectItem key={type.id} value={type.value}>
                                    {type.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>TS Type</Label>
                            <Select value={formData.tsType} onValueChange={(val) => setFormData({...formData, tsType: val})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select TS Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {tsTypes.map(type => (
                                  <SelectItem key={type.id} value={type.value}>
                                    {type.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Adhesive Type</Label>
                            <Select value={formData.adhesiveType} onValueChange={(val) => setFormData({...formData, adhesiveType: val})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Adhesive Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {adhesiveTypes.map(type => (
                                  <SelectItem key={type.id} value={type.value}>
                                    {type.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Film for Dyed</Label>
                            <Select value={formData.filmForDyed} onValueChange={(val) => setFormData({...formData, filmForDyed: val})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Film Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {filmForDyedOptions.map(type => (
                                  <SelectItem key={type.id} value={type.value}>
                                    {type.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.filmForDyed && (
                            <div>
                              <Label>Film for Dyed - Details</Label>
                              <Input
                                value={formData.filmForDyedDetails}
                                onChange={(e) => setFormData({...formData, filmForDyedDetails: e.target.value})}
                                placeholder="Enter details..."
                              />
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <Label>Release Liner</Label>
                            <Input
                              value={formData.releaseLiner}
                              onChange={(e) => setFormData({...formData, releaseLiner: e.target.value})}
                              placeholder="e.g., PET 50μm silicone"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Defect Classification */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Defect Classification</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Defect Type *</Label>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  value={formData.defectType ? formData.defectType.replace(/_/g, ' ') : newDefectType}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Check if it matches an existing type
                                    const matchedType = allDefectTypes.find(t => 
                                      t.replace(/_/g, ' ').toLowerCase() === value.toLowerCase()
                                    );
                                    if (matchedType) {
                                      setFormData({...formData, defectType: matchedType});
                                      setNewDefectType("");
                                    } else {
                                      setFormData({...formData, defectType: ""});
                                      setNewDefectType(value);
                                    }
                                  }}
                                  placeholder="Type or select defect type"
                                  list="defect-types-list"
                                  required
                                />
                                <datalist id="defect-types-list">
                                  {allDefectTypes.map(type => (
                                    <option key={type} value={type.replace(/_/g, ' ')} />
                                  ))}
                                </datalist>
                              </div>
                              {newDefectType && !allDefectTypes.some(t => 
                                t.replace(/_/g, ' ').toLowerCase() === newDefectType.toLowerCase()
                              ) && (
                                <Button 
                                  type="button"
                                  onClick={handleAddDefectType}
                                  disabled={addingDefectType}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {addingDefectType ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Type to search or add new defect type</p>
                          </div>
                          <div>
                            <Label>Severity *</Label>
                            <Select value={formData.severity} onValueChange={(val) => setFormData({...formData, severity: val})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SEVERITY_LEVELS.map(level => (
                                  <SelectItem key={level} value={level}>
                                    {level}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Inspection Method</Label>
                            <Select value={formData.inspectionMethod} onValueChange={(val) => setFormData({...formData, inspectionMethod: val})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INSPECTION_METHODS.map(method => (
                                  <SelectItem key={method} value={method}>
                                    {method.replace(/_/g, ' ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Immediate Action Taken</Label>
                          <Textarea
                            value={formData.immediateAction}
                            onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
                            placeholder="Describe any immediate containment actions..."
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Assign To (Delegate) *</Label>
                          <Select value={formData.assignedTo} onValueChange={(val) => setFormData({...formData, assignedTo: val})} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user to assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.email}>
                                  {user.full_name} ({user.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Assign this defect to a user for investigation
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Traceability Flow */}
                    {formData.linkedComplaintId && (() => {
                      const linkedComplaint = allComplaints.find(c => c.id === formData.linkedComplaintId);
                      const linkedDefect = defects.find(d => d.linkedComplaintId === formData.linkedComplaintId);
                      const linkedRCA = rcas.find(r => r.defectTicketId === linkedDefect?.id);
                      const linkedCAPA = capas.find(c => c.defectTicketId === linkedDefect?.id);
                      
                      return (
                        <TraceabilityDiagram 
                          complaint={linkedComplaint}
                          defect={linkedDefect}
                          rca={linkedRCA}
                          capa={linkedCAPA}
                        />
                      );
                    })()}

                    {/* NEW: Related Documents */}
                    {(formData.defectType || aiResult) && (
                      <RelatedDocuments 
                        context={{ 
                          type: 'defect', 
                          data: {
                            defectType: formData.defectType || aiResult?.defectType,
                            severity: formData.severity,
                            line: formData.line,
                            productCode: formData.productCode,
                            immediateAction: formData.immediateAction
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    <Card className="sticky top-6">
                      <CardHeader>
                        <CardTitle className="text-lg">Submit Defect</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={createDefectMutation.isPending || generatingInsights}
                        >
                          {createDefectMutation.isPending || generatingInsights ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Create Ticket
                            </>
                          )}
                        </Button>

                        <div className="pt-4 border-t space-y-2">
                          <p className="text-sm font-medium text-gray-700">Quick Info</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>• AI will classify defects automatically</p>
                            <p>• Critical defects trigger immediate RCA</p>
                            <p>• Upload clear images for better results</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
              )}
            </TabsContent>

            <TabsContent value="list">
              {filterParam === 'critical' && (
                <Alert className="mb-4 bg-red-50 border-red-300">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>Critical Defects Filter Active:</strong> Showing {displayedDefects.length} critical defect(s) that require immediate attention
                  </AlertDescription>
                </Alert>
              )}
              <DefectList defects={displayedDefects} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}