import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, UserPlus, Plus, X, 
  ArrowRight, Clock, TrendingUp, Users, Activity, Database, FileCheck, Eye, Download, RefreshCw
} from "lucide-react";
import { downloadCAPAReport } from "../components/capa/CAPAExporter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SAPSyncButton from "../components/sap/SAPSyncButton";
import QFIRAnalytics from "../components/qfir/QFIRAnalytics";
import QFIRPDFExporter from "../components/qfir/QFIRPDFExporter";
import TraceabilityDiagram from "../components/traceability/TraceabilityDiagram";

export default function QFIRForm() {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [qfirData, setQfirData] = useState({});
  const [allocatedTo, setAllocatedTo] = useState("");
  const [viewingComplaint, setViewingComplaint] = useState(null);
  const [activeView, setActiveView] = useState("pipeline");
  const [fillingQFIR, setFillingQFIR] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const queryClient = useQueryClient();

  const { data: allPendingComplaints = [] } = useQuery({
    queryKey: ['pending-complaints'],
    queryFn: () => base44.entities.CustomerComplaint.filter({ status: "pending_qfir" }, "-dateLogged", 50),
  });

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const isSales = currentUser?.customRole?.toLowerCase() === 'sales' || currentUser?.role?.toLowerCase() === 'sales';
  const canEdit = !isSales; // Sales can only view, not edit

  // Filter complaints based on user role
  const pendingComplaints = React.useMemo(() => {
    if (isAdmin) return allPendingComplaints; // Admin sees all
    // Regular users see only their assigned QFIRs
    return allPendingComplaints.filter(c => c.allocatedTo === currentUser?.email);
  }, [allPendingComplaints, isAdmin, currentUser]);

  const { data: allComplaints = [] } = useQuery({
    queryKey: ['all-qfir-complaints'],
    queryFn: () => base44.entities.CustomerComplaint.list("-dateLogged", 200),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-for-qfir'],
    queryFn: () => base44.entities.RCARecord.list("-created_date", 100),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-for-qfir'],
    queryFn: () => base44.entities.CAPAPlan.list("-created_date", 100),
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-for-qfir'],
    queryFn: () => base44.entities.DefectTicket.list("-created_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-allocation'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateComplaintMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomerComplaint.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
      setSelectedComplaint(null);
      setQfirData({});
      setAllocatedTo("");
    }
  });

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      // Fetch Closed CAPAs
      const closedCapas = await base44.entities.CAPAPlan.filter({ approvalState: "closed" }, "-created_date", 200);
      const closedCapaIds = new Set(closedCapas.map(c => c.id));
      
      // Maps to find triggers
      const defectToCapa = {};
      const rcaToCapa = {};
      
      // Helper to close defect
      const closeDefect = async (defectId) => {
        try {
          const defects = await base44.entities.DefectTicket.filter({ id: defectId });
          if (defects.length > 0 && defects[0].status !== 'closed') {
            await base44.entities.DefectTicket.update(defectId, { status: 'closed' });
          }
        } catch (e) { console.error("Error closing defect", e); }
      };

      // 1. Build Lookup Maps from Closed CAPAs
      for (const capa of closedCapas) {
        if (capa.defectTicketId) {
          defectToCapa[capa.defectTicketId] = capa;
          await closeDefect(capa.defectTicketId); // Ensure linked defect is closed
        }
        if (capa.rcaId) rcaToCapa[capa.rcaId] = capa;
      }

      let updatedCount = 0;

      // 2. "Reverse" Scan: Iterate ALL Open Complaints
      const allComplaints = await base44.entities.CustomerComplaint.list("-dateLogged", 500);
      const openComplaints = allComplaints.filter(c => c.status !== 'closed');

      for (const complaint of openComplaints) {
        let shouldClose = false;
        let closingSource = "";

        // A. Direct Link to Closed CAPA
        if (complaint.linkedCAPAId && closedCapaIds.has(complaint.linkedCAPAId)) {
          shouldClose = true;
          closingSource = `CAPA ${complaint.linkedCAPAId}`;
        }

        // B. Linked to Defect that has Closed CAPA
        if (!shouldClose && complaint.linkedDefectId && defectToCapa[complaint.linkedDefectId]) {
          shouldClose = true;
          closingSource = `Defect ${complaint.linkedDefectId} (via CAPA ${defectToCapa[complaint.linkedDefectId].id})`;
        }

        // C. Linked to RCA that has Closed CAPA
        if (!shouldClose && complaint.linkedRCAId && rcaToCapa[complaint.linkedRCAId]) {
          shouldClose = true;
          closingSource = `RCA ${complaint.linkedRCAId} (via CAPA ${rcaToCapa[complaint.linkedRCAId].id})`;
        }

        if (shouldClose) {
           await base44.entities.CustomerComplaint.update(complaint.id, { 
             status: 'closed',
             closedDate: new Date().toISOString(),
             closureNotes: `Auto-reconciled: Linked to closed ${closingSource}`
           });
           updatedCount++;
           
           // Double check: If complaint has a linked defect we didn't know about, close it too
           if (complaint.linkedDefectId) await closeDefect(complaint.linkedDefectId);
        }
      }

      // 3. "Forward" Scan: Iterate Closed CAPAs to find unlinked complaints via Defect (fallback)
      for (const capa of closedCapas) {
         if (capa.defectTicketId) {
            // Find complaints that point to this defect but weren't caught in step 2 (e.g. if we missed them)
            // Or check complaints that the DEFECT points to (forward link)
            try {
                const defectArr = await base44.entities.DefectTicket.filter({ id: capa.defectTicketId });
                if (defectArr.length > 0 && defectArr[0].linkedComplaintId) {
                    const complaintId = defectArr[0].linkedComplaintId;
                    // Check if this complaint is still open
                    const targetComplaints = await base44.entities.CustomerComplaint.filter({ id: complaintId });
                    if (targetComplaints.length > 0 && targetComplaints[0].status !== 'closed') {
                        await base44.entities.CustomerComplaint.update(complaintId, {
                             status: 'closed',
                             closedDate: new Date().toISOString(),
                             closureNotes: `Auto-reconciled via Defect link from CAPA ${capa.id}`
                        });
                        updatedCount++;
                    }
                }
            } catch (e) { console.error("Forward scan error", e); }
         }
      }

      return updatedCount;
    },
    onSuccess: (count) => {
      alert(`Reconciliation complete. Synced ${count} records.`);
      queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
    }
  });

  const deleteComplaintChainMutation = useMutation({
    mutationFn: async (complaintId) => {
      // Find linked defect
      const defects = await base44.entities.DefectTicket.filter({ id: complaintId });
      
      for (const defect of defects) {
        // Find and delete linked RCAs
        const rcas = await base44.entities.RCARecord.filter({ defectTicketId: defect.id });
        for (const rca of rcas) {
          await base44.entities.RCARecord.delete(rca.id);
        }
        
        // Find and delete linked CAPAs
        const capas = await base44.entities.CAPAPlan.filter({ defectTicketId: defect.id });
        for (const capa of capas) {
          // Delete linked SOPs
          if (capa.linkedSOPIds) {
            for (const sopId of capa.linkedSOPIds) {
              await base44.entities.SOP.delete(sopId);
            }
          }
          await base44.entities.CAPAPlan.delete(capa.id);
        }
        
        // Find and delete linked DoEs
        const does = await base44.entities.DoE.filter({ relatedDefectId: defect.id });
        for (const doe of does) {
          await base44.entities.DoE.delete(doe.id);
        }
        
        // Delete defect
        await base44.entities.DefectTicket.delete(defect.id);
      }
      
      // Finally delete the complaint
      await base44.entities.CustomerComplaint.delete(complaintId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
      setViewingComplaint(null);
    }
  });

  const handleDeleteComplaintChain = async (complaint) => {
    if (!window.confirm(`⚠️ DELETE ENTIRE CHAIN?\n\nThis will permanently delete:\n- Complaint ${complaint.ticketNumber}\n- All linked Defects\n- All linked RCAs\n- All linked CAPAs\n- All linked DoEs\n- All linked SOPs\n\nThis action CANNOT be undone. Continue?`)) {
      return;
    }
    
    deleteComplaintChainMutation.mutate(complaint.id);
  };

  const handleDownloadReport = async (complaint, e) => {
    e.stopPropagation();
    const capa = getLinkedCAPA(complaint.id);
    if (!capa) return;

    // Fetch missing details for full report
    let defect = null;
    if (capa.defectTicketId) {
      const defects = await base44.entities.DefectTicket.filter({ id: capa.defectTicketId });
      defect = defects[0];
    }

    const rca = getLinkedRCA(complaint.id);
    
    downloadCAPAReport(capa, defect, rca, complaint);
  };

  const assignQFIRMutation = useMutation({
    mutationFn: async ({ complaintId, assignedUser }) => {
      await base44.entities.CustomerComplaint.update(complaintId, {
        allocatedTo: assignedUser,
        allocatedDate: new Date().toISOString(),
        responsiblePerson: assignedUser
      });
      
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: assignedUser,
        subject: `QFIR Assignment: ${fillingQFIR.ticketNumber}`,
        body: `You have been assigned to complete QFIR for complaint ${fillingQFIR.ticketNumber}.\n\nCustomer: ${fillingQFIR.customerName}\nIssue: ${fillingQFIR.issueDescription}\n\nPlease complete the QFIR form in the QFIR Management section.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
      alert("QFIR assigned successfully! User has been notified via email.");
      setAllocatedTo("");
    }
  });

  const handleSubmitQFIR = async () => {
    if (!fillingQFIR || !allocatedTo) {
      alert("Please select Line Head to allocate");
      return;
    }

    const user = await base44.auth.me();

    updateComplaintMutation.mutate({
      id: fillingQFIR.id,
      data: {
        qfirData: {
          ...qfirData,
          filledBy: user.email,
          filledDate: new Date().toISOString(),
          filledDateIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        },
        allocatedTo,
        allocatedDate: new Date().toISOString(),
        allocatedDateIST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: "allocated",
        responsiblePerson: allocatedTo
      }
    });

    // Reset form
    setFillingQFIR(null);
    setQfirData({});
    setAllocatedTo("");
    setActiveView("pipeline");
  };

  const handleAddRoll = () => {
    setSelectedComplaint(prev => ({
      ...prev,
      rolls: [
        ...(prev.rolls || []),
        {
          rollNumber: "",
          qtyInvoiceLsf: "",
          sizeOfRoll: "",
          dispQtyLsf: "",
          soItem: "",
          despatchDate: ""
        }
      ]
    }));
  };

  const handleRemoveRoll = (index) => {
    setSelectedComplaint(prev => ({
      ...prev,
      rolls: prev.rolls.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateRoll = (index, field, value) => {
    setSelectedComplaint(prev => ({
      ...prev,
      rolls: prev.rolls.map((roll, i) =>
        i === index ? { ...roll, [field]: value } : roll
      )
    }));
  };

  const statusColors = {
    pending_qfir: "bg-orange-100 text-orange-800",
    qfir_completed: "bg-blue-100 text-blue-800",
    allocated: "bg-purple-100 text-purple-800",
    in_investigation: "bg-yellow-100 text-yellow-800",
    rca_in_progress: "bg-indigo-100 text-indigo-800",
    capa_assigned: "bg-cyan-100 text-cyan-800",
    closed: "bg-green-100 text-green-800"
  };

  const stages = [
    { key: "pending_qfir", label: "Pending QFIR", color: "orange" },
    { key: "qfir_completed", label: "QFIR Completed", color: "blue" },
    { key: "allocated", label: "Allocated", color: "purple" },
    { key: "in_investigation", label: "Investigating", color: "yellow" },
    { key: "rca_in_progress", label: "RCA In Progress", color: "indigo" },
    { key: "capa_assigned", label: "CAPA Assigned", color: "cyan" },
    { key: "closed", label: "Closed", color: "green" }
  ];

  const getComplaintsByStage = (stage) => {
    return allComplaints.filter(c => c.status === stage);
  };

  const getLinkedDefect = (complaintId) => {
    return defects.find(d => d.linkedComplaintId === complaintId || d.ticketId === allComplaints.find(c => c.id === complaintId)?.ticketNumber);
  };

  const getLinkedRCA = (complaintId) => {
    const defect = getLinkedDefect(complaintId);
    return rcas.find(r => r.defectTicketId === defect?.id);
  };

  const getLinkedCAPA = (complaintId) => {
    const defect = getLinkedDefect(complaintId);
    return capas.find(c => c.defectTicketId === defect?.id);
  };

  const calculateLeadTime = (complaint) => {
    if (!complaint.dateLogged) return 0;
    const logged = new Date(complaint.dateLogged);
    const now = complaint.closedDate ? new Date(complaint.closedDate) : new Date();
    return Math.floor((now - logged) / (1000 * 60 * 60 * 24));
  };

  const stats = {
    total: allComplaints.length,
    pending: getComplaintsByStage("pending_qfir").length,
    inProgress: allComplaints.filter(c => 
      ["allocated", "in_investigation", "rca_in_progress", "capa_assigned"].includes(c.status)
    ).length,
    closed: getComplaintsByStage("closed").length,
    avgLeadTime: allComplaints.length > 0 
      ? Math.round(allComplaints.reduce((sum, c) => sum + calculateLeadTime(c), 0) / allComplaints.length)
      : 0
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                Complaint Tracking Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Real-time quality complaint monitoring & CAPA tracking</p>
            </div>
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => reconcileMutation.mutate()} 
                disabled={reconcileMutation.isPending}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {reconcileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reconcile Statuses
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Complaints</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Pending QFIR</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Avg Lead Time</p>
                  <p className="text-2xl font-bold text-green-600">{stats.avgLeadTime}d</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="mb-6">
            <TabsTrigger value="pipeline">
              Pipeline View
            </TabsTrigger>
            <TabsTrigger value="pending">
              {isAdmin ? 'Pending QFIR' : 'My Assigned'} ({pendingComplaints.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Complaints ({allComplaints.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="traceability">
              Traceability Viewer
            </TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline">
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {stages.map((stage, stageIdx) => {
                  const complaintsInStage = getComplaintsByStage(stage.key);
                  return (
                    <div key={stage.key} className="flex-shrink-0 w-80">
                      <Card className={`border-2 border-${stage.color}-200`}>
                        <CardHeader className={`bg-${stage.color}-50 border-b border-${stage.color}-200`}>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">
                              {stage.label}
                            </CardTitle>
                            <Badge className={statusColors[stage.key]}>
                              {complaintsInStage.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                          {complaintsInStage.map((complaint) => {
                            const linkedRCA = getLinkedRCA(complaint.id);
                            const linkedCAPA = getLinkedCAPA(complaint.id);
                            const leadTime = calculateLeadTime(complaint);

                            return (
                              <Card 
                                key={complaint.id} 
                                className="hover:shadow-md transition-shadow border relative"
                              >
                                <CardContent className="p-3">
                                  {isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute top-2 right-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteComplaintChain(complaint);
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {complaint.ticketNumber}
                                    </Badge>
                                    <Badge className="text-xs bg-gray-100 text-gray-800">
                                      {complaint.filmType}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                                    {complaint.customerName}
                                  </p>
                                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                    {complaint.issueDescription}
                                  </p>
                                  
                                  {/* Progress Indicators */}
                                  <div className="flex items-center gap-2 text-xs">
                                    {linkedRCA && (
                                      <Badge className="bg-indigo-100 text-indigo-800">
                                        RCA
                                      </Badge>
                                    )}
                                    {linkedCAPA && (
                                      <div className="flex items-center gap-1">
                                        <Badge className="bg-cyan-100 text-cyan-800">
                                          CAPA
                                        </Badge>
                                        {linkedCAPA.approvalState === 'closed' && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-200"
                                            onClick={(e) => handleDownloadReport(complaint, e)}
                                            title="Download Traceability Report"
                                          >
                                            <Download className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                    <span className="text-gray-500 ml-auto">
                                      {leadTime}d
                                    </span>
                                  </div>
                                  
                                  <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                                   <div className="flex items-center gap-1">
                                     <Users className="w-3 h-3" />
                                     <span>{complaint.allocatedTo || complaint.responsiblePerson || 'Unassigned'}</span>
                                   </div>
                                  </div>

                                  <div className="mt-3">
                                   {complaint.status === 'pending_qfir' && isAdmin && !complaint.allocatedTo ? (
                                     <Button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setFillingQFIR(complaint);
                                         setActiveView('assign');
                                       }}
                                       className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                       size="sm"
                                     >
                                       <UserPlus className="w-3 h-3 mr-2" />
                                       Assign QFIR
                                     </Button>
                                   ) : complaint.status === 'pending_qfir' && complaint.allocatedTo === currentUser?.email ? (
                                     <Button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setFillingQFIR(complaint);
                                         setQfirData(complaint.qfirData || {});
                                         setActiveView('create');
                                       }}
                                       className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                       size="sm"
                                     >
                                       <FileCheck className="w-3 h-3 mr-2" />
                                       Fill QFIR
                                     </Button>
                                    ) : complaint.qfirData ? (
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFillingQFIR(complaint);
                                          setQfirData(complaint.qfirData || {});
                                          setAllocatedTo(complaint.allocatedTo || "");
                                          setActiveView('create');
                                        }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                      >
                                        <Eye className="w-3 h-3 mr-2" />
                                        View QFIR
                                      </Button>
                                    ) : null}
                                  </div>
                                  </CardContent>
                                  </Card>
                            );
                          })}
                          {complaintsInStage.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              No complaints
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {stageIdx < stages.length - 1 && (
                        <div className="flex justify-center my-2">
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Assign QFIR Tab */}
          <TabsContent value="assign">
            {!fillingQFIR ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Complaint Selected</h3>
                  <p className="text-gray-600">Go back to pipeline to select a complaint</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-orange-600 text-white rounded-lg">
                          <p className="text-xs font-medium">TICKET</p>
                          <p className="font-bold text-lg">{fillingQFIR.ticketNumber}</p>
                        </div>
                        <div>
                          <CardTitle>Assign QFIR to User</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">Select who will complete this QFIR</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setFillingQFIR(null);
                          setAllocatedTo("");
                          setActiveView("pipeline");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Customer:</strong> {fillingQFIR.customerName}</p>
                    <p><strong>Issue:</strong> {fillingQFIR.issueDescription}</p>
                    <p><strong>Film Type:</strong> {fillingQFIR.filmType}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                      Select User to Assign
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={allocatedTo} onValueChange={setAllocatedTo}>
                      <SelectTrigger className="mb-4">
                        <SelectValue placeholder="Select user to assign QFIR..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.full_name || user.email} - {user.customRole || user.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        The assigned user will receive an email notification and can fill the QFIR from their "My Assigned" tab.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFillingQFIR(null);
                      setAllocatedTo("");
                      setActiveView("pipeline");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => assignQFIRMutation.mutate({ complaintId: fillingQFIR.id, assignedUser: allocatedTo })}
                    disabled={assignQFIRMutation.isPending || !allocatedTo}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {assignQFIRMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign QFIR
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {!isAdmin && pendingComplaints.length === 0 && (
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  You have no assigned QFIRs at the moment. QFIRs will appear here once admin assigns them to you.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4">
              {pendingComplaints.map((complaint) => (
                <Card key={complaint.id} className="hover:shadow-lg transition-shadow border-2 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="px-4 py-2 bg-orange-600 text-white rounded-lg">
                            <p className="text-xs font-medium">TICKET NUMBER</p>
                            <h3 className="font-bold text-xl">{complaint.ticketNumber}</h3>
                          </div>
                          <Badge className={statusColors[complaint.status]}>
                            {complaint.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">{complaint.filmType}</Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{complaint.issueDescription}</p>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Customer:</strong> {complaint.customerName}</p>
                            <p><strong>Material Code:</strong> {complaint.materialCode || 'N/A'}</p>
                          </div>
                          <div>
                            <p><strong>Logged by:</strong> {complaint.loggedBy}</p>
                            <p><strong>Date:</strong> {new Date(complaint.dateLogged).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                          </div>
                        </div>
                        {complaint.allocatedTo && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-sm text-purple-700">
                              <strong>Assigned to:</strong> {users.find(u => u.email === complaint.allocatedTo)?.full_name || complaint.allocatedTo}
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          <strong>Rolls:</strong> {complaint.rolls?.length || 0} roll(s)
                        </p>
                      </div>
                      <div className="ml-4">
                        {isAdmin && !complaint.allocatedTo ? (
                          <Button
                            onClick={() => {
                              setFillingQFIR(complaint);
                              setActiveView('assign');
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            size="lg"
                          >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Assign QFIR
                          </Button>
                        ) : complaint.allocatedTo === currentUser?.email && canEdit ? (
                          <Button
                            onClick={() => {
                              setFillingQFIR(complaint);
                              setQfirData(complaint.qfirData || {});
                              setActiveView('create');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="lg"
                          >
                            <FileCheck className="w-5 h-5 mr-2" />
                            Fill QFIR
                          </Button>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 text-xs px-3 py-2">
                            {isAdmin ? 'Already Assigned' : 'View Only Access'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pendingComplaints.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending QFIR forms</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create">
            {!fillingQFIR ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Complaint Selected</h3>
                  <p className="text-gray-600 mb-4">
                    Go to "Pending QFIR" tab and select a complaint to fill the QFIR form
                  </p>
                  <Button onClick={() => setActiveView("pending")} variant="outline">
                    View Pending Complaints
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Complaint Summary */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-orange-600 text-white rounded-lg">
                          <p className="text-xs font-medium">TICKET</p>
                          <p className="font-bold text-lg">{fillingQFIR.ticketNumber}</p>
                        </div>
                        <div>
                          <CardTitle>Quality First Information Report</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">Complete form and allocate to Line Head</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setFillingQFIR(null);
                          setQfirData({});
                          setAllocatedTo("");
                          setActiveView("pipeline");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Customer:</strong> {fillingQFIR.customerName}</p>
                    <p><strong>Issue:</strong> {fillingQFIR.issueDescription}</p>
                    <p><strong>Film Type:</strong> {fillingQFIR.filmType}</p>
                    <p><strong>Material Code:</strong> {fillingQFIR.materialCode}</p>
                    <p><strong>Logged by:</strong> {fillingQFIR.loggedBy} on {new Date(fillingQFIR.dateLogged).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                  </CardContent>
                </Card>

                {/* Multiple Rolls Section */}
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Rolls Information</CardTitle>
                      {canEdit && (
                        <Button
                          onClick={() => {
                            const newRolls = [...(qfirData.rollsData || []), {
                              rollNo: "",
                              productionDate: "",
                              complaintRollNo: "",
                              qtyInvolveLsf: "",
                              sizeOfRoll: "",
                              dispQtyLsf: "",
                              soItem: "",
                              dispatchDate: ""
                            }];
                            setQfirData({...qfirData, rollsData: newRolls});
                          }}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Roll
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(qfirData.rollsData && qfirData.rollsData.length > 0) ? (
                      <div className="space-y-4">
                        {qfirData.rollsData.map((roll, idx) => (
                          <div key={idx} className="p-4 bg-white rounded-lg border-2 border-indigo-200 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-indigo-600 text-white">Roll {idx + 1}</Badge>
                              {canEdit && qfirData.rollsData.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newRolls = qfirData.rollsData.filter((_, i) => i !== idx);
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Roll No.</Label>
                                <Input
                                  value={roll.rollNo || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].rollNo = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Production Date</Label>
                                <Input
                                  type="date"
                                  value={roll.productionDate || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].productionDate = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Complaint Roll No.</Label>
                                <Input
                                  value={roll.complaintRollNo || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].complaintRollNo = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Qty Involve Lsf</Label>
                                <Input
                                  type="number"
                                  value={roll.qtyInvolveLsf || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].qtyInvolveLsf = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Size of Roll</Label>
                                <Input
                                  value={roll.sizeOfRoll || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].sizeOfRoll = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Disp Qty Lsf</Label>
                                <Input
                                  type="number"
                                  value={roll.dispQtyLsf || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].dispQtyLsf = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">S.O. Item</Label>
                                <Input
                                  value={roll.soItem || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].soItem = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Dispatch Date</Label>
                                <Input
                                  type="date"
                                  value={roll.dispatchDate || ""}
                                  onChange={(e) => {
                                    const newRolls = [...qfirData.rollsData];
                                    newRolls[idx].dispatchDate = e.target.value;
                                    setQfirData({...qfirData, rollsData: newRolls});
                                  }}
                                  disabled={!canEdit}
                                  className={!canEdit ? "bg-gray-100" : ""}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-3">No rolls added yet</p>
                        {canEdit && (
                          <Button
                            onClick={() => {
                              setQfirData({...qfirData, rollsData: [{
                                rollNo: "",
                                productionDate: "",
                                complaintRollNo: fillingQFIR.rolls?.[0]?.rollNumber || "",
                                qtyInvolveLsf: fillingQFIR.rolls?.[0]?.qtyInvoiceLsf || "",
                                sizeOfRoll: fillingQFIR.rolls?.[0]?.sizeOfRoll || "",
                                dispQtyLsf: fillingQFIR.rolls?.[0]?.dispQtyLsf || "",
                                soItem: fillingQFIR.rolls?.[0]?.soItem || "",
                                dispatchDate: fillingQFIR.rolls?.[0]?.despatchDate || ""
                              }]});
                            }}
                            variant="outline"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Roll
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* QFIR Form - Single Sequential Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quality Complaint First Information Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Date of Complaint</Label>
                      <Input
                        type="date"
                        value={qfirData.dateOfComplaint || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setQfirData({...qfirData, dateOfComplaint: e.target.value})}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Customer</Label>
                      <Input value={fillingQFIR.customerName} disabled className="bg-gray-100" />
                    </div>

                    <div>
                      <Label>End Customer</Label>
                      <Input
                        value={qfirData.endCustomer || fillingQFIR.endCustomer || ""}
                        onChange={(e) => setQfirData({...qfirData, endCustomer: e.target.value})}
                        disabled={!isAdmin}
                        className={!isAdmin ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Pname</Label>
                      <Input
                        value={qfirData.pname || ""}
                        onChange={(e) => setQfirData({...qfirData, pname: e.target.value})}
                        disabled={!isAdmin}
                        className={!isAdmin ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Material Code</Label>
                      <Input 
                        value={qfirData.materialCode || fillingQFIR.materialCode || ""} 
                        onChange={(e) => setQfirData({...qfirData, materialCode: e.target.value})}
                        disabled={!isAdmin}
                        className={!isAdmin ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Product Type</Label>
                      <Input
                        value={qfirData.productType || fillingQFIR.productType || ""}
                        onChange={(e) => setQfirData({...qfirData, productType: e.target.value})}
                        disabled={!isAdmin}
                        className={!isAdmin ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Sample sent by customer</Label>
                      <Input
                        value={qfirData.sampleSentByCustomer || ""}
                        onChange={(e) => setQfirData({...qfirData, sampleSentByCustomer: e.target.value})}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Counter sample available</Label>
                      <Input
                        value={qfirData.counterSampleAvailable || ""}
                        onChange={(e) => setQfirData({...qfirData, counterSampleAvailable: e.target.value})}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Qty dispatched Before Lsf</Label>
                      <Input
                        type="number"
                        value={qfirData.qtyDispatchedBefore || ""}
                        onChange={(e) => setQfirData({...qfirData, qtyDispatchedBefore: parseFloat(e.target.value)})}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Qty dispatched After Lsf</Label>
                      <Input
                        type="number"
                        value={qfirData.qtyDispatchedAfter || ""}
                        onChange={(e) => setQfirData({...qfirData, qtyDispatchedAfter: parseFloat(e.target.value)})}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    {/* Slitting Details Section Header */}
                    <div className="pt-6 pb-2 border-t-2 border-gray-300">
                      <h3 className="text-md font-semibold text-gray-900">Slitting Details.</h3>
                    </div>

                    <div>
                      <Label>Roll No.</Label>
                      <Input
                        value={qfirData.slittingDetails?.rollNo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), rollNo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Slitting Remarks</Label>
                      <Input
                        value={qfirData.slittingDetails?.slittingRemarks || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), slittingRemarks: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Spots</Label>
                      <Input
                        value={qfirData.slittingDetails?.spots || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), spots: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Curling</Label>
                      <Input
                        value={qfirData.slittingDetails?.curling || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), curling: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TD - With liner</Label>
                      <Input
                        value={qfirData.slittingDetails?.tdWithLiner || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), tdWithLiner: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TD - Without liner</Label>
                      <Input
                        value={qfirData.slittingDetails?.tdWithoutLiner || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), tdWithoutLiner: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TD - Wet</Label>
                      <Input
                        value={qfirData.slittingDetails?.tdWet || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), tdWet: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>MD - With liner</Label>
                      <Input
                        value={qfirData.slittingDetails?.mdWithLiner || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), mdWithLiner: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>MD - Without liner</Label>
                      <Input
                        value={qfirData.slittingDetails?.mdWithoutLiner || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), mdWithoutLiner: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>MD - Wet</Label>
                      <Input
                        value={qfirData.slittingDetails?.mdWet || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), mdWet: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>B-Grade</Label>
                      <Input
                        value={qfirData.slittingDetails?.bGrade || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), bGrade: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Any non confirming Release</Label>
                      <Input
                        value={qfirData.slittingDetails?.anyNonConfirmingRelease || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), anyNonConfirmingRelease: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>QA</Label>
                      <Input
                        value={qfirData.slittingDetails?.qa || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), qa: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Counter Sample Observation</Label>
                      <Textarea
                        value={qfirData.slittingDetails?.counterSampleObservation || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          slittingDetails: { ...(qfirData.slittingDetails || {}), counterSampleObservation: e.target.value }
                        })}
                        rows={3}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    {/* Production Details Section Header */}
                    <div className="pt-6 pb-2 border-t-2 border-gray-300">
                      <h3 className="text-md font-semibold text-gray-900">Production Details:</h3>
                    </div>

                    <div>
                      <Label>C No.</Label>
                      <Input
                        value={qfirData.productionDetails?.cNo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), cNo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Prod Date</Label>
                      <Input
                        type="date"
                        value={qfirData.productionDetails?.prodDate || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), prodDate: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Length of Roll Mtr</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.lengthOfRollMtr || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), lengthOfRollMtr: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>PS Batch</Label>
                      <Input
                        value={qfirData.productionDetails?.psBatch || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), psBatch: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TS Batch</Label>
                      <Input
                        value={qfirData.productionDetails?.tsBatch || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), tsBatch: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>SRC Batch</Label>
                      <Input
                        value={qfirData.productionDetails?.srcBatch || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), srcBatch: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>PS Depo</Label>
                      <Input
                        value={qfirData.productionDetails?.psDepo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), psDepo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>%VLT</Label>
                      <Input
                        value={qfirData.productionDetails?.vlt || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), vlt: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Rs Value</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.rsValue || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), rsValue: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>SRC Depo.</Label>
                      <Input
                        value={qfirData.productionDetails?.srcDepo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), srcDepo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Peel Adhesion of Laminate film Kg/In</Label>
                      <Input
                        value={qfirData.productionDetails?.peelAdhesion || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), peelAdhesion: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Shrinkage MD</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.shrinkageMD || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), shrinkageMD: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Shrinkage TD</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.shrinkageTD || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), shrinkageTD: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TS No</Label>
                      <Input
                        value={qfirData.productionDetails?.tsNo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), tsNo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Line speed</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.lineSpeed || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), lineSpeed: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>UV intensity</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.uvIntensity || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), uvIntensity: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>SRC Gr Speed</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.srcGrSpeed || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), srcGrSpeed: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TS Gr Speed</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.tsGrSpeed || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), tsGrSpeed: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>PS Oven Temp</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.psOvenTemp || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), psOvenTemp: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>TS Oven Temp</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.tsOvenTemp || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), tsOvenTemp: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Unwinder tension</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.unwinderTension || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), unwinderTension: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Rewinder Tension</Label>
                      <Input
                        type="number"
                        value={qfirData.productionDetails?.rewinderTension || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), rewinderTension: parseFloat(e.target.value) }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Any change over Before this Roll</Label>
                      <Input
                        value={qfirData.productionDetails?.anyChangeOverBeforeThisRoll || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), anyChangeOverBeforeThisRoll: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Any change over After This Roll</Label>
                      <Input
                        value={qfirData.productionDetails?.anyChangeOverAfterThisRoll || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), anyChangeOverAfterThisRoll: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Any Downtime & Reson for the Prodn Date</Label>
                      <Textarea
                        value={qfirData.productionDetails?.anyDowntimeReasonForProdn || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), anyDowntimeReasonForProdn: e.target.value }
                        })}
                        rows={2}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>----Before the date</Label>
                      <Input
                        type="date"
                        value={qfirData.productionDetails?.dateBeforeTheDate || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), dateBeforeTheDate: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>----After the Date</Label>
                      <Input
                        type="date"
                        value={qfirData.productionDetails?.dateAfterTheDate || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), dateAfterTheDate: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Dyed Film</Label>
                      <Input
                        value={qfirData.productionDetails?.dyedFilm || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), dyedFilm: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Dyed Film Roll no.</Label>
                      <Input
                        value={qfirData.productionDetails?.dyedFilmRollNo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), dyedFilmRollNo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Metal Film/ Sol Film</Label>
                      <Input
                        value={qfirData.productionDetails?.metalFilm || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), metalFilm: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>23 M PLAIN FILM</Label>
                      <Input
                        value={qfirData.productionDetails?.z3MPlainFilm || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), z3MPlainFilm: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>SRC NO</Label>
                      <Input
                        value={qfirData.productionDetails?.srcNo || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), srcNo: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>

                    <div>
                      <Label>Liner</Label>
                      <Input
                        value={qfirData.productionDetails?.liner || ""}
                        onChange={(e) => setQfirData({
                          ...qfirData,
                          productionDetails: { ...(qfirData.productionDetails || {}), liner: e.target.value }
                        })}
                        disabled={!canEdit}
                        className={!canEdit ? "bg-gray-100" : ""}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* SAP Integration */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      SAP Integration
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      📍 <strong>Note:</strong> Full SAP configuration available in Admin → SAP Integration tab
                    </p>
                  </CardHeader>
                  <CardContent>
                    <SAPSyncButton 
                      complaint={fillingQFIR}
                      onSyncComplete={(data) => {
                        queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
                        queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
                      }}
                    />
                  </CardContent>
                </Card>

                {canEdit && (
                  <>
                    {/* Allocate to Line Head */}
                    <Card className="bg-purple-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-purple-600" />
                          Allocate to Line Head
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={allocatedTo} onValueChange={setAllocatedTo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Line Head..." />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.email}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Submit */}
                    <div className="flex justify-end gap-4">
                      {fillingQFIR?.qfirData && <QFIRPDFExporter complaint={fillingQFIR} />}
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setFillingQFIR(null);
                          setQfirData({});
                          setAllocatedTo("");
                          setActiveView("pipeline");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitQFIR}
                        disabled={updateComplaintMutation.isPending || !allocatedTo}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updateComplaintMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Submit QFIR & Allocate
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {!canEdit && (
                  <>
                    <Alert className="bg-blue-50 border-blue-200">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        You have <strong>view-only</strong> access to QFIR forms. Contact Quality Lead to make changes.
                      </AlertDescription>
                    </Alert>
                    {fillingQFIR?.qfirData && (
                      <div className="flex justify-end mt-4">
                        <QFIRPDFExporter complaint={fillingQFIR} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <QFIRAnalytics complaints={allComplaints} />
          </TabsContent>

          <TabsContent value="traceability">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Complaint for Traceability</CardTitle>
                  <p className="text-sm text-gray-600">Select a complaint to view its complete traceability flow</p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {allComplaints.map((complaint) => {
                      const defect = getLinkedDefect(complaint.id);
                      const rca = getLinkedRCA(complaint.id);
                      const capa = getLinkedCAPA(complaint.id);
                      const progress = [
                        complaint ? 1 : 0,
                        complaint.qfirData ? 1 : 0,
                        defect ? 1 : 0,
                        rca ? 1 : 0,
                        capa ? 1 : 0
                      ].reduce((a, b) => a + b, 0);

                      return (
                        <Card key={complaint.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingComplaint(complaint)}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-orange-600 text-white font-bold">
                                {complaint.ticketNumber}
                              </Badge>
                              <Badge className={statusColors[complaint.status]}>
                                {complaint.status?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm mb-1">{complaint.customerName}</p>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{complaint.issueDescription}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Progress: {progress}/5 stages</span>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setViewingComplaint(complaint); }}>
                                <Eye className="w-3 h-3 mr-1" />
                                View Flow
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {viewingComplaint && (() => {
                const defect = getLinkedDefect(viewingComplaint.id);
                const rca = getLinkedRCA(viewingComplaint.id);
                const capa = getLinkedCAPA(viewingComplaint.id);
                
                return (
                  <TraceabilityDiagram 
                    complaint={viewingComplaint}
                    defect={defect}
                    rca={rca}
                    capa={capa}
                  />
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {allComplaints.map((complaint) => (
                <Card key={complaint.id} className="hover:shadow-lg transition-shadow relative">
                  <CardContent className="p-6" onClick={() => setViewingComplaint(complaint)}>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComplaintChain(complaint);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="px-3 py-1 bg-gray-700 text-white rounded font-bold text-sm">
                            {complaint.ticketNumber}
                          </div>
                          <Badge className={statusColors[complaint.status]}>
                            {complaint.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{complaint.issueDescription?.slice(0, 100)}...</p>
                        <div className="text-sm text-gray-600">
                          <p><strong>Customer:</strong> {complaint.customerName} | <strong>Responsible:</strong> {complaint.responsiblePerson || 'Unassigned'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* View Complaint Dialog */}
        <Dialog open={!!viewingComplaint} onOpenChange={() => setViewingComplaint(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                  <p className="text-xs font-medium">TICKET</p>
                  <p className="font-bold text-lg">{viewingComplaint?.ticketNumber}</p>
                </div>
                <DialogTitle className="flex-1">Complaint Details</DialogTitle>
              </div>
            </DialogHeader>
            {viewingComplaint && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Badge className={statusColors[viewingComplaint.status]}>
                      {viewingComplaint.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {getLinkedCAPA(viewingComplaint.id) && (
                    <div>
                      <Label>Linked CAPA</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium">
                          {getLinkedCAPA(viewingComplaint.id).id.slice(0, 8)}
                        </span>
                        {getLinkedCAPA(viewingComplaint.id).approvalState === 'closed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs gap-1 text-blue-600 border-blue-200"
                            onClick={(e) => handleDownloadReport(viewingComplaint, e)}
                          >
                            <Download className="w-3 h-3" />
                            Report
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Responsible Person</Label>
                    <p className="text-sm font-medium">{viewingComplaint.responsiblePerson || 'Unassigned'}</p>
                  </div>
                </div>
                <div>
                  <Label>Customer</Label>
                  <p>{viewingComplaint.customerName}</p>
                </div>
                <div>
                  <Label>Issue</Label>
                  <p>{viewingComplaint.issueDescription}</p>
                </div>
                {viewingComplaint.qfirData && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      QFIR completed by {viewingComplaint.qfirData.filledBy} on {new Date(viewingComplaint.qfirData.filledDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}