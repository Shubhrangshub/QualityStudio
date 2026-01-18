import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function AnalysisPDFExporter({ 
  uploadSummary, 
  analysis, 
  fileName,
  uploadedAt
}) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Get selected parameters from localStorage
      let selectedParameters = [];
      try {
        const saved = localStorage.getItem('parameterInsights_selected');
        if (saved) selectedParameters = JSON.parse(saved);
      } catch(e) {}
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper to add text with color and check page breaks
      const addText = (text, fontSize = 10, color = [0, 0, 0], isBold = false) => {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont(undefined, isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(lines, margin, yPos);
        yPos += lines.length * fontSize * 0.45 + 2;
      };
      
      const addTable = (headers, rows, colWidths) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }
        
        const startY = yPos;
        const rowHeight = 6;
        
        // Header
        doc.setFillColor(59, 130, 246);
        doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        
        let xPos = margin + 2;
        headers.forEach((h, idx) => {
          doc.text(h, xPos, yPos + 4);
          xPos += colWidths[idx];
        });
        yPos += rowHeight;
        
        // Rows
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        rows.forEach((row, rowIdx) => {
          if (yPos > pageHeight - 25) {
            doc.addPage();
            yPos = margin;
          }
          
          if (rowIdx % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
          }
          
          xPos = margin + 2;
          row.forEach((cell, idx) => {
            doc.text(String(cell), xPos, yPos + 4);
            xPos += colWidths[idx];
          });
          yPos += rowHeight;
        });
        
        yPos += 3;
      };

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('DATA ANALYSIS REPORT', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
      
      yPos = 50;

      // File Info
      addText(`File: ${fileName}`, 14, [59, 130, 246], true);
      addText(`Uploaded: ${new Date(uploadedAt).toLocaleString()}`, 10, [107, 114, 128]);
      yPos += 5;

      // Data Overview
      if (uploadSummary?.dataOverview) {
        addText('DATA OVERVIEW', 16, [37, 99, 235], true);
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        addText(`Records: ${uploadSummary.dataOverview.recordCount}`, 11, [31, 41, 55]);
        addText(`Quality Score: ${uploadSummary.dataOverview.qualityScore}/10`, 11, [31, 41, 55]);
        if (uploadSummary.dataOverview.dateRange) {
          addText(`Date Range: ${uploadSummary.dataOverview.dateRange}`, 11, [31, 41, 55]);
        }
        yPos += 5;
      }

      // Statistical Summary Table
      if (analysis?.statistics && Object.keys(analysis.statistics).length > 0) {
        addText('STATISTICAL SUMMARY', 14, [37, 99, 235], true);
        doc.setDrawColor(59, 130, 246);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        const statsEntries = Object.entries(analysis.statistics);
        const headers = ['Parameter', 'Count', 'Mean', 'Std', 'Min', 'Med', 'Max'];
        const colWidths = [50, 15, 20, 18, 18, 18, 18];
        const rows = statsEntries.map(([param, stats]) => [
          param.length > 25 ? param.substring(0, 22) + '...' : param,
          stats.count,
          stats.mean,
          stats.stdDev,
          stats.min,
          stats.median,
          stats.max
        ]);
        
        addTable(headers, rows, colWidths);
        yPos += 3;
      }

      // Trends & Patterns
      if (uploadSummary?.trendsAndPatterns?.length > 0) {
        addText('TRENDS & PATTERNS', 13, [34, 197, 94], true);
        doc.setDrawColor(34, 197, 94);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        uploadSummary.trendsAndPatterns.forEach((trend, idx) => {
          addText(`${idx + 1}. ${trend}`, 9, [22, 101, 52]);
        });
        yPos += 4;
      }

      // Anomalies
      if (uploadSummary?.anomaliesDetected?.length > 0) {
        addText('ANOMALIES DETECTED', 13, [249, 115, 22], true);
        doc.setDrawColor(249, 115, 22);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        uploadSummary.anomaliesDetected.forEach((anomaly, idx) => {
          addText(`${idx + 1}. ${anomaly}`, 9, [194, 65, 12]);
        });
        yPos += 4;
      }

      // Correlation Matrix for Selected Parameters
      if (analysis?.correlationMatrix && selectedParameters.length > 1) {
        addText('CORRELATION MATRIX - SELECTED PARAMETERS', 14, [168, 85, 247], true);
        doc.setDrawColor(168, 85, 247);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        const maxParams = 6; // Fit max 6 params in A4 width
        const finalParams = selectedParameters.slice(0, maxParams);
        
        // Headers
        doc.setFillColor(168, 85, 247);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        
        let xPos = margin + 35;
        finalParams.forEach(p => {
          const shortName = p.length > 12 ? p.substring(0, 10) + '..' : p;
          doc.text(shortName, xPos + colWidth/2, yPos + 5, {align: 'center'});
          xPos += colWidth;
        });
        yPos += 8;
        
        // Rows
        doc.setFont(undefined, 'normal');
        finalParams.forEach((pY) => {
          if (yPos > pageHeight - 25) {
            doc.addPage();
            yPos = margin;
          }
          
          // Row label
          doc.setFillColor(240, 240, 245);
          doc.rect(margin, yPos, 35, 7, 'F');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(6);
          const shortLabel = pY.length > 15 ? pY.substring(0, 13) + '..' : pY;
          doc.text(shortLabel, margin + 2, yPos + 4.5);
          
          xPos = margin + 35;
          finalParams.forEach((pX) => {
            const value = analysis.correlationMatrix[pY]?.[pX];
            const absValue = Math.abs(value || 0);
            
            // Color coding
            const fillColor = absValue > 0.8 ? (value > 0 ? [34, 197, 94] : [239, 68, 68]) :
                            absValue > 0.6 ? (value > 0 ? [74, 222, 128] : [248, 113, 113]) :
                            absValue > 0.4 ? (value > 0 ? [134, 239, 172] : [252, 165, 165]) :
                            [229, 231, 235];
            const textColor = absValue > 0.5 ? [255, 255, 255] : [0, 0, 0];
            
            doc.setFillColor(...fillColor);
            doc.rect(xPos, yPos, colWidth, 7, 'F');
            doc.setTextColor(...textColor);
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.text(value !== null && value !== undefined ? value.toFixed(2) : '-', xPos + colWidth/2, yPos + 4.5, {align: 'center'});
            
            xPos += colWidth;
          });
          yPos += 7;
        });
        
        yPos += 5;
      }

      // Actionable Insights - Detailed
      if (uploadSummary?.actionableInsights) {
        addText('ACTIONABLE INSIGHTS', 13, [37, 99, 235], true);
        doc.setDrawColor(37, 99, 235);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        if (uploadSummary.actionableInsights.immediateActions?.length > 0) {
          addText('1. Immediate Actions:', 11, [79, 70, 229], true);
          uploadSummary.actionableInsights.immediateActions.forEach((action, idx) => {
            addText(`   ${idx + 1}. ${action}`, 8, [31, 41, 55]);
          });
          yPos += 2;
        }

        if (uploadSummary.actionableInsights.qualityMonitoring?.length > 0) {
          addText('2. Quality Monitoring (SPC):', 11, [79, 70, 229], true);
          uploadSummary.actionableInsights.qualityMonitoring.forEach((action, idx) => {
            addText(`   ${idx + 1}. ${action}`, 8, [31, 41, 55]);
          });
          yPos += 2;
        }

        if (uploadSummary.actionableInsights.processOptimization?.length > 0) {
          addText('3. Process Optimization (DoE):', 11, [79, 70, 229], true);
          uploadSummary.actionableInsights.processOptimization.forEach((action, idx) => {
            addText(`   ${idx + 1}. ${action}`, 8, [31, 41, 55]);
          });
          yPos += 2;
        }
        
        if (uploadSummary.actionableInsights.dataRecommendations?.length > 0) {
          addText('4. Data Quality Recommendations:', 11, [79, 70, 229], true);
          uploadSummary.actionableInsights.dataRecommendations.forEach((action, idx) => {
            addText(`   ${idx + 1}. ${action}`, 8, [31, 41, 55]);
          });
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by RCA & CAPA Studio', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

      const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      doc.save(`analysis-${safeFileName}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF");
    }
    setGenerating(false);
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      className="bg-blue-600 hover:bg-blue-700"
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download Full Report (PDF)
        </>
      )}
    </Button>
  );
}