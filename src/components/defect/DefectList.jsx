import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink, Eye, User, MapPin, Layers, AlertCircle, Trash2, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { downloadCAPAReport } from "../capa/CAPAExporter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DefectList({ defects }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
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

  const deleteDefectMutation = useMutation({
    mutationFn: (id) => base44.entities.DefectTicket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      queryClient.invalidateQueries({ queryKey: ['all-defects'] });
    }
  });

  const handleDelete = (e, defectId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this defect? This action cannot be undone.")) {
      return;
    }
    deleteDefectMutation.mutate(defectId);
  };

  const handleDownloadReport = async (defect) => {
    if (!defect.linkedCAPAId) return;

    try {
      // Fetch full details
      const capas = await base44.entities.CAPAPlan.filter({ id: defect.linkedCAPAId });
      const capa = capas[0];
      
      if (!capa) return;

      let rca = null;
      if (defect.linkedRCAId) {
        const rcas = await base44.entities.RCARecord.filter({ id: defect.linkedRCAId });
        rca = rcas[0];
      }

      let complaint = null;
      if (defect.linkedComplaintId) {
        const complaints = await base44.entities.CustomerComplaint.filter({ id: defect.linkedComplaintId });
        complaint = complaints[0];
      }

      downloadCAPAReport(capa, defect, rca, complaint);
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const filteredDefects = defects.filter(d => {
    const matchesSearch = !searchTerm || 
      d.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.line?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.defectType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    const matchesSeverity = filterSeverity === "all" || d.severity === filterSeverity;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const severityColors = {
    critical: "bg-red-100 text-red-800 border-red-300",
    major: "bg-orange-100 text-orange-800 border-orange-300",
    minor: "bg-yellow-100 text-yellow-800 border-yellow-300"
  };

  const statusColors = {
    open: "bg-gray-100 text-gray-800",
    rca_in_progress: "bg-blue-100 text-blue-800",
    capa_assigned: "bg-purple-100 text-purple-800",
    verification: "bg-indigo-100 text-indigo-800",
    closed: "bg-green-100 text-green-800",
    repeat: "bg-red-100 text-red-800"
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Defect Tickets</CardTitle>
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by product, line, or defect type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="rca_in_progress">RCA In Progress</SelectItem>
                <SelectItem value="capa_assigned">CAPA Assigned</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Defect Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefects.length > 0 ? (
                  filteredDefects.map((defect) => (
                    <TableRow key={defect.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-orange-600" />
                          <span className="font-mono text-sm font-bold text-orange-900">
                            {defect.ticketId || defect.id.slice(0, 8)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(defect.dateTime || defect.created_date), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{defect.line}</TableCell>
                      <TableCell className="text-sm">{defect.productCode}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {defect.defectType?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[defect.severity]}>
                          {defect.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[defect.status]} variant="outline">
                          {defect.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {defect.images && defect.images.length > 0 ? (
                          <Badge variant="outline">{defect.images.length}</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDefect(defect)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(e, defect.id)}
                              disabled={deleteDefectMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deleteDefectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      No defects found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Defect Detail Dialog */}
      <Dialog open={!!selectedDefect} onOpenChange={() => setSelectedDefect(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Defect Details
              <Badge className={severityColors[selectedDefect?.severity]}>
                {selectedDefect?.severity}
              </Badge>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-orange-600" />
              <span className="font-mono font-bold text-orange-900">
                {selectedDefect?.ticketId || selectedDefect?.id}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedDefect && (
            <div className="space-y-6 pt-4">
              {/* Basic Info Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Defect Type</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedDefect.defectType?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Date & Time</p>
                      <p className="text-sm text-gray-900">
                        {format(new Date(selectedDefect.dateTime || selectedDefect.created_date), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Shift</p>
                      <p className="text-sm text-gray-900">{selectedDefect.shift || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Production Line</p>
                      <p className="text-sm font-medium text-gray-900">{selectedDefect.line}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Lane</p>
                      <p className="text-sm text-gray-900">{selectedDefect.lane || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Operator
                    </p>
                    <p className="text-sm text-gray-900">{selectedDefect.operator}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Product Code</p>
                    <p className="text-sm font-medium text-gray-900">{selectedDefect.productCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                    <Badge className={statusColors[selectedDefect.status]}>
                      {selectedDefect.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Inspection Method</p>
                    <p className="text-sm text-gray-900">
                      {selectedDefect.inspectionMethod?.replace(/_/g, ' ') || 'N/A'}
                    </p>
                  </div>
                  {(selectedDefect.webPositionMD || selectedDefect.webPositionCD) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Web Position
                      </p>
                      <p className="text-sm text-gray-900">
                        MD: {selectedDefect.webPositionMD || 'N/A'} m • CD: {selectedDefect.webPositionCD || 'N/A'} mm
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Material Information */}
              {(selectedDefect.filmStack || selectedDefect.adhesiveType || selectedDefect.releaseLiner) && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Material Information
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    {selectedDefect.filmStack && (
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Film Stack</p>
                        <p className="text-gray-900">{selectedDefect.filmStack}</p>
                      </div>
                    )}
                    {selectedDefect.adhesiveType && (
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Adhesive Type</p>
                        <p className="text-gray-900">{selectedDefect.adhesiveType}</p>
                      </div>
                    )}
                    {selectedDefect.releaseLiner && (
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Release Liner</p>
                        <p className="text-gray-900">{selectedDefect.releaseLiner}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Immediate Action */}
              {selectedDefect.immediateAction && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Immediate Action Taken</p>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-700">{selectedDefect.immediateAction}</p>
                  </div>
                </div>
              )}

              {/* AI Classification */}
              {selectedDefect.aiClassification && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-3">
                    AI Classification Results
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-purple-700 font-medium">Suggested Type</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-900">
                          {selectedDefect.aiClassification.suggestedType?.replace(/_/g, ' ')}
                        </p>
                        <Badge className="bg-purple-100 text-purple-800">
                          {(selectedDefect.aiClassification.confidence * 100).toFixed(0)}% confident
                        </Badge>
                      </div>
                    </div>
                    {selectedDefect.aiClassification.quickChecks && (
                      <div>
                        <p className="text-xs text-purple-700 font-medium mb-1">Quick Checks</p>
                        <ul className="space-y-1">
                          {selectedDefect.aiClassification.quickChecks.map((check, idx) => (
                            <li key={idx} className="text-sm text-gray-700 pl-4">
                              {check}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Images */}
              {selectedDefect.images && selectedDefect.images.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Defect Images ({selectedDefect.images.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedDefect.images.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={img}
                          alt={`Defect ${idx + 1}`}
                          className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 rounded-lg transition-opacity" />
                        <div className="absolute top-2 right-2 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <p>Created: {format(new Date(selectedDefect.created_date), 'MMM d, yyyy HH:mm')}</p>
                    <p>Created by: {selectedDefect.created_by}</p>
                  </div>
                  <div>
                    {selectedDefect.linkedRCAId && (
                      <p>Linked RCA: {selectedDefect.linkedRCAId.slice(0, 8)}</p>
                    )}
                    {selectedDefect.linkedCAPAId && (
                      <div className="flex items-center gap-2">
                        <p>Linked CAPA: {selectedDefect.linkedCAPAId.slice(0, 8)}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleDownloadReport(selectedDefect)}
                        >
                          <Download className="w-3 h-3" />
                          Report
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}