import React from "react";
import { Shield } from "lucide-react";
import RolePermissionsManager from "../components/admin/RolePermissionsManager";

export default function RolePermissions() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Role Permissions
          </h1>
          <p className="text-gray-600 mt-1">Configure access control for each role</p>
        </div>

        <RolePermissionsManager />
      </div>
    </div>
  );
}