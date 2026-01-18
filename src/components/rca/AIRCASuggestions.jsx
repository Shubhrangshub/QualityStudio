import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, TestTube, Info } from "lucide-react";

export default function AIRCASuggestions({ suggestions }) {
  if (!suggestions?.rootCauses) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Top Root Causes (AI-Ranked)
        </h3>
        <div className="space-y-3">
          {suggestions.rootCauses.map((cause, idx) => (
            <Card key={idx} className="p-4 bg-white border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{cause.cause}</span>
                    <Badge className="bg-purple-200 text-purple-900">
                      {(cause.likelihood * 100).toFixed(0)}% likely
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Category:</strong> {cause.category}
                  </p>
                </div>
              </div>

              {cause.historicalEvidence && (
                <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{cause.historicalEvidence}</p>
                  </div>
                </div>
              )}

              {cause.suggestedTests && cause.suggestedTests.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <TestTube className="w-4 h-4" />
                    Suggested Tests:
                  </p>
                  <ul className="space-y-1">
                    {cause.suggestedTests.map((test, tidx) => (
                      <li key={tidx} className="text-sm text-gray-600 pl-4">
                        • {test}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}