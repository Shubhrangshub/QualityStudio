import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronRight, AlertTriangle, Trash2, Loader2, Ticket } from "lucide-react";

export default function CAPAList({ capas, defects = [], rcas = [], onSelect }) {
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

  const deleteCAPAMutation = useMutation({
    mutationFn: (id) => base44.entities.CAPAPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capas'] });
      queryClient.invalidateQueries({ queryKey: ['all-capas'] });
    }
  });

  const handleDelete = (e, capaId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this CAPA? This action cannot be undone.")) {
      return;
    }
    deleteCAPAMutation.mutate(capaId);
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const stateColors = {
    draft: "bg-gray-100 text-gray-800",
    pending_review: "bg-orange-100 text-orange-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    closed: "bg-green-100 text-green-800"
  };

  const isOverdue = (capa) => {
    if (capa.approvalState === "closed") return false;
    const actions = [...(capa.correctiveActions || []), ...(capa.preventiveActions || [])];
    return actions.some(a => a.status !== "completed" && new Date(a.dueDate) < new Date());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CAPA Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {capas.map((capa) => {
            const linkedDefect = defects.find(d => d.id === capa.defectTicketId);
            const linkedRCA = rcas.find(r => r.id === capa.rcaId);
            return (
            <div
              key={capa.id}
              className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                isOverdue(capa) ? 'border-red-300 bg-red-50' : ''
              }`}
              onClick={() => onSelect(capa)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-600">
                      CAPA #{capa.id.slice(0, 8)}
                    </span>
                    <Badge className={stateColors[capa.approvalState]}>
                      {capa.approvalState?.replace(/_/g, ' ')}
                    </Badge>
                    {isOverdue(capa) && (
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                    {capa.aiGeneratedDraft && (
                      <Badge className="bg-purple-100 text-purple-800">AI</Badge>
                    )}
                  </div>
                  
                  {/* Linked RCA & Defect Info */}
                  <div className="mb-2 space-y-1">
                    {linkedRCA && (
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs font-medium text-blue-900">
                          🔗 From RCA #{linkedRCA.id.slice(0, 8)} 
                          <span className="ml-2 text-blue-700">({linkedRCA.status?.replace(/_/g, ' ')})</span>
                        </p>
                      </div>
                    )}
                    {linkedDefect && (
                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Ticket className="w-4 h-4 text-orange-600" />
                          <span className="font-mono font-bold text-orange-900">
                            {linkedDefect.ticketId || `ID: ${linkedDefect.id.slice(0,8)}`}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-orange-900">
                          🎯 {linkedDefect.defectType?.replace(/_/g, ' ')} ({linkedDefect.severity})
                        </p>
                        <p className="text-xs text-orange-700">
                          Line {linkedDefect.line} • {linkedDefect.productCode}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {capa.correctiveActions?.length || 0} CA • {capa.preventiveActions?.length || 0} PA
                    </p>
                    <p>Created: {format(new Date(capa.created_date), 'MMM d, yyyy')}</p>
                    {capa.fmea && (
                      <p className="font-medium text-gray-700">
                        RPN: {capa.fmea.rpn} (S:{capa.fmea.severity} × O:{capa.fmea.occurrence} × D:{capa.fmea.detection})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, capa.id)}
                      disabled={deleteCAPAMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleteCAPAMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          );
          })}
          
          {capas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No CAPA plans yet</p>
              <p className="text-sm mt-1">Create one from a completed RCA</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}