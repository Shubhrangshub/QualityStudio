import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, CheckCircle2, Loader2, Database, Lock, Globe } from "lucide-react";

export default function SAPConfiguration() {
  const [editMode, setEditMode] = useState(false);
  const [configs, setConfigs] = useState({
    sap_endpoint: "",
    sap_client: "",
    sap_username: "",
    sap_company_code: "",
    sync_frequency: "manual"
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const queryClient = useQueryClient();

  const { data: sapConfigs = [] } = useQuery({
    queryKey: ['sap-configs'],
    queryFn: () => base44.entities.SAPConfig.list("-created_date", 50),
  });

  React.useEffect(() => {
    if (sapConfigs.length > 0) {
      const configMap = {};
      sapConfigs.forEach(c => {
        configMap[c.configKey] = c.configValue;
      });
      setConfigs(prev => ({ ...prev, ...configMap }));
    }
  }, [sapConfigs]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const updates = [];

      for (const [key, value] of Object.entries(data)) {
        const existing = sapConfigs.find(c => c.configKey === key);
        if (existing) {
          updates.push(
            base44.entities.SAPConfig.update(existing.id, {
              configValue: value,
              lastUpdated: new Date().toISOString(),
              updatedBy: user.email
            })
          );
        } else {
          updates.push(
            base44.entities.SAPConfig.create({
              configKey: key,
              configValue: value,
              isActive: true,
              description: `SAP ${key.replace(/_/g, ' ')}`,
              lastUpdated: new Date().toISOString(),
              updatedBy: user.email
            })
          );
        }
      }

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-configs'] });
      setSaveSuccess(true);
      setEditMode(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  });

  const handleSave = () => {
    saveConfigMutation.mutate(configs);
  };

  const testConnection = async () => {
    alert("SAP Connection Test\n\nThis would test connectivity to SAP ERP system.\nRequires backend implementation with SAP RFC/OData.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          SAP Integration Configuration
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Configure SAP ERP connection for automated data synchronization
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              SAP configuration saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Integration Status:</strong> Framework ready for SAP backend implementation
            <br />
            <span className="text-xs mt-1 block">
              Requires backend functions enabled for live SAP connectivity (RFC, OData, or REST API)
            </span>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              SAP Endpoint URL
            </Label>
            <Input
              value={configs.sap_endpoint}
              onChange={(e) => setConfigs({ ...configs, sap_endpoint: e.target.value })}
              placeholder="https://sap-server:port/sap/opu/odata/..."
              disabled={!editMode}
            />
          </div>
          <div>
            <Label>SAP Client</Label>
            <Input
              value={configs.sap_client}
              onChange={(e) => setConfigs({ ...configs, sap_client: e.target.value })}
              placeholder="e.g., 100, 200"
              disabled={!editMode}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              SAP Username
            </Label>
            <Input
              value={configs.sap_username}
              onChange={(e) => setConfigs({ ...configs, sap_username: e.target.value })}
              placeholder="Service account username"
              disabled={!editMode}
            />
            <p className="text-xs text-gray-500 mt-1">
              Password should be stored in secure backend secrets
            </p>
          </div>
          <div>
            <Label>Company Code</Label>
            <Input
              value={configs.sap_company_code}
              onChange={(e) => setConfigs({ ...configs, sap_company_code: e.target.value })}
              placeholder="e.g., 1000"
              disabled={!editMode}
            />
          </div>
          <div>
            <Label>Sync Frequency</Label>
            <select
              value={configs.sync_frequency}
              onChange={(e) => setConfigs({ ...configs, sync_frequency: e.target.value })}
              disabled={!editMode}
              className="w-full p-2 border rounded-md"
            >
              <option value="manual">Manual</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="realtime">Real-time (with backend)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3">SAP Data Mappings</h4>
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Complaint → SAP Quality Notification</p>
              <p className="text-xs text-gray-600 mt-1">Maps customer complaints to SAP QM module (Transaction: QM01)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">QFIR → SAP Inspection Lot</p>
              <p className="text-xs text-gray-600 mt-1">Links QFIR data with SAP inspection results (Transaction: QA01)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Sales Order Data</p>
              <p className="text-xs text-gray-600 mt-1">Pulls order, material, and customer data (Transaction: VA03)</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!editMode ? (
            <>
              <Button onClick={() => setEditMode(true)} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Edit Configuration
              </Button>
              <Button onClick={testConnection} variant="outline">
                Test Connection
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleSave}
                disabled={saveConfigMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
              <Button onClick={() => setEditMode(false)} variant="outline">
                Cancel
              </Button>
            </>
          )}
        </div>

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800 text-xs">
            <strong>Note:</strong> SAP integration requires backend functions to be enabled. 
            The current implementation provides UI framework and data structure. 
            Contact your administrator to enable backend functions for live SAP connectivity.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}