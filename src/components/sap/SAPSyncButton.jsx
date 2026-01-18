import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { api } from '@/api/apiClient';

export default function SAPSyncButton({ complaint, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const syncStatus = complaint?.sapIntegration?.sapSyncStatus || "not_synced";

  const handleSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      // Placeholder for future SAP integration
      // In production, this would call a backend function to sync with SAP
      
      // Simulate SAP sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock SAP response
      const sapData = {
        sapComplaintNumber: `SAP-${Date.now().toString().slice(-6)}`,
        sapSyncStatus: "synced",
        lastSyncDate: new Date().toISOString(),
        sapCustomerCode: `CUST-${Math.floor(Math.random() * 10000)}`,
        sapOrderNumber: complaint.rolls?.[0]?.soItem || "N/A"
      };

      await api.entities.CustomerComplaint.update(complaint.id, {
        sapIntegration: sapData
      });

      if (onSyncComplete) onSyncComplete(sapData);
    } catch (err) {
      console.error("SAP sync error:", err);
      setError(err.message || "Failed to sync with SAP");
      
      await api.entities.CustomerComplaint.update(complaint.id, {
        sapIntegration: {
          ...complaint.sapIntegration,
          sapSyncStatus: "failed",
          syncErrors: [err.message || "Unknown error"]
        }
      });
    }

    setSyncing(false);
  };

  const statusConfig = {
    not_synced: { 
      color: "bg-gray-100 text-gray-800", 
      icon: Clock, 
      label: "Not Synced" 
    },
    pending: { 
      color: "bg-yellow-100 text-yellow-800", 
      icon: Clock, 
      label: "Pending" 
    },
    synced: { 
      color: "bg-green-100 text-green-800", 
      icon: CheckCircle2, 
      label: "Synced" 
    },
    failed: { 
      color: "bg-red-100 text-red-800", 
      icon: XCircle, 
      label: "Failed" 
    }
  };

  const config = statusConfig[syncStatus] || statusConfig.not_synced;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge className={config.color}>
          <StatusIcon className="w-3 h-3 mr-1" />
          SAP: {config.label}
        </Badge>
        
        <Button
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          variant="outline"
          className="border-blue-300"
        >
          {syncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {syncStatus === "synced" ? "Re-sync" : "Sync"} with SAP
            </>
          )}
        </Button>
      </div>

      {complaint?.sapIntegration?.sapComplaintNumber && (
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>SAP Complaint #:</strong> {complaint.sapIntegration.sapComplaintNumber}</p>
          {complaint.sapIntegration.sapCustomerCode && (
            <p><strong>SAP Customer:</strong> {complaint.sapIntegration.sapCustomerCode}</p>
          )}
          {complaint.sapIntegration.lastSyncDate && (
            <p><strong>Last Sync:</strong> {new Date(complaint.sapIntegration.lastSyncDate).toLocaleString()}</p>
          )}
        </div>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {syncStatus === "failed" && complaint?.sapIntegration?.syncErrors?.length > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Sync Errors:</strong>
            <ul className="list-disc list-inside mt-1">
              {complaint.sapIntegration.syncErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}