import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function QFIRPDFExporter({ complaint, onExport }) {
  const [generating, setGenerating] = React.useState(false);

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

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('CUSTOMER COMPLAINT & QFIR REPORT', 105, yPos, { align: 'center' });
      yPos += 15;

      // Ticket Number
      doc.setFontSize(14);
      doc.setTextColor(200, 50, 50);
      doc.text(`Ticket: ${complaint.ticketNumber}`, 20, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      // === SECTION 1: Customer Complaint Details ===
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('CUSTOMER COMPLAINT DETAILS', 20, yPos);
      yPos += lineHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      const complaintDetails = [
        ['Customer Name:', complaint.customerName || 'N/A'],
        ['End Customer:', complaint.endCustomer || 'N/A'],
        ['Logged By:', complaint.loggedBy || 'N/A'],
        ['Date Logged:', complaint.dateLogged ? new Date(complaint.dateLogged).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'N/A'],
        ['Film Type:', complaint.filmType || 'N/A'],
        ['Material Code:', complaint.materialCode || 'N/A'],
        ['Product Type:', complaint.productType || 'N/A'],
        ['Issue Description:', complaint.issueDescription || 'N/A'],
        ['Status:', (complaint.status || 'N/A').replace(/_/g, ' ').toUpperCase()]
      ];

      complaintDetails.forEach(([label, value]) => {
        checkNewPage();
        doc.setFont(undefined, 'bold');
        doc.text(label, 20, yPos);
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(value, 150);
        doc.text(lines, 70, yPos);
        yPos += lineHeight * lines.length;
      });

      // Rolls Information
      if (complaint.rolls && complaint.rolls.length > 0) {
        yPos += 5;
        checkNewPage();
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('ROLLS INVOLVED:', 20, yPos);
        yPos += lineHeight;
        doc.setFontSize(9);

        complaint.rolls.forEach((roll, idx) => {
          checkNewPage();
          doc.text(`Roll ${idx + 1}:`, 25, yPos);
          doc.setFont(undefined, 'normal');
          doc.text(`${roll.rollNumber || 'N/A'} | Qty: ${roll.qtyInvoiceLsf || 'N/A'} Lsf | Size: ${roll.sizeOfRoll || 'N/A'}`, 50, yPos);
          yPos += lineHeight;
          doc.setFont(undefined, 'bold');
        });
      }

      // === SECTION 2: QFIR Form Data ===
      if (complaint.qfirData) {
        yPos += 10;
        checkNewPage();
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('QUALITY FIRST INFORMATION REPORT (QFIR)', 20, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Filled By: ${complaint.qfirData.filledBy || 'N/A'}`, 20, yPos);
        yPos += lineHeight;
        doc.text(`Filled Date: ${complaint.qfirData.filledDateIST || (complaint.qfirData.filledDate ? new Date(complaint.qfirData.filledDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'N/A')}`, 20, yPos);
        yPos += lineHeight + 3;

        const qfirBasic = [
          ['Date of Complaint:', complaint.qfirData.dateOfComplaint || 'N/A'],
          ['Pname:', complaint.qfirData.pname || 'N/A'],
          ['Sample Sent by Customer:', complaint.qfirData.sampleSentByCustomer || 'N/A'],
          ['Counter Sample Available:', complaint.qfirData.counterSampleAvailable || 'N/A'],
          ['Qty Dispatched Before (Lsf):', complaint.qfirData.qtyDispatchedBefore || 'N/A'],
          ['Qty Dispatched After (Lsf):', complaint.qfirData.qtyDispatchedAfter || 'N/A']
        ];

        qfirBasic.forEach(([label, value]) => {
          checkNewPage();
          doc.setFont(undefined, 'bold');
          doc.text(label, 20, yPos);
          doc.setFont(undefined, 'normal');
          doc.text(String(value), 90, yPos);
          yPos += lineHeight;
        });

        // QFIR Rolls Data
        if (complaint.qfirData.rollsData && complaint.qfirData.rollsData.length > 0) {
          yPos += 5;
          checkNewPage();
          doc.setFont(undefined, 'bold');
          doc.setFontSize(11);
          doc.text('QFIR ROLLS DATA:', 20, yPos);
          yPos += lineHeight;
          doc.setFontSize(9);

          complaint.qfirData.rollsData.forEach((roll, idx) => {
            checkNewPage();
            doc.setFont(undefined, 'bold');
            doc.text(`Roll ${idx + 1}:`, 25, yPos);
            yPos += lineHeight;
            doc.setFont(undefined, 'normal');
            
            const rollDetails = [
              `Roll No: ${roll.rollNo || 'N/A'}`,
              `Production Date: ${roll.productionDate || 'N/A'}`,
              `Complaint Roll No: ${roll.complaintRollNo || 'N/A'}`,
              `Qty Involve: ${roll.qtyInvolveLsf || 'N/A'} Lsf`,
              `Size: ${roll.sizeOfRoll || 'N/A'}`,
              `SO Item: ${roll.soItem || 'N/A'}`
            ];
            
            rollDetails.forEach(detail => {
              checkNewPage();
              doc.text(detail, 30, yPos);
              yPos += lineHeight - 1;
            });
            yPos += 2;
          });
        }

        // Slitting Details
        if (complaint.qfirData.slittingDetails) {
          yPos += 5;
          checkNewPage();
          doc.setFont(undefined, 'bold');
          doc.setFontSize(11);
          doc.text('SLITTING DETAILS:', 20, yPos);
          yPos += lineHeight;
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');

          const slittingData = complaint.qfirData.slittingDetails;
          const slittingFields = [
            ['Roll No:', slittingData.rollNo],
            ['Slitting Remarks:', slittingData.slittingRemarks],
            ['Spots:', slittingData.spots],
            ['Curling:', slittingData.curling],
            ['TD - With Liner:', slittingData.tdWithLiner],
            ['TD - Without Liner:', slittingData.tdWithoutLiner],
            ['TD - Wet:', slittingData.tdWet],
            ['MD - With Liner:', slittingData.mdWithLiner],
            ['MD - Without Liner:', slittingData.mdWithoutLiner],
            ['MD - Wet:', slittingData.mdWet],
            ['B-Grade:', slittingData.bGrade],
            ['Non-Conforming Release:', slittingData.anyNonConfirmingRelease],
            ['QA:', slittingData.qa],
            ['Counter Sample Obs:', slittingData.counterSampleObservation]
          ];

          slittingFields.forEach(([label, value]) => {
            if (value) {
              checkNewPage();
              doc.text(`${label} ${value}`, 25, yPos);
              yPos += lineHeight - 1;
            }
          });
        }

        // Production Details
        if (complaint.qfirData.productionDetails) {
          yPos += 5;
          checkNewPage();
          doc.setFont(undefined, 'bold');
          doc.setFontSize(11);
          doc.text('PRODUCTION DETAILS:', 20, yPos);
          yPos += lineHeight;
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');

          const prodData = complaint.qfirData.productionDetails;
          const prodFields = [
            ['C No:', prodData.cNo],
            ['Prod Date:', prodData.prodDate],
            ['Length (Mtr):', prodData.lengthOfRollMtr],
            ['PS Batch:', prodData.psBatch],
            ['TS Batch:', prodData.tsBatch],
            ['SRC Batch:', prodData.srcBatch],
            ['Line Speed:', prodData.lineSpeed],
            ['UV Intensity:', prodData.uvIntensity],
            ['Peel Adhesion:', prodData.peelAdhesion],
            ['Shrinkage MD:', prodData.shrinkageMD],
            ['Shrinkage TD:', prodData.shrinkageTD]
          ];

          prodFields.forEach(([label, value]) => {
            if (value) {
              checkNewPage();
              doc.text(`${label} ${value}`, 25, yPos);
              yPos += lineHeight - 1;
            }
          });
        }
      }

      // Allocation Info
      if (complaint.allocatedTo) {
        yPos += 10;
        checkNewPage();
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('ALLOCATION & OWNERSHIP:', 20, yPos);
        yPos += lineHeight;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Allocated To: ${complaint.allocatedTo}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`Allocation Date: ${complaint.allocatedDateIST || (complaint.allocatedDate ? new Date(complaint.allocatedDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'N/A')}`, 25, yPos);
        yPos += lineHeight;
        doc.text(`Current Responsible: ${complaint.responsiblePerson || 'N/A'}`, 25, yPos);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`, 20, pageHeight - 10);
      doc.text('RCA & CAPA Studio - Quality Management System', 105, pageHeight - 10, { align: 'center' });

      // Save PDF
      doc.save(`QFIR-${complaint.ticketNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      if (onExport) onExport();
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF: " + error.message);
    }
    
    setGenerating(false);
  };

  return (
    <Button 
      onClick={generatePDF}
      disabled={generating}
      variant="outline"
      className="border-blue-200 text-blue-700 hover:bg-blue-50"
    >
      {generating ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
      ) : (
        <><Download className="w-4 h-4 mr-2" />Download QFIR PDF</>
      )}
    </Button>
  );
}