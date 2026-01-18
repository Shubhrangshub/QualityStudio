import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, RotateCcw, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

export default function TicketFormatSettings() {
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const queryClient = useQueryClient();

  const { data: counters = [] } = useQuery({
    queryKey: ['ticket-counters'],
    queryFn: () => base44.entities.TicketCounter.list("-created_date", 100),
  });

  const deleteCounterMutation = useMutation({
    mutationFn: (id) => base44.entities.TicketCounter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-counters'] });
    }
  });

  const handleResetAll = async () => {
    if (!confirm('Are you sure you want to reset ALL ticket counters? This will restart sequence numbers from 00001.')) {
      return;
    }

    setResetting(true);
    try {
      // Delete all counters
      for (const counter of counters) {
        await base44.entities.TicketCounter.delete(counter.id);
      }
      
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (error) {
      console.error("Reset error:", error);
    }
    setResetting(false);
  };

  const handleResetLine = async (counterId) => {
    if (!confirm('Reset this counter to 00001?')) return;
    
    try {
      await base44.entities.TicketCounter.update(counterId, { lastSequence: 0 });
      queryClient.invalidateQueries({ queryKey: ['ticket-counters'] });
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Ticket ID Format Settings
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Format: <code className="bg-gray-100 px-2 py-1 rounded">YY + M + Line + Sequence</code>
        </p>
        <div className="text-xs text-gray-600 mt-2 space-y-1">
          <p>• YY = Year (e.g., 25 for 2025)</p>
          <p>• M = Month (A-L for Jan-Dec)</p>
          <p>• Line = Production Line (e.g., Line1)</p>
          <p>• Sequence = 5-digit number (00001-99999)</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Example: <Badge variant="outline">25ALine100001</Badge> = 2025, January, Line1, #1
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {resetSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ticket counters reset successfully!
            </AlertDescription>
          </Alert>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Active Counters</h4>
            <Button
              onClick={handleResetAll}
              disabled={resetting || counters.length === 0}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Counters
                </>
              )}
            </Button>
          </div>

          {counters.length > 0 ? (
            <div className="space-y-2">
              {counters.map((counter) => (
                <div key={counter.id} className="p-3 border rounded-lg bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {counter.year} {counter.month} - {counter.line}
                    </p>
                    <p className="text-xs text-gray-600">
                      Last sequence: {(counter.lastSequence || 0).toString().padStart(5, '0')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Next ticket: <code className="bg-gray-200 px-1 rounded">
                        {counter.year.toString().slice(-2)}{counter.month}{counter.line}{((counter.lastSequence || 0) + 1).toString().padStart(5, '0')}
                      </code>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetLine(counter.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No counters yet. Counters will be created automatically when defects are reported.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}