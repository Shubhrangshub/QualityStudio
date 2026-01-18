import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CorrelationHeatmap({ correlationMatrix, parameters }) {
  if (!correlationMatrix || !parameters || parameters.length === 0) {
    return null;
  }

  const getCellColor = (value) => {
    if (value === null || value === undefined) return 'bg-gray-100';
    const absValue = Math.abs(value);
    if (absValue > 0.8) return value > 0 ? 'bg-green-600' : 'bg-red-600';
    if (absValue > 0.6) return value > 0 ? 'bg-green-500' : 'bg-red-500';
    if (absValue > 0.4) return value > 0 ? 'bg-green-400' : 'bg-red-400';
    if (absValue > 0.2) return value > 0 ? 'bg-green-300' : 'bg-red-300';
    return 'bg-gray-200';
  };

  const getTextColor = (value) => {
    if (value === null || value === undefined) return 'text-gray-600';
    const absValue = Math.abs(value);
    return absValue > 0.5 ? 'text-white' : 'text-gray-900';
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔥 Correlation Heatmap
        </CardTitle>
        <div className="flex gap-2 items-center text-xs mt-2">
          <span>Legend:</span>
          <div className="flex gap-1 items-center">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Strong +</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Strong -</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Weak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-xs font-medium text-gray-700 border bg-gray-50 sticky left-0 z-10"></th>
                {parameters.map((param, idx) => (
                  <th key={idx} className="p-3 text-xs font-semibold text-gray-900 border bg-gray-50 min-w-[100px] max-w-[120px] h-[80px] align-bottom">
                    <div className="whitespace-normal break-words text-center leading-tight">
                      {param}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parameters.map((paramY, idxY) => (
                <tr key={idxY}>
                  <td className="p-2 text-xs font-medium text-gray-700 border bg-gray-50 sticky left-0 z-10 whitespace-nowrap">
                    {paramY}
                  </td>
                  {parameters.map((paramX, idxX) => {
                    const value = correlationMatrix[paramY]?.[paramX];
                    const displayValue = value !== null && value !== undefined ? value.toFixed(2) : '-';
                    return (
                      <td
                        key={idxX}
                        className={`p-2 text-center text-xs font-semibold border ${getCellColor(value)} ${getTextColor(value)}`}
                        title={`${paramY} vs ${paramX}: ${displayValue}`}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}