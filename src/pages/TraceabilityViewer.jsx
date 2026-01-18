import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, GitBranch, FileText, Loader2, AlertCircle, 
  TrendingUp, CheckCircle2, Clock 
} from "lucide-react";
import TraceabilityDiagram from "../components/traceability/TraceabilityDiagram";

export default function TraceabilityViewer() {
  const [searchTicket, setSearchTicket] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const { data: allComplaints = [] } = useQuery({
    queryKey: ['complaints-traceability'],
    queryFn: () => base44.entities.CustomerComplaint.list("-dateLogged", 200),
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-traceability'],
    queryFn: () => base44.entities.DefectTicket.list("-created_date", 200),
  });

  const { data: rcas = [] } = useQuery({
    queryKey: ['rcas-traceability'],
    queryFn: () => base44.entities.RCARecord.list("-created_date", 100),
  });

  const { data: capas = [] } = useQuery({
    queryKey: ['capas-traceability'],
    queryFn: () => base44.entities.CAPAPlan.list("-created_date", 100),
  });

  const handleSearch = () => {
    if (!searchTicket.trim()) return;
    
    const found = allComplaints.find(c => 
      c.ticketNumber?.toLowerCase().includes(searchTicket.toLowerCase())
    );
    
    setSelectedComplaint(found || null);
  };

  const getLinkedDefect = (complaintId) => {
    const complaint = allComplaints.find(c => c.id === complaintId);
    return defects.find(d => 
      d.linkedComplaintId === complaintId || 
      d.ticketId === complaint?.ticketNumber
    );
  };

  const getLinkedRCA = (complaintId) => {
    const defect = getLinkedDefect(complaintId);
    return rcas.find(r => r.defectTicketId === defect?.id);
  };

  const getLinkedCAPA = (complaintId) => {
    const defect = getLinkedDefect(complaintId);
    return capas.find(c => c.defectTicketId === defect?.id);
  };

  const calculateProgress = (complaint) => {
    const defect = getLinkedDefect(complaint.id);
    const rca = getLinkedRCA(complaint.id);
    const capa = getLinkedCAPA(complaint.id);
    
    return [
      complaint ? 1 : 0,
      complaint.qfirData ? 1 : 0,
      defect ? 1 : 0,
      rca ? 1 : 0,
      capa ? 1 : 0
    ].reduce((a, b) => a + b, 0);
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

  const stats = {
    total: allComplaints.length,
    withQFIR: allComplaints.filter(c => c.qfirData).length,
    withDefect: allComplaints.filter(c => getLinkedDefect(c.id)).length,
    withRCA: allComplaints.filter(c => getLinkedRCA(c.id)).length,
    withCAPA: allComplaints.filter(c => getLinkedCAPA(c.id)).length,
    closed: allComplaints.filter(c => c.status === 'closed').length
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GitBranch className="w-8 h-8 text-purple-600" />
            Traceability Viewer
          </h1>
          <p className="text-gray-600 mt-1">Track complete quality workflow from customer complaint to CAPA closure</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-600">Total Complaints</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.withQFIR}</p>
              <p className="text-xs text-gray-600">With QFIR</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.withDefect}</p>
              <p className="text-xs text-gray-600">With Defect</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats.withRCA}</p>
              <p className="text-xs text-gray-600">With RCA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-cyan-600">{stats.withCAPA}</p>
              <p className="text-xs text-gray-600">With CAPA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
              <p className="text-xs text-gray-600">Closed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Search by Ticket Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter complaint ticket number (e.g., 25012W00001)"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
            {searchTicket && !selectedComplaint && (
              <Alert className="mt-3 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  No complaint found with ticket number: <strong>{searchTicket}</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Search Result Traceability */}
        {selectedComplaint && (
          <div className="mb-6">
            <TraceabilityDiagram 
              complaint={selectedComplaint}
              defect={getLinkedDefect(selectedComplaint.id)}
              rca={getLinkedRCA(selectedComplaint.id)}
              capa={getLinkedCAPA(selectedComplaint.id)}
            />
          </div>
        )}

        {/* All Complaints List */}
        <Card>
          <CardHeader>
            <CardTitle>All Complaints ({allComplaints.length})</CardTitle>
            <p className="text-sm text-gray-600">Click any complaint to view its traceability flow</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {allComplaints.map((complaint) => {
                const progress = calculateProgress(complaint);
                const leadTime = complaint.dateLogged 
                  ? Math.floor((new Date() - new Date(complaint.dateLogged)) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <Card 
                    key={complaint.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border-2"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-orange-600 text-white font-bold">
                          {complaint.ticketNumber}
                        </Badge>
                        <Badge className={statusColors[complaint.status]}>
                          {complaint.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      <p className="font-medium text-sm mb-1">{complaint.customerName}</p>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">{complaint.issueDescription}</p>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">{leadTime}d</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-purple-500" />
                          <span className="font-medium text-purple-700">{progress}/5 stages</span>
                        </div>
                      </div>

                      {/* Stage Indicators */}
                      <div className="flex gap-1 mt-3">
                        <div className={`h-1 flex-1 rounded ${complaint ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`h-1 flex-1 rounded ${complaint.qfirData ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`h-1 flex-1 rounded ${getLinkedDefect(complaint.id) ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`h-1 flex-1 rounded ${getLinkedRCA(complaint.id) ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`h-1 flex-1 rounded ${getLinkedCAPA(complaint.id) ? 'bg-green-500' : 'bg-gray-200'}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {allComplaints.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No complaints logged yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}