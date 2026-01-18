import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, FileText, GitBranch, ClipboardList, CheckCircle2, ArrowRight } from "lucide-react";
import jsPDF from "jspdf";

export default function TraceabilityDiagram({ complaint, defect, rca, capa }) {
  const [generating, setGenerating] = React.useState(false);

  const stages = [
    {
      title: "Customer Complaint",
      icon: FileText,
      data: complaint,
      fields: complaint ? [
        { label: "Ticket", value: complaint.ticketNumber },
        { label: "Customer", value: complaint.customerName },
        { label: "Issue", value: complaint.issueDescription?.slice(0, 50) + '...' },
        { label: "Logged", value: new Date(complaint.dateLogged).toLocaleDateString() },
        { label: "Status", value: complaint.status?.replace(/_/g, ' ') }
      ] : []
    },
    {
      title: "QFIR",
      icon: FileText,
      data: complaint?.qfirData,
      fields: complaint?.qfirData ? [
        { label: "Filled By", value: complaint.qfirData.filledBy },
        { label: "Date", value: complaint.qfirData.filledDateIST || new Date(complaint.qfirData.filledDate).toLocaleDateString() },
        { label: "Assigned To", value: complaint.allocatedTo || 'N/A' }
      ] : complaint?.allocatedTo ? [
        { label: "Assigned To", value: complaint.allocatedTo },
        { label: "Status", value: "Awaiting QFIR completion" }
      ] : []
    },
    {
      title: "Defect Ticket",
      icon: FileText,
      data: defect,
      fields: defect ? [
        { label: "Ticket ID", value: defect.ticketId },
        { label: "Type", value: defect.defectType?.replace(/_/g, ' ') },
        { label: "Severity", value: defect.severity },
        { label: "Line", value: defect.line },
        { label: "Status", value: defect.status?.replace(/_/g, ' ') }
      ] : []
    },
    {
      title: "Root Cause Analysis",
      icon: GitBranch,
      data: rca,
      fields: rca ? [
        { label: "Analyst", value: rca.analyst },
        { label: "Root Causes", value: `${rca.rootCauses?.length || 0} identified` },
        { label: "Status", value: rca.status?.replace(/_/g, ' ') },
        { label: "Completed", value: rca.completedDate ? new Date(rca.completedDate).toLocaleDateString() : 'In Progress' }
      ] : []
    },
    {
      title: "CAPA Plan",
      icon: ClipboardList,
      data: capa,
      fields: capa ? [
        { label: "Corrective Actions", value: capa.correctiveActions?.length || 0 },
        { label: "Preventive Actions", value: capa.preventiveActions?.length || 0 },
        { label: "Approval", value: capa.approvalState?.replace(/_/g, ' ') },
        { label: "Effectiveness", value: capa.effectivenessCheck?.effective ? 'Verified ✓' : 'Pending' }
      ] : []
    }
  ];

  const generatePDF = () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;
      
      const checkNewPage = () => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('QUALITY TRACEABILITY REPORT', 105, yPos, { align: 'center' });
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`From Customer Complaint to CAPA Closure`, 105, yPos, { align: 'center' });
      yPos += 15;

      // Generate sections for each stage
      stages.forEach((stage, idx) => {
        if (!stage.data) return; // Skip missing stages

        checkNewPage();
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(50, 100, 200);
        doc.text(`${idx + 1}. ${stage.title.toUpperCase()}`, 20, yPos);
        yPos += lineHeight + 2;
        doc.setTextColor(0, 0, 0);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        stage.fields.forEach(field => {
          checkNewPage();
          doc.setFont(undefined, 'bold');
          doc.text(`${field.label}:`, 25, yPos);
          doc.setFont(undefined, 'normal');
          const lines = doc.splitTextToSize(String(field.value || 'N/A'), 130);
          doc.text(lines, 70, yPos);
          yPos += lineHeight * lines.length;
        });

        yPos += 5;

        // Arrow between stages
        if (idx < stages.length - 1 && stages[idx + 1].data) {
          checkNewPage();
          doc.setTextColor(150, 150, 150);
          doc.text('↓', 105, yPos, { align: 'center' });
          yPos += lineHeight;
          doc.setTextColor(0, 0, 0);
        }
      });

      // Summary Section
      yPos += 10;
      checkNewPage();
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('TRACEABILITY SUMMARY', 20, yPos);
      yPos += lineHeight + 2;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      const summary = [
        `Total Stages Completed: ${stages.filter(s => s.data).length} / 5`,
        `Customer: ${complaint?.customerName || 'N/A'}`,
        `Issue: ${complaint?.issueDescription?.slice(0, 80) || 'N/A'}`,
        `Current Status: ${(capa?.approvalState || defect?.status || complaint?.status || 'N/A').replace(/_/g, ' ').toUpperCase()}`,
        `Lead Time: ${complaint?.dateLogged ? Math.floor((new Date() - new Date(complaint.dateLogged)) / (1000 * 60 * 60 * 24)) : 0} days`
      ];

      summary.forEach(line => {
        checkNewPage();
        doc.text(line, 25, yPos);
        yPos += lineHeight;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, pageHeight - 10);
      doc.text('RCA & CAPA Studio - Quality Management System', 105, pageHeight - 10, { align: 'center' });

      // Save
      const fileName = `Traceability-${complaint?.ticketNumber || 'Report'}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate traceability PDF: " + error.message);
    }
    
    setGenerating(false);
  };

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            Quality Traceability Flow
          </CardTitle>
          <Button 
            onClick={generatePDF}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download PDF</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, idx) => {
            const StageIcon = stage.icon;
            const hasData = !!stage.data;
            
            return (
              <div key={idx}>
                <div className={`p-4 rounded-lg border-2 ${
                  hasData 
                    ? 'bg-white border-green-300' 
                    : 'bg-gray-100 border-gray-300 opacity-50'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      hasData ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      {hasData ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <StageIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{stage.title}</h4>
                      {hasData && (
                        <Badge className="mt-1 bg-green-100 text-green-800">Completed</Badge>
                      )}
                    </div>
                  </div>
                  
                  {hasData && (
                    <div className="ml-11 grid md:grid-cols-2 gap-2 text-sm">
                      {stage.fields.map((field, fIdx) => (
                        <div key={fIdx} className="text-xs">
                          <span className="text-gray-600">{field.label}:</span>
                          <span className="ml-1 font-medium">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!hasData && (
                    <p className="ml-11 text-xs text-gray-500">Not yet created</p>
                  )}
                </div>
                
                {idx < stages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h4 className="font-semibold text-gray-900 mb-2">Traceability Summary</h4>
          <div className="text-sm space-y-1">
            <p><strong>Progress:</strong> {stages.filter(s => s.data).length} / 5 stages completed</p>
            <p><strong>Current Stage:</strong> {
              capa ? 'CAPA Plan' :
              rca ? 'Root Cause Analysis' :
              defect ? 'Defect Investigation' :
              complaint?.qfirData ? 'QFIR Completed' :
              'Customer Complaint Logged'
            }</p>
            {complaint?.dateLogged && (
              <p><strong>Lead Time:</strong> {Math.floor((new Date() - new Date(complaint.dateLogged)) / (1000 * 60 * 60 * 24))} days</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}