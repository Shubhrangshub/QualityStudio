import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Target, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';

export default function CycleTimeAnalysis({ rcas, capas, defects }) {
  // Calculate RCA cycle times
  const rcaCycleTimes = rcas
    .filter(r => r.completedDate && r.created_date)
    .map(r => {
      const start = new Date(r.created_date);
      const end = new Date(r.completedDate);
      const days = (end - start) / (1000 * 60 * 60 * 24);
      return {
        id: r.id,
        days: days,
        month: format(start, 'MMM yyyy'),
        status: r.status
      };
    });

  const avgRCACycleTime = rcaCycleTimes.length > 0
    ? rcaCycleTimes.reduce((sum, r) => sum + r.days, 0) / rcaCycleTimes.length
    : 0;

  // Calculate CAPA cycle times
  const capaCycleTimes = capas
    .filter(c => c.created_date)
    .map(c => {
      const start = new Date(c.created_date);
      const allCompletionDates = [
        ...(c.correctiveActions || []).map(a => a.completionDate).filter(Boolean),
        ...(c.preventiveActions || []).map(a => a.completionDate).filter(Boolean)
      ];
      
      if (allCompletionDates.length === 0) return null;
      
      const lastCompletion = new Date(Math.max(...allCompletionDates.map(d => new Date(d))));
      const days = (lastCompletion - start) / (1000 * 60 * 60 * 24);
      
      return {
        id: c.id,
        days: days,
        month: format(start, 'MMM yyyy'),
        state: c.approvalState
      };
    })
    .filter(Boolean);

  const avgCAPACycleTime = capaCycleTimes.length > 0
    ? capaCycleTimes.reduce((sum, c) => sum + c.days, 0) / capaCycleTimes.length
    : 0;

  // Defect-to-RCA time
  const defectToRCATimes = rcas
    .map(r => {
      const defect = defects.find(d => d.id === r.defectTicketId);
      if (!defect) return null;
      
      const defectDate = new Date(defect.created_date);
      const rcaDate = new Date(r.created_date);
      const hours = (rcaDate - defectDate) / (1000 * 60 * 60);
      
      return {
        hours: hours,
        severity: defect.severity
      };
    })
    .filter(Boolean);

  const avgDefectToRCA = defectToRCATimes.length > 0
    ? defectToRCATimes.reduce((sum, d) => sum + d.hours, 0) / defectToRCATimes.length
    : 0;

  // Trend data by month
  const monthlyRCAData = rcaCycleTimes.reduce((acc, r) => {
    if (!acc[r.month]) {
      acc[r.month] = { month: r.month, count: 0, totalDays: 0 };
    }
    acc[r.month].count++;
    acc[r.month].totalDays += r.days;
    return acc;
  }, {});

  const rcaTrendData = Object.values(monthlyRCAData)
    .map(d => ({
      month: d.month,
      avgDays: (d.totalDays / d.count).toFixed(1),
      count: d.count
    }))
    .slice(-6);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg RCA Cycle Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {avgRCACycleTime.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500 opacity-30" />
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                {rcaCycleTimes.length} completed RCAs analyzed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg CAPA Cycle Time</p>
                <p className="text-3xl font-bold text-purple-600">
                  {avgCAPACycleTime.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>
              <Clock className="w-10 h-10 text-purple-500 opacity-30" />
            </div>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-gray-600">
                {capaCycleTimes.length} completed CAPAs analyzed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Defect → RCA Time</p>
                <p className="text-3xl font-bold text-orange-600">
                  {avgDefectToRCA.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">hours</p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-500 opacity-30" />
            </div>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <Badge className={avgDefectToRCA < 24 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                {avgDefectToRCA < 24 ? "Fast Response" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">On-Time Completion</p>
                <p className="text-3xl font-bold text-green-600">
                  {capas.length > 0 
                    ? ((capas.filter(c => {
                        const actions = [...(c.correctiveActions || []), ...(c.preventiveActions || [])];
                        const onTime = actions.filter(a => 
                          a.status === 'completed' && 
                          a.completionDate && 
                          new Date(a.completionDate) <= new Date(a.dueDate)
                        );
                        return onTime.length === actions.length;
                      }).length / capas.length) * 100).toFixed(0)
                    : 0
                  }%
                </p>
              </div>
              <Target className="w-10 h-10 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RCA Cycle Time Trend */}
      <Card>
        <CardHeader>
          <CardTitle>RCA Cycle Time Trend</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Average time to complete root cause analysis over time
          </p>
        </CardHeader>
        <CardContent>
          {rcaTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={rcaTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="right" dataKey="count" fill="#3b82f6" name="RCAs Completed" opacity={0.3} />
                <Line yAxisId="left" type="monotone" dataKey="avgDays" stroke="#10b981" strokeWidth={3} name="Avg Days" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Not enough data to show trend
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>RCA Cycle Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { range: '0-5 days', count: rcaCycleTimes.filter(r => r.days <= 5).length },
                { range: '6-10 days', count: rcaCycleTimes.filter(r => r.days > 5 && r.days <= 10).length },
                { range: '11-20 days', count: rcaCycleTimes.filter(r => r.days > 10 && r.days <= 20).length },
                { range: '20+ days', count: rcaCycleTimes.filter(r => r.days > 20).length }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                {
                  severity: 'Critical',
                  avgHours: defectToRCATimes.filter(d => d.severity === 'critical').length > 0
                    ? (defectToRCATimes.filter(d => d.severity === 'critical').reduce((s, d) => s + d.hours, 0) / 
                       defectToRCATimes.filter(d => d.severity === 'critical').length).toFixed(1)
                    : 0
                },
                {
                  severity: 'Major',
                  avgHours: defectToRCATimes.filter(d => d.severity === 'major').length > 0
                    ? (defectToRCATimes.filter(d => d.severity === 'major').reduce((s, d) => s + d.hours, 0) / 
                       defectToRCATimes.filter(d => d.severity === 'major').length).toFixed(1)
                    : 0
                },
                {
                  severity: 'Minor',
                  avgHours: defectToRCATimes.filter(d => d.severity === 'minor').length > 0
                    ? (defectToRCATimes.filter(d => d.severity === 'minor').reduce((s, d) => s + d.hours, 0) / 
                       defectToRCATimes.filter(d => d.severity === 'minor').length).toFixed(1)
                    : 0
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgHours" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Avg Hours to RCA" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}