import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function QFIRAnalytics({ complaints }) {
  // Calculate metrics
  const totalComplaints = complaints.length;
  const pendingQFIRs = complaints.filter(c => c.status === 'pending_qfir').length;
  const completedQFIRs = complaints.filter(c => c.status !== 'pending_qfir').length;
  const closedComplaints = complaints.filter(c => c.status === 'closed').length;
  
  const completionRate = totalComplaints > 0 ? ((completedQFIRs / totalComplaints) * 100).toFixed(1) : 0;
  const closureRate = totalComplaints > 0 ? ((closedComplaints / totalComplaints) * 100).toFixed(1) : 0;

  // Average time to resolve
  const resolvedComplaints = complaints.filter(c => c.closedDate && c.dateLogged);
  const avgResolutionTime = resolvedComplaints.length > 0
    ? Math.round(
        resolvedComplaints.reduce((sum, c) => {
          const logged = new Date(c.dateLogged);
          const closed = new Date(c.closedDate);
          return sum + (closed - logged) / (1000 * 60 * 60 * 24);
        }, 0) / resolvedComplaints.length
      )
    : 0;

  // Timeline data (last 6 months)
  const timelineData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const count = complaints.filter(c => {
      const loggedDate = new Date(c.dateLogged);
      return loggedDate >= monthStart && loggedDate <= monthEnd;
    }).length;
    
    timelineData.push({ month: monthName, complaints: count });
  }

  // Film type distribution
  const filmTypeData = complaints.reduce((acc, c) => {
    const type = c.filmType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const filmTypePieData = Object.entries(filmTypeData).map(([name, value]) => ({ name, value }));

  // Status distribution
  const statusData = complaints.reduce((acc, c) => {
    const status = c.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const statusBarData = Object.entries(statusData).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count
  }));

  // Role-based analytics (who logged most complaints)
  const loggerData = complaints.reduce((acc, c) => {
    const logger = c.loggedBy || 'Unknown';
    acc[logger] = (acc[logger] || 0) + 1;
    return acc;
  }, {});
  
  const topLoggers = Object.entries(loggerData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([logger, count]) => ({ logger, count }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{totalComplaints}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">QFIR Completion</p>
                <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-orange-600">{avgResolutionTime}d</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending QFIR</p>
                <p className="text-2xl font-bold text-red-600">{pendingQFIRs}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Complaints Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="complaints" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Film Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Film Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filmTypePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {filmTypePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role-Based Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Top Contributors (Sales)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topLoggers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <p className="font-medium text-sm">{item.logger}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{item.count} complaints</Badge>
                </div>
              ))}
              {topLoggers.length === 0 && (
                <p className="text-center text-gray-500 py-8">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Closure Rate</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{closureRate}%</p>
              <p className="text-xs text-green-600 mt-1">{closedComplaints} of {totalComplaints} closed</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {complaints.filter(c => ['allocated', 'in_investigation', 'rca_in_progress', 'capa_assigned'].includes(c.status)).length}
              </p>
              <p className="text-xs text-blue-600 mt-1">Active investigations</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 font-medium">Avg Lead Time</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {complaints.length > 0 
                  ? Math.round(complaints.reduce((sum, c) => {
                      const logged = new Date(c.dateLogged);
                      const now = c.closedDate ? new Date(c.closedDate) : new Date();
                      return sum + (now - logged) / (1000 * 60 * 60 * 24);
                    }, 0) / complaints.length)
                  : 0}d
              </p>
              <p className="text-xs text-orange-600 mt-1">From log to resolution</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}