import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DefectPareto({ defects }) {
  // Count defects by type
  const defectCounts = {};
  defects.forEach(d => {
    const type = d.defectType?.replace(/_/g, ' ') || 'Unknown';
    defectCounts[type] = (defectCounts[type] || 0) + 1;
  });

  // Sort and prepare data
  const chartData = Object.entries(defectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([type, count]) => ({
      name: type,
      count: count
    }));

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Defect Pareto Chart
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Top defects by occurrence</p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No defect data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}