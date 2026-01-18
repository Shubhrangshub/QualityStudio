import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Mail, Plus, Trash2, Edit, Power, PowerOff } from "lucide-react";
import { format } from "date-fns";

export default function ReportScheduler({ 
  schedules = [], 
  onSave,
  onDelete,
  onToggleActive,
  reportConfig 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [frequency, setFrequency] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState("08:00");
  const [recipients, setRecipients] = useState("");
  const [reportFormat, setReportFormat] = useState("pdf");

  const handleSave = () => {
    const schedule = {
      ...reportConfig,
      schedule: {
        frequency,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
        time
      },
      recipients: recipients.split(',').map(email => email.trim()).filter(Boolean),
      format: reportFormat,
      active: true
    };

    onSave(schedule);
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFrequency("weekly");
    setDayOfWeek("monday");
    setDayOfMonth(1);
    setTime("08:00");
    setRecipients("");
    setReportFormat("pdf");
    setEditingSchedule(null);
  };

  const getScheduleDescription = (schedule) => {
    const { frequency, dayOfWeek, dayOfMonth, time } = schedule.schedule;
    
    if (frequency === "daily") {
      return `Daily at ${time}`;
    } else if (frequency === "weekly") {
      return `Every ${dayOfWeek} at ${time}`;
    } else if (frequency === "monthly") {
      return `Monthly on day ${dayOfMonth} at ${time}`;
    } else if (frequency === "quarterly") {
      return `Quarterly at ${time}`;
    }
    return "Custom schedule";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Scheduled Reports</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Custom Report</DialogTitle>
              <DialogDescription>
                Set up automatic delivery of this report to specified recipients
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Frequency */}
              <div>
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day Selection */}
              {frequency === "weekly" && (
                <div>
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                        <SelectItem key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === "monthly" && (
                <div>
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>
              )}

              {/* Time */}
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Recipients */}
              <div>
                <Label>Recipients</Label>
                <Input
                  placeholder="email1@company.com, email2@company.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>

              {/* Format */}
              <div>
                <Label>Report Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Attachment</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="email_summary">Email Summary (no attachment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!recipients.trim()}>
                Save Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports List */}
      <div className="space-y-3">
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <Card key={schedule.id} className={schedule.active ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{schedule.reportName}</h4>
                      <Badge variant={schedule.active ? "default" : "secondary"}>
                        {schedule.active ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline">{schedule.format.toUpperCase()}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getScheduleDescription(schedule)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {schedule.recipients.length} recipient{schedule.recipients.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    {schedule.lastRun && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last run: {format(new Date(schedule.lastRun), 'MMM d, yyyy HH:mm')}
                      </p>
                    )}
                    {schedule.nextRun && (
                      <p className="text-xs text-gray-500">
                        Next run: {format(new Date(schedule.nextRun), 'MMM d, yyyy HH:mm')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(schedule.id, !schedule.active)}
                    >
                      {schedule.active ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement edit
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(schedule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No scheduled reports yet</p>
              <p className="text-sm text-gray-400">
                Set up automatic report delivery by clicking "Schedule Report" above
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}