import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function TrendChart({ kpis }) {
  const chartData = kpis
    .slice(0, 30)
    .reverse()
    .map(kpi => ({
      date: format(new Date(kpi.recordDate), 'MMM d'),
      FPY: kpi.firstPassYield,
      Cpk: kpi.cpk ? kpi.cpk * 20 : null, // Scale Cpk for visibility
      PPM: kpi.defectPPM ? kpi.defectPPM / 10 : null
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Quality Trends
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">Key metrics over time</p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="FPY" 
                stroke="#10b981" 
                strokeWidth={2}
                name="First Pass Yield (%)"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Cpk" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Cpk (×20)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No trend data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}