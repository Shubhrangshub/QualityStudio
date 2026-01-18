import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Play, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DefectSelector({ defects, onSelect, isLoading }) {
  const severityColors = {
    critical: "bg-red-100 text-red-800 border-red-300",
    major: "bg-orange-100 text-orange-800 border-orange-300",
    minor: "bg-yellow-100 text-yellow-800 border-yellow-300"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Defect for RCA</CardTitle>
        <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900 font-medium mb-2">📋 How to start an RCA:</p>
          <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Choose an open defect from the list below</li>
            <li>Click "Start RCA" to begin root cause analysis</li>
            <li>Use AI suggestions and analysis tools to investigate</li>
            <li>Complete the RCA to generate CAPA actions</li>
          </ol>
        </div>
      </CardHeader>
      <CardContent>
        {defects.length > 0 ? (
          <div className="space-y-3">
            {defects.map((defect) => (
              <div
                key={defect.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">
                        {defect.defectType?.replace(/_/g, ' ')}
                      </span>
                      <Badge className={severityColors[defect.severity]}>
                        {defect.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Line: {defect.line} • Product: {defect.productCode}</p>
                      <p>Date: {format(new Date(defect.dateTime || defect.created_date), 'MMM d, yyyy HH:mm')}</p>
                      {defect.operator && <p>Operator: {defect.operator}</p>}
                    </div>
                  </div>
                  <Button
                    onClick={() => onSelect(defect.id)}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start RCA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium text-lg mb-2">No Open Defects Available</p>
            <p className="text-gray-600 text-sm mb-6">
              You need to report a defect first before starting an RCA.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link to={createPageUrl("DefectIntake")}>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Go to Defect Intake
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="p-4 bg-gray-50 rounded-lg border max-w-md">
                <p className="text-xs text-gray-700">
                  <strong>Tip:</strong> The RCA (Root Cause Analysis) process starts after a defect is reported. 
                  Go to Defect Intake to log a quality issue, then return here to analyze it.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}