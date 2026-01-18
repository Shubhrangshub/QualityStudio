import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentActivity({ defects, capas }) {
  const recentDefects = defects.slice(0, 3);
  const recentCAPAs = capas.slice(0, 2);

  const severityColors = {
    critical: "bg-red-100 text-red-800 border-red-200",
    major: "bg-orange-100 text-orange-800 border-orange-200",
    minor: "bg-yellow-100 text-yellow-800 border-yellow-200"
  };

  const statusColors = {
    open: "bg-gray-100 text-gray-800",
    rca_in_progress: "bg-blue-100 text-blue-800",
    capa_assigned: "bg-purple-100 text-purple-800",
    closed: "bg-green-100 text-green-800"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentDefects.map((defect) => (
          <Link
            key={defect.id}
            to={createPageUrl("DefectIntake")}
            className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-sm">
                  {defect.defectType?.replace(/_/g, ' ')}
                </span>
              </div>
              <Badge className={severityColors[defect.severity] || severityColors.minor}>
                {defect.severity}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Line {defect.line} • {defect.productCode}</p>
              <p>{format(new Date(defect.created_date), 'MMM d, HH:mm')}</p>
            </div>
            <Badge className={`${statusColors[defect.status]} mt-2`} variant="outline">
              {defect.status?.replace(/_/g, ' ')}
            </Badge>
          </Link>
        ))}

        {recentCAPAs.map((capa) => (
          <Link
            key={capa.id}
            to={createPageUrl("CAPAWorkspace")}
            className="block p-3 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-start gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm text-blue-900">
                  CAPA #{capa.id?.slice(0, 8)}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {capa.correctiveActions?.length || 0} CA • {capa.preventiveActions?.length || 0} PA
                </p>
              </div>
              <Badge className="bg-blue-200 text-blue-900 border-blue-300">
                {capa.approvalState}
              </Badge>
            </div>
            <p className="text-xs text-blue-600">
              {format(new Date(capa.created_date), 'MMM d, HH:mm')}
            </p>
          </Link>
        ))}

        {recentDefects.length === 0 && recentCAPAs.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        )}
      </CardContent>
    </Card>
  );
}