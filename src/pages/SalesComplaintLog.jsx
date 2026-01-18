import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, Loader2, CheckCircle2, Plus, X, Camera, Video, Mic, Database } from "lucide-react";
import SAPSyncButton from "../components/sap/SAPSyncButton";

export default function SalesComplaintLog() {
  const [formData, setFormData] = useState({
    customerName: "",
    endCustomer: "",
    issueDescription: "",
    filmType: "Window",
    materialCode: "",
    productType: "",
    rolls: [{
      rollNumber: "",
      qtyInvoiceLsf: "",
      sizeOfRoll: "",
      dispQtyLsf: "",
      soItem: "",
      despatchDate: ""
    }]
  });
  const [evidence, setEvidence] = useState({
    images: [],
    videos: [],
    audio: []
  });
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();

  const createComplaintMutation = useMutation({
    mutationFn: async (data) => {
      const ticketNum = await generateTicketNumber(data.filmType);
      const user = await base44.auth.me();
      
      // Create date in IST
      const istDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      
      const complaint = await base44.entities.CustomerComplaint.create({
        ...data,
        ticketNumber: ticketNum,
        loggedBy: user.email,
        dateLogged: new Date().toISOString(),
        dateLoggedIST: istDate,
        evidence,
        status: "pending_qfir",
        responsiblePerson: "Quality Head"
      });

      // Notify Quality Head (placeholder - would integrate with email/notification system)
      await notifyQualityHead(complaint);

      return { complaint, ticketNum };
    },
    onSuccess: ({ ticketNum }) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['pending-qfirs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-complaints'] });
      queryClient.invalidateQueries({ queryKey: ['all-qfir-complaints'] });
      setSuccess(true);
      setTicketNumber(ticketNum);
      setError(null);
      setTimeout(() => {
        resetForm();
      }, 5000);
    },
    onError: (error) => {
      console.error("Complaint submission error:", error);
      setError(error.message || "Failed to submit complaint. Please try again.");
      setSuccess(false);
    }
  });

  const generateTicketNumber = async (filmType) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const filmCode = filmType === "Window" ? "W" : "P";

    const counters = await base44.entities.ComplaintCounter.filter({
      year: parseInt('20' + year),
      month: parseInt(month),
      filmType: filmCode
    });

    let sequence = 1;
    if (counters.length > 0) {
      const counter = counters[0];
      sequence = (counter.lastSequence || 0) + 1;
      await base44.entities.ComplaintCounter.update(counter.id, { lastSequence: sequence });
    } else {
      await base44.entities.ComplaintCounter.create({
        year: parseInt('20' + year),
        month: parseInt(month),
        filmType: filmCode,
        lastSequence: 1
      });
    }

    return `${year}${month}${filmCode}${sequence.toString().padStart(6, '0')}`;
  };

  const notifyQualityHead = async (complaint) => {
    try {
      // Get all admin and Quality Lead users
      const users = await base44.entities.User.list();
      const qualityUsers = users.filter(u => 
        u.role === 'admin' || 
        u.customRole === 'Quality Lead' || 
        u.customRole === 'Admin'
      );

      // Send email to each quality user
      for (const user of qualityUsers) {
        if (user.email) {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: `🚨 New Customer Complaint - QFIR Required: ${complaint.ticketNumber}`,
            body: `
A new customer complaint has been logged and requires your attention.

COMPLAINT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket Number: ${complaint.ticketNumber}
Customer: ${complaint.customerName}
Film Type: ${complaint.filmType}
Issue: ${complaint.issueDescription}
Logged At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED:
Please complete the QFIR (Quality First Information Report) form for this complaint.

This is an automated notification from the Quality Management System.
            `
          });
        }
      }
      console.log(`Notifications sent to ${qualityUsers.length} quality users`);
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  };

  const handleFileUpload = async (files, type) => {
    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setEvidence(prev => ({
      ...prev,
      [type]: [...prev[type], ...uploadedUrls]
    }));
    setUploading(false);
  };

  const addRoll = () => {
    setFormData(prev => ({
      ...prev,
      rolls: [...prev.rolls, {
        rollNumber: "",
        qtyInvoiceLsf: "",
        sizeOfRoll: "",
        dispQtyLsf: "",
        soItem: "",
        despatchDate: ""
      }]
    }));
  };

  const removeRoll = (index) => {
    setFormData(prev => ({
      ...prev,
      rolls: prev.rolls.filter((_, i) => i !== index)
    }));
  };

  const updateRoll = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      rolls: prev.rolls.map((roll, i) =>
        i === index ? { ...roll, [field]: value } : roll
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createComplaintMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      endCustomer: "",
      issueDescription: "",
      filmType: "Window",
      materialCode: "",
      productType: "",
      rolls: [{
        rollNumber: "",
        qtyInvoiceLsf: "",
        sizeOfRoll: "",
        dispQtyLsf: "",
        soItem: "",
        despatchDate: ""
      }]
    });
    setEvidence({ images: [], videos: [], audio: [] });
    setSuccess(false);
    setTicketNumber("");
    setError(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Log Customer Complaint
          </h1>
          <p className="text-gray-600 mt-1">Report quality issues from customers</p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Complaint logged successfully!</strong><br />
              Ticket Number: <span className="font-bold">{ticketNumber}</span><br />
              Quality Head has been notified.
            </AlertDescription>
          </Alert>
          )}

          {success && (
          <Card className="mb-6 border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-blue-600" />
                SAP Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Sync this complaint with SAP Quality Management module
              </p>
              <SAPSyncButton 
                complaint={{ id: "temp", ticketNumber }} 
                onSyncComplete={(data) => console.log("SAP synced:", data)}
              />
            </CardContent>
          </Card>
          )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <Label>End Customer</Label>
                  <Input
                    value={formData.endCustomer}
                    onChange={(e) => setFormData({...formData, endCustomer: e.target.value})}
                    placeholder="End customer name"
                  />
                </div>
              </div>

              <div>
                <Label>Issue Description *</Label>
                <Textarea
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({...formData, issueDescription: e.target.value})}
                  placeholder="Describe the quality issue as reported by customer..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Film Type *</Label>
                  <Select
                    value={formData.filmType}
                    onValueChange={(val) => setFormData({...formData, filmType: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Window">Window Film</SelectItem>
                      <SelectItem value="PPF">PPF Film</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Material Code</Label>
                  <Input
                    value={formData.materialCode}
                    onChange={(e) => setFormData({...formData, materialCode: e.target.value})}
                    placeholder="Material code"
                  />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Input
                    value={formData.productType}
                    onChange={(e) => setFormData({...formData, productType: e.target.value})}
                    placeholder="Product type"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roll Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Roll Details</CardTitle>
                <Button type="button" onClick={addRoll} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Roll
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.rolls.map((roll, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50 relative">
                  {formData.rolls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoll(index)}
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <h4 className="font-semibold mb-3">Roll #{index + 1}</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Roll Number *</Label>
                      <Input
                        value={roll.rollNumber}
                        onChange={(e) => updateRoll(index, 'rollNumber', e.target.value)}
                        placeholder="Roll number"
                        required
                      />
                    </div>
                    <div>
                      <Label>Qty Invoice (Lsf)</Label>
                      <Input
                        type="number"
                        value={roll.qtyInvoiceLsf}
                        onChange={(e) => updateRoll(index, 'qtyInvoiceLsf', e.target.value)}
                        placeholder="Quantity"
                      />
                    </div>
                    <div>
                      <Label>Size of Roll</Label>
                      <Input
                        value={roll.sizeOfRoll}
                        onChange={(e) => updateRoll(index, 'sizeOfRoll', e.target.value)}
                        placeholder="e.g., 1524mm x 30m"
                      />
                    </div>
                    <div>
                      <Label>Disp Qty (Lsf)</Label>
                      <Input
                        type="number"
                        value={roll.dispQtyLsf}
                        onChange={(e) => updateRoll(index, 'dispQtyLsf', e.target.value)}
                        placeholder="Dispatch quantity"
                      />
                    </div>
                    <div>
                      <Label>S.O. Item</Label>
                      <Input
                        value={roll.soItem}
                        onChange={(e) => updateRoll(index, 'soItem', e.target.value)}
                        placeholder="Sales order item"
                      />
                    </div>
                    <div>
                      <Label>Despatch Date</Label>
                      <Input
                        type="date"
                        value={roll.despatchDate}
                        onChange={(e) => updateRoll(index, 'despatchDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Evidence Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Images */}
                <div className="p-4 border-2 border-dashed rounded-lg">
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4" />
                    Images
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(Array.from(e.target.files), 'images')}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {evidence.images.length} file(s) uploaded
                  </p>
                </div>

                {/* Videos */}
                <div className="p-4 border-2 border-dashed rounded-lg">
                  <Label className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4" />
                    Videos
                  </Label>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleFileUpload(Array.from(e.target.files), 'videos')}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {evidence.videos.length} file(s) uploaded
                  </p>
                </div>

                {/* Audio */}
                <div className="p-4 border-2 border-dashed rounded-lg">
                  <Label className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4" />
                    Audio
                  </Label>
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={(e) => handleFileUpload(Array.from(e.target.files), 'audio')}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {evidence.audio.length} file(s) uploaded
                  </p>
                </div>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading files...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
            <Button
              type="submit"
              disabled={createComplaintMutation.isPending || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createComplaintMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Complaint
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}