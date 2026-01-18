import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AIClassification({ isLoading, result }) {
  if (isLoading) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            <div>
              <p className="font-medium text-purple-900">AI Analyzing Defect...</p>
              <p className="text-sm text-purple-700 mt-1">
                Classifying defect type and suggesting corrective actions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Classification Results
          <Badge className="ml-auto bg-purple-200 text-purple-900">
            {(result.confidence * 100).toFixed(0)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Detected Defect Type:</p>
          <Badge className="bg-purple-600 text-white text-base px-3 py-1">
            {result.defectType?.replace(/_/g, ' ')}
          </Badge>
        </div>

        {result.reasoning && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Analysis:</p>
            <p className="text-sm text-gray-600">{result.reasoning}</p>
          </div>
        )}

        {result.quickChecks && result.quickChecks.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Recommended Quick Checks:</p>
            <div className="space-y-2">
              {result.quickChecks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-purple-200">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{check}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm text-blue-900">
            💡 Review AI suggestions and adjust parameters accordingly. Document any changes made.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}