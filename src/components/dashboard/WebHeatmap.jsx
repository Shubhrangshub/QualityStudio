import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function WebHeatmap({ defects }) {
  // Create heatmap grid (10x10 for MD/CD)
  const gridSize = 10;
  const heatmapData = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));

  defects.forEach(d => {
    if (d.webPositionMD !== undefined && d.webPositionCD !== undefined) {
      // Normalize to grid coordinates
      const mdIndex = Math.min(Math.floor((d.webPositionMD % 10)), gridSize - 1);
      const cdIndex = Math.min(Math.floor(d.webPositionCD / 100), gridSize - 1);
      if (mdIndex >= 0 && cdIndex >= 0) {
        heatmapData[cdIndex][mdIndex]++;
      }
    }
  });

  const maxCount = Math.max(...heatmapData.flat());

  const getColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    const intensity = Math.min((count / maxCount) * 100, 100);
    if (intensity > 75) return 'bg-red-500';
    if (intensity > 50) return 'bg-orange-500';
    if (intensity > 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-600" />
          Web Position Heatmap
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Defect distribution across web (MD/CD)</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600">CD →</span>
          </div>
          {heatmapData.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((count, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`w-full aspect-square ${getColor(count)} rounded transition-colors hover:opacity-75`}
                  title={`Position: MD ${colIdx}, CD ${rowIdx} - Count: ${count}`}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-600">MD ↓</span>
          </div>
          <div className="flex items-center gap-3 mt-4 justify-end">
            <span className="text-xs text-gray-600">Low</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <div className="w-4 h-4 bg-orange-500 rounded" />
              <div className="w-4 h-4 bg-red-500 rounded" />
            </div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}