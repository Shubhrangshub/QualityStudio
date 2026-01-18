import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Settings, Shield } from "lucide-react";

const AVAILABLE_SECTIONS = [
  { id: "sales", label: "Customer & Sales", pages: ["SalesComplaintLog", "QFIRForm"] },
  { id: "core", label: "Quality Workflow", pages: ["Dashboard", "QualityOverview", "DefectIntake", "RCAStudio", "CAPAWorkspace"] },
  { id: "tools", label: "Process Excellence", pages: ["SPCCapability", "DoEDesigner", "SOPLibrary"] },
  { id: "ai", label: "AI & Knowledge", pages: ["DataUpload", "AIHub", "KnowledgeSearch"] },
  { id: "admin", label: "Administration", pages: ["Admin"] }
];

const PREDEFINED_ROLES = [
  { value: "Admin", label: "Admin", color: "bg-purple-100 text-purple-800" },
  { value: "Sales", label: "Sales", color: "bg-orange-100 text-orange-800" },
  { value: "Quality Lead", label: "Quality Lead", color: "bg-blue-100 text-blue-800" },
  { value: "Process Engineer", label: "Process Engineer", color: "bg-green-100 text-green-800" },
  { value: "Shift QC", label: "Shift QC", color: "bg-yellow-100 text-yellow-800" },
  { value: "Operator", label: "Operator", color: "bg-gray-100 text-gray-800" }
];

export default function RolePermissionsManager() {
  const [selectedRole, setSelectedRole] = useState("Sales");
  const [permissions, setPermissions] = useState({ allowedSections: [], allowedPages: [] });
  const [saveResult, setSaveResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: () => api.entities.RolePermissions.list(),
  });

  React.useEffect(() => {
    const rolePerms = rolePermissions.find(rp => rp.role === selectedRole);
    if (rolePerms) {
      setPermissions({
        allowedSections: rolePerms.allowedSections || [],
        allowedPages: rolePerms.allowedPages || []
      });
    } else {
      // Default permissions
      if (selectedRole === "Admin") {
        setPermissions({
          allowedSections: ["sales", "core", "tools", "ai", "admin"],
          allowedPages: AVAILABLE_SECTIONS.flatMap(s => s.pages)
        });
      } else if (selectedRole === "Sales") {
        setPermissions({
          allowedSections: ["sales"],
          allowedPages: ["SalesComplaintLog", "QFIRForm"]
        });
      } else {
        setPermissions({
          allowedSections: ["core", "tools"],
          allowedPages: ["Dashboard", "QualityOverview", "DefectIntake", "RCAStudio", "CAPAWorkspace", "SPCCapability", "DoEDesigner", "SOPLibrary"]
        });
      }
    }
  }, [selectedRole, rolePermissions]);

  const savePermissionsMutation = useMutation({
    mutationFn: async (data) => {
      const existing = rolePermissions.find(rp => rp.role === selectedRole);
      if (existing) {
        return api.entities.RolePermissions.update(existing.id, data);
      } else {
        return api.entities.RolePermissions.create({ ...data, role: selectedRole });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setSaveResult({ success: true, message: "Permissions saved successfully" });
      setTimeout(() => setSaveResult(null), 3000);
    },
    onError: (error) => {
      setSaveResult({ success: false, message: error.message || "Failed to save" });
    }
  });

  const handleSectionToggle = (sectionId) => {
    const section = AVAILABLE_SECTIONS.find(s => s.id === sectionId);
    const isCurrentlySelected = permissions.allowedSections.includes(sectionId);

    if (isCurrentlySelected) {
      setPermissions({
        allowedSections: permissions.allowedSections.filter(s => s !== sectionId),
        allowedPages: permissions.allowedPages.filter(p => !section.pages.includes(p))
      });
    } else {
      setPermissions({
        allowedSections: [...permissions.allowedSections, sectionId],
        allowedPages: [...new Set([...permissions.allowedPages, ...section.pages])]
      });
    }
  };

  const handlePageToggle = (pageName) => {
    if (permissions.allowedPages.includes(pageName)) {
      setPermissions({
        ...permissions,
        allowedPages: permissions.allowedPages.filter(p => p !== pageName)
      });
    } else {
      setPermissions({
        ...permissions,
        allowedPages: [...permissions.allowedPages, pageName]
      });
    }
  };

  const handleSave = () => {
    savePermissionsMutation.mutate(permissions);
  };

  return (
    <div className="space-y-6">
      {saveResult && (
        <Alert className={`${saveResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CheckCircle2 className={`h-4 w-4 ${saveResult.success ? 'text-green-600' : 'text-red-600'}`} />
          <AlertDescription className={saveResult.success ? 'text-green-800' : 'text-red-800'}>
            {saveResult.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <CardTitle>Role-Based Access Control</CardTitle>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure which sections and pages each role can access. Changes apply to all users with that role.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <Label className="mb-3 block">Select Role to Configure</Label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_ROLES.map(role => (
                  <Button
                    key={role.value}
                    variant={selectedRole === role.value ? "default" : "outline"}
                    onClick={() => setSelectedRole(role.value)}
                    className={selectedRole === role.value ? "" : ""}
                  >
                    <Badge className={`${role.color} mr-2`}>{role.label}</Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Permissions for <Badge className={PREDEFINED_ROLES.find(r => r.value === selectedRole)?.color}>{selectedRole}</Badge>
              </h3>

              <div className="space-y-6">
                {AVAILABLE_SECTIONS.map(section => (
                  <div key={section.id} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center gap-3 mb-4">
                      <Checkbox
                        id={`section-${section.id}`}
                        checked={permissions.allowedSections.includes(section.id)}
                        onCheckedChange={() => handleSectionToggle(section.id)}
                      />
                      <Label htmlFor={`section-${section.id}`} className="font-semibold text-base cursor-pointer">
                        {section.label}
                      </Label>
                      {permissions.allowedSections.includes(section.id) && (
                        <Badge className="bg-green-100 text-green-800 ml-auto">Enabled</Badge>
                      )}
                    </div>

                    <div className="ml-8 space-y-2">
                      {section.pages.map(page => (
                        <div key={page} className="flex items-center gap-3">
                          <Checkbox
                            id={`page-${page}`}
                            checked={permissions.allowedPages.includes(page)}
                            onCheckedChange={() => handlePageToggle(page)}
                          />
                          <Label htmlFor={`page-${page}`} className="text-sm cursor-pointer">
                            {page.replace(/([A-Z])/g, ' $1').trim()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSave}
                disabled={savePermissionsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}