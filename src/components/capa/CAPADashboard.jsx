import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Clock, CheckCircle2, AlertTriangle, 
  BarChart3, Target, Activity, FileText, Download
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { Button } from "@/components/ui/button";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export default function CAPADashboard({ capas, defects }) {
  const analytics = useMemo(() => {
    // Status distribution
    const statusCount = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      rejected: 0,
      closed: 0
    };
    
    capas.forEach(capa => {
      statusCount[capa.approvalState] = (statusCount[capa.approvalState] || 0) + 1;
    });

    // Problem type trends
    const problemTypes = {};
    capas.forEach(capa => {
      const defect = defects.find(d => d.id === capa.defectTicketId);
      if (defect?.defectType) {
        const type = defect.defectType.replace(/_/g, ' ');
        problemTypes[type] = (problemTypes[type] || 0) + 1;
      }
    });

    // Average closure time
    const closedCapas = capas.filter(c => c.approvalState === 'closed');
    const avgClosureTime = closedCapas.length > 0
      ? Math.round(
          closedCapas.reduce((sum, capa) => {
            const created = new Date(capa.created_date);
            const closed = capa.effectivenessCheck?.verifiedAt 
              ? new Date(capa.effectivenessCheck.verifiedAt)
              : new Date();
            return sum + differenceInDays(closed, created);
          }, 0) / closedCapas.length
        )
      : 0;

    // Monthly trend
    const monthlyData = {};
    capas.forEach(capa => {
      const month = format(new Date(capa.created_date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { month, opened: 0, closed: 0 };
      }
      monthlyData[month].opened += 1;
      if (capa.approvalState === 'closed') {
        monthlyData[month].closed += 1;
      }
    });

    // Effectiveness rate
    const evaluatedCapas = capas.filter(c => c.effectivenessCheck?.effective !== null && c.effectivenessCheck?.effective !== undefined);
    const effectiveCount = evaluatedCapas.filter(c => c.effectivenessCheck.effective === true).length;
    const effectivenessRate = evaluatedCapas.length > 0 
      ? Math.round((effectiveCount / evaluatedCapas.length) * 100)
      : 0;

    // Action completion rate
    let totalActions = 0;
    let completedActions = 0;
    capas.forEach(capa => {
      const actions = [...(capa.correctiveActions || []), ...(capa.preventiveActions || [])];
      totalActions += actions.length;
      completedActions += actions.filter(a => a.status === 'completed' || a.status === 'verified').length;
    });
    const actionCompletionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // RPN distribution
    const rpnRanges = { 'Low (1-100)': 0, 'Medium (101-200)': 0, 'High (201-400)': 0, 'Critical (400+)': 0 };
    capas.forEach(capa => {
      const rpn = capa.fmea?.rpn || 0;
      if (rpn <= 100) rpnRanges['Low (1-100)']++;
      else if (rpn <= 200) rpnRanges['Medium (101-200)']++;
      else if (rpn <= 400) rpnRanges['High (201-400)']++;
      else rpnRanges['Critical (400+)']++;
    });

    return {
      statusCount,
      problemTypes,
      avgClosureTime,
      monthlyData: Object.values(monthlyData).slice(-6),
      effectivenessRate,
      actionCompletionRate,
      rpnRanges,
      totalCapas: capas.length,
      openCapas: capas.filter(c => c.approvalState !== 'closed').length,
      overdueCapas: capas.filter(c => {
        if (c.approvalState === 'closed') return false;
        const actions = [...(c.correctiveActions || []), ...(c.preventiveActions || [])];
        return actions.some(a => a.status !== 'completed' && new Date(a.dueDate) < new Date());
      }).length
    };
  }, [capas, defects]);

  const exportToCSV = () => {
    const headers = [
      'CAPA ID',
      'Status',
      'Created Date',
      'Defect Type',
      'RPN',
      'Corrective Actions',
      'Preventive Actions',
      'Effective',
      'Days to Close'
    ];

    const rows = capas.map(capa => {
      const defect = defects.find(d => d.id === capa.defectTicketId);
      const daysToClose = capa.approvalState === 'closed' && capa.effectivenessCheck?.verifiedAt
        ? differenceInDays(new Date(capa.effectivenessCheck.verifiedAt), new Date(capa.created_date))
        : 'N/A';

      return [
        capa.id,
        capa.approvalState,
        format(new Date(capa.created_date), 'yyyy-MM-dd'),
        defect?.defectType || 'N/A',
        capa.fmea?.rpn || 'N/A',
        capa.correctiveActions?.length || 0,
        capa.preventiveActions?.length || 0,
        capa.effectivenessCheck?.effective === true ? 'Yes' : capa.effectivenessCheck?.effective === false ? 'No' : 'Not Evaluated',
        daysToClose
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAPA-Data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusData = Object.entries(analytics.statusCount).map(([key, value]) => ({
    name: key.replace(/_/g, ' '),
    value
  }));

  const problemTypeData = Object.entries(analytics.problemTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const rpnData = Object.entries(analytics.rpnRanges).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CAPA Executive Dashboard</h2>
          <p className="text-gray-600 text-sm mt-1">Performance metrics and trends</p>
        </div>
        <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase">Total CAPAs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalCapas}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase">Avg Closure Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.avgClosureTime}d</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase">Effectiveness Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{analytics.effectivenessRate}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 uppercase">Action Completion</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{analytics.actionCompletionRate}%</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              CAPA Trends (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" style={{ fontSize: 12 }} />
                <YAxis style={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" stroke="#3b82f6" name="Opened" strokeWidth={2} />
                <Line type="monotone" dataKey="closed" stroke="#10b981" name="Closed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              CAPA Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Problem Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Top 5 Problem Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={problemTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis style={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RPN Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Risk (RPN) Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rpnData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: 11 }} />
                <YAxis style={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" name="CAPAs" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-900 font-medium">Open CAPAs</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{analytics.openCapas}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-900 font-medium">Overdue CAPAs</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{analytics.overdueCapas}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-900 font-medium">Closed CAPAs</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{analytics.statusCount.closed}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}