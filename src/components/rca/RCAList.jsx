import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronRight, Clock, CheckCircle2, Trash2, Loader2, Ticket } from "lucide-react";

export default function RCAList({ rcas, defects = [], onSelect }) {
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

  const deleteRCAMutation = useMutation({
    mutationFn: (id) => base44.entities.RCARecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rcas'] });
      queryClient.invalidateQueries({ queryKey: ['all-rcas'] });
    }
  });

  const handleDelete = (e, rcaId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this RCA? This action cannot be undone.")) {
      return;
    }
    deleteRCAMutation.mutate(rcaId);
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const statusColors = {
    in_progress: "bg-blue-100 text-blue-800",
    pending_validation: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Root Cause Analysis Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rcas.map((rca) => {
            const linkedDefect = defects.find(d => d.id === rca.defectTicketId);
            return (
            <div
              key={rca.id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelect(rca)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-600">
                      RCA #{rca.id.slice(0, 8)}
                    </span>
                    <Badge className={statusColors[rca.status]}>
                      {rca.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  {/* Linked Defect Info */}
                  {linkedDefect && (
                    <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Ticket className="w-4 h-4 text-orange-600" />
                        <span className="font-mono font-bold text-orange-900">
                          {linkedDefect.ticketId || `ID: ${linkedDefect.id.slice(0,8)}`}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-orange-900">
                        🔗 {linkedDefect.defectType?.replace(/_/g, ' ')} ({linkedDefect.severity})
                      </p>
                      <p className="text-xs text-orange-700">
                        Line {linkedDefect.line} • {linkedDefect.productCode}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-2">
                    Analyst: {rca.analyst}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(rca.created_date), 'MMM d, yyyy')}
                    </span>
                    {rca.rootCauses?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {rca.rootCauses.length} causes identified
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(e, rca.id)}
                      disabled={deleteRCAMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleteRCAMutation.isPending ? (
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
          
          {rcas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No RCA records yet</p>
              <p className="text-sm mt-1">Start a new RCA from an open defect</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}