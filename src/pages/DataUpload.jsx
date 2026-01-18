import React, { useState, useEffect } from "react";
import { api } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Upload, FileSpreadsheet, FileText, CheckCircle2, Loader2, 
  Database, Brain, TrendingUp, Lightbulb, Target, Link as LinkIcon,
  Globe, XCircle, Download, Trash2, Award, Eye, Clock, Sparkles, AlertTriangle, FileDown, CheckSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import FilePreviewModal from "@/components/dataupload/FilePreviewModal";
import ExpandableSection from "@/components/dataupload/ExpandableSection";
import CorrelationHeatmap from "@/components/dataupload/CorrelationHeatmap";
import ParameterInsights from "@/components/dataupload/ParameterInsights";
import AnalysisPDFExporter from "@/components/dataupload/AnalysisPDFExporter";

      // Basic statistical analysis function
      const performBasicAnalysis = (data, headers) => {
        if (!data || data.length === 0) return null;

        const numericColumns = {};
        const categoricalColumns = {};

        // Identify column types and collect values
        headers.forEach(header => {
          const values = data.map(row => row[header]).filter(v => v != null);
          const numericValues = values.filter(v => typeof v === 'number');

          if (numericValues.length > values.length * 0.8) {
            // Numeric column
            numericColumns[header] = numericValues;
          } else {
            // Categorical column
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length < values.length * 0.5) {
              categoricalColumns[header] = uniqueValues;
            }
          }
        });

        // Calculate statistics for numeric columns
        const statistics = {};
        Object.keys(numericColumns).forEach(col => {
          const values = numericColumns[col].sort((a, b) => a - b);
          const n = values.length;
          const mean = values.reduce((a, b) => a + b, 0) / n;
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
          const stdDev = Math.sqrt(variance);

          statistics[col] = {
            count: n,
            mean: mean.toFixed(2),
            stdDev: stdDev.toFixed(2),
            min: values[0].toFixed(2),
            max: values[n - 1].toFixed(2),
            median: n % 2 === 0 ? ((values[n/2 - 1] + values[n/2]) / 2).toFixed(2) : values[Math.floor(n/2)].toFixed(2)
          };
        });

        // Calculate correlations between numeric columns
        const correlations = [];
        const correlationMatrix = {};
        const numericCols = Object.keys(numericColumns);

        // Build full correlation matrix for heatmap
        numericCols.forEach(col1 => {
          correlationMatrix[col1] = {};
          numericCols.forEach(col2 => {
            if (col1 === col2) {
              correlationMatrix[col1][col2] = 1;
            } else {
              const corr = calculateCorrelation(numericColumns[col1], numericColumns[col2]);
              correlationMatrix[col1][col2] = corr;
            }
          });
        });

        // Extract significant correlations for list view
        for (let i = 0; i < numericCols.length; i++) {
          for (let j = i + 1; j < numericCols.length; j++) {
            const col1 = numericCols[i];
            const col2 = numericCols[j];
            const correlation = correlationMatrix[col1][col2];
            if (Math.abs(correlation) > 0.5) {
              correlations.push({
                col1,
                col2,
                correlation: correlation.toFixed(3),
                strength: Math.abs(correlation) > 0.8 ? 'Strong' : 'Moderate'
              });
            }
          }
        }

        return {
          statistics,
          correlations,
          correlationMatrix,
          categoricalColumns: Object.keys(categoricalColumns),
          numericColumns: Object.keys(numericColumns),
          rowCount: data.length,
          columnCount: headers.length
        };
      };

      const calculateCorrelation = (x, y) => {
        const n = Math.min(x.length, y.length);
        const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let sumX2 = 0;
        let sumY2 = 0;

        for (let i = 0; i < n; i++) {
          const dx = x[i] - meanX;
          const dy = y[i] - meanY;
          numerator += dx * dy;
          sumX2 += dx * dx;
          sumY2 += dy * dy;
        }

        const denominator = Math.sqrt(sumX2 * sumY2);
        return denominator === 0 ? 0 : numerator / denominator;
      };

      // ParameterMapper removed - simplified upload flow

export default function DataUpload() {
  const [activeTab, setActiveTab] = useState("process");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [processAiInsights, setProcessAiInsights] = useState(null);
  const [defectAiInsights, setDefectAiInsights] = useState(null);
  const [knowledgeAiInsights, setKnowledgeAiInsights] = useState(null);
  
  // Track recently uploaded data with raw extracted content - persist in localStorage
  const [recentProcessUpload, setRecentProcessUpload] = useState(() => {
    try {
      const saved = localStorage.getItem('recentProcessUpload');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [recentDefectUpload, setRecentDefectUpload] = useState(() => {
    try {
      const saved = localStorage.getItem('recentDefectUpload');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  // Persist to localStorage when changed
  useEffect(() => {
    if (recentProcessUpload) {
      localStorage.setItem('recentProcessUpload', JSON.stringify(recentProcessUpload));
    } else {
      localStorage.removeItem('recentProcessUpload');
    }
  }, [recentProcessUpload]);
  
  useEffect(() => {
    if (recentDefectUpload) {
      localStorage.setItem('recentDefectUpload', JSON.stringify(recentDefectUpload));
    } else {
      localStorage.removeItem('recentDefectUpload');
    }
  }, [recentDefectUpload]);
  
  // NEW: Pending upload for user to choose destination
  const [pendingUpload, setPendingUpload] = useState(null); // {rawData, fileUrl, fileName, userLine, userProduct}
  const [saveDestination, setSaveDestination] = useState("process_run"); // "process_run" or "knowledge_base"
  const [lineInput, setLineInput] = useState("");
  const [productInput, setProductInput] = useState("");
  const [customFileName, setCustomFileName] = useState(""); // NEW: Custom name for file

  // NEW: Link selection
  const [uploadMode, setUploadMode] = useState("universal"); // "universal" or "linked"
  const [selectedProcessRunId, setSelectedProcessRunId] = useState(null);
  const [selectedDefectId, setSelectedDefectId] = useState(null);
  
  // Bulk delete for process runs
  const [selectedProcessRunIds, setSelectedProcessRunIds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // NEW: Upload summary and history - persist in localStorage
  const [uploadSummary, setUploadSummary] = useState(() => {
    try {
      const saved = localStorage.getItem('uploadSummary');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [previewingUpload, setPreviewingUpload] = useState(null);
  
  // Persist uploadSummary to localStorage
  useEffect(() => {
    if (uploadSummary) {
      localStorage.setItem('uploadSummary', JSON.stringify(uploadSummary));
    } else {
      localStorage.removeItem('uploadSummary');
    }
  }, [uploadSummary]);
  
  // Simplified - removed parameter mapper blocking flow

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await api.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const deleteHistoryMutation = useMutation({
    mutationFn: (id) => api.entities.FileUploadHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-history'] });
    }
  });

  const bulkDeleteProcessRunsMutation = useMutation({
    mutationFn: async (ids) => {
      console.log('Attempting to delete:', ids.length, 'process runs');
      let deleted = 0;
      let failed = 0;
      
      for (const id of ids) {
        try {
          await api.entities.ProcessRun.delete(id);
          deleted++;
          console.log(`Deleted ${id}`);
        } catch (error) {
          failed++;
          console.error(`Failed to delete ${id}:`, error);
        }
      }
      
      return { deleted, failed, total: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['processRuns'] });
      queryClient.invalidateQueries({ queryKey: ['process-runs'] });
      queryClient.invalidateQueries({ queryKey: ['runs-spc'] });
      setSelectedProcessRunIds([]);
      alert(`Deleted ${result.deleted} of ${result.total} runs. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`);
    },
    onError: (error) => {
      console.error("Bulk delete error:", error);
      alert("Bulk delete failed: " + (error.message || "Unknown error"));
    }
  });

  const deleteKnowledgeDocMutation = useMutation({
    mutationFn: (id) => api.entities.KnowledgeDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-docs'] });
    }
  });

  const { data: knowledgeDocs = [] } = useQuery({
    queryKey: ['knowledge-docs'],
    queryFn: () => api.entities.KnowledgeDocument.list("-created_date", 50),
  });

  const { data: processRuns = [] } = useQuery({
    queryKey: ['processRuns'],
    queryFn: () => api.entities.ProcessRun.list("-dateTimeStart", 200),
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['defects-upload'],
    queryFn: () => api.entities.DefectTicket.list("-created_date", 200),
  });

  const { data: uploadHistory = [] } = useQuery({
    queryKey: ['upload-history'],
    queryFn: () => api.entities.FileUploadHistory.list("-created_date", 20),
  });

  const { data: anomalyNotifications = [] } = useQuery({
    queryKey: ['anomaly-notifications'],
    queryFn: () => api.entities.AnomalyNotification.filter({ dismissed: false }, "-created_date", 10),
  });

  const handleProcessDataUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);
    setProcessAiInsights(null);
    setPendingUpload(null);

    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      let runs = [];
      let analysisData = null;

      const isCSV = file.name.endsWith('.csv');

      if (isCSV) {
        // Enhanced CSV parsing with proper data type detection
        const response = await fetch(file_url);
        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line.trim());

        if (lines.length > 1) {
          // Parse headers from first row
          const headerLine = lines[0];
          const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

          // Parse data rows with proper type detection
          const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
          runs = lines.slice(1).map((line, rowIdx) => {
            const values = line.split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};

            headers.forEach((header, idx) => {
              let value = values[idx];

              if (!value || value === '' || value.toLowerCase() === 'null') {
                obj[header] = null;
              } else {
                // Try to detect data type intelligently
                // 1. Check for date/time formats
                if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) {
                  obj[header] = value; // Keep as string for now, will be handled by entity
                }
                // 2. Check for numbers (including decimals, negatives)
                else if (/^-?\d+\.?\d*$/.test(value)) {
                  obj[header] = parseFloat(value);
                }
                // 3. Keep as string
                else {
                  obj[header] = value;
                }
              }
            });

            return obj;
          });

          // Perform basic statistical analysis
          analysisData = performBasicAnalysis(runs, headers);
        }
      } else if (isExcel) {
        // Enhanced Excel extraction with explicit instructions
        const excelData = await api.integrations.Core.InvokeLLM({
          prompt: `You are extracting process manufacturing data from an Excel file.

      CRITICAL INSTRUCTIONS:
      1. Extract EXACTLY as the table appears - preserve the structure
      2. First row = column headers (property names)
      3. Each subsequent row = one record with values for those properties
      4. Maintain data types: numbers as numbers, dates as strings, text as text
      5. Do NOT reformat or reorganize - keep the original table structure

      Return format:
      {
      "records": [
      {"Header1": value1, "Header2": value2, ...},
      {"Header1": value1, "Header2": value2, ...}
      ]
      }

      Extract ALL rows and ALL columns exactly as they appear in the spreadsheet.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              records: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true
                }
              }
            }
          }
        });
        runs = excelData.records || [];

        if (runs.length > 0) {
          const headers = Object.keys(runs[0]);
          analysisData = performBasicAnalysis(runs, headers);
        }
      } else {
        throw new Error("Unsupported file format. Please use CSV or Excel files.");
      }
      
      setPendingUpload({
        rawData: runs,
        fileUrl: file_url,
        fileName: file?.name || 'uploaded_file',
        uploadedAt: new Date().toISOString(),
        analysis: analysisData,
        userLine: "",
        userProduct: ""
      });
      setLineInput("");
      setProductInput("");
      setCustomFileName(file.name.replace(/\.(csv|xlsx|xls)$/i, '')); // Auto-fill with filename (no extension)
      
      setUploadResult({
        success: true,
        count: runs.length,
        message: `✅ File uploaded: ${file.name} | Extracted ${runs.length} records from ${isExcel ? 'Excel' : 'CSV'}`,
        pending: true
      });

      // Generate structured AI summary
      await generateStructuredSummary(runs, file.name, 'process_run', file_url);
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || "Upload failed"
      });
    }

    setUploading(false);
  };

  const saveUploadedData = async (destination) => {
    if (!pendingUpload) return;
    
    setUploading(true);
    const runs = pendingUpload.rawData;
    const user = await api.auth.me();
    
    try {
      // Save to FileUploadHistory with full data, analysis, and AI summary
      const finalFileName = customFileName.trim() || pendingUpload.fileName;
      
      const historyRecord = await api.entities.FileUploadHistory.create({
        fileName: finalFileName,
        fileType: 'process_run',
        fileUrl: pendingUpload.fileUrl,
        recordCount: runs.length,
        summary: uploadSummary?.dataOverview ? 
          `${uploadSummary.dataOverview.recordCount} records | Quality Score: ${uploadSummary.dataOverview.qualityScore}/10 | ${uploadSummary.dataOverview.dateRange || 'No date range'}` :
          `Extracted ${runs.length} records with ${runs.length > 0 ? Object.keys(runs[0]).length : 0} columns`,
        keyMetrics: {
          totalRecords: runs.length,
          columns: runs.length > 0 ? Object.keys(runs[0]) : [],
          line: pendingUpload.userLine || lineInput || 'Unknown Line',
          productCode: pendingUpload.userProduct || productInput || 'Unknown Product',
          analysis: pendingUpload.analysis,
          uploadedData: runs.slice(0, 100),
          tableStructure: {
            headers: runs.length > 0 ? Object.keys(runs[0]) : [],
            dataTypes: runs.length > 0 ? Object.entries(runs[0]).reduce((acc, [key, val]) => {
              acc[key] = typeof val === 'number' ? 'number' : typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) ? 'date' : 'string';
              return acc;
            }, {}) : {}
          },
          aiSummary: uploadSummary || null,
          correlationMatrix: pendingUpload.analysis?.correlationMatrix || null
        },
        uploadedBy: user.email,
        linkedRecordId: uploadMode === "linked" ? selectedProcessRunId : null,
        linkedRecordType: uploadMode === "linked" ? 'process_run' : null
      });
      
      console.log('✅ FileUploadHistory created:', historyRecord.id);
      
      if (destination === "process_run") {
        // If linked mode - save uploaded data as sensorsRaw for AI analysis
        if (uploadMode === "linked" && selectedProcessRunId && runs.length > 0) {
          const existingRun = processRuns.find(r => r.id === selectedProcessRunId);
          await api.entities.ProcessRun.update(selectedProcessRunId, {
            sensorsRaw: {
              uploadedData: runs,
              uploadedAt: new Date().toISOString(),
              fileName: pendingUpload.fileName,
              fileUrl: pendingUpload.fileUrl,
              recordCount: runs.length,
              columns: runs.length > 0 ? Object.keys(runs[0]) : [],
              analysis: pendingUpload.analysis,
              historyRecordId: historyRecord.id
            }
          });
          setUploadResult({
            success: true,
            count: runs.length,
            message: `Successfully linked ${runs.length} records to process run. Data and analysis saved.`
          });
        } else {
          // Universal upload - REQUIRE line and product from user input
          const line = pendingUpload.userLine || 'Unknown Line';
          const productCode = pendingUpload.userProduct || 'Unknown Product';
          const operator = user.email;
          
          // Line/product already stored in historyRecord creation above - no need to update again
          
          // Create SINGLE ProcessRun with all sensor data (CSV rows are sensor readings, not separate runs)
          const firstRow = runs[0] || {};
          const startTime = Date.now();
          
          console.log('📤 Creating 1 ProcessRun with', runs.length, 'sensor readings');
          
          const processRunData = {
            dateTimeStart: firstRow.dateTimeStart || firstRow.timestamp || firstRow.date || firstRow.LocalDate || firstRow.DateTime || new Date().toISOString(),
            dateTimeEnd: runs[runs.length - 1]?.dateTimeEnd || new Date().toISOString(),
            line: line,
            productCode: productCode,
            operator: operator,
            shift: firstRow.shift || firstRow.Shift || "A",
            lineSpeed: firstRow.lineSpeed || firstRow.speed || null,
            nipPressure: firstRow.nipPressure || null,
            webTensionIn: firstRow.webTensionIn || null,
            webTensionOut: firstRow.webTensionOut || null,
            rollTempChill: firstRow.rollTempChill || null,
            rollTempTop: firstRow.rollTempTop || null,
            rollTempBottom: firstRow.rollTempBottom || null,
            humidity: firstRow.humidity || firstRow.Humidity || null,
            roomTemp: firstRow.roomTemp || firstRow.RoomTemp || null,
            coronaDyne: firstRow.coronaDyne || null,
            uvDose: firstRow.uvDose || null,
            uploadedViaDataUpload: true,
            uploadHistoryId: historyRecord.id,
            sensorsRaw: { 
              allSensorReadings: runs,
              historyRecordId: historyRecord.id,
              columns: Object.keys(firstRow),
              recordCount: runs.length
            }
          };
          
          console.log('🚀 Creating ProcessRun with uploadHistoryId:', historyRecord.id);
          console.log('📦 ProcessRun data:', JSON.stringify(processRunData, null, 2));
          
          const processRun = await api.entities.ProcessRun.create(processRunData);
          
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          
          console.log(`✅ ProcessRun created in ${duration}s with ${runs.length} sensor readings`);
          console.log('✅ ProcessRun returned uploadHistoryId:', processRun?.uploadHistoryId);
          console.log('✅ Full ProcessRun object:', JSON.stringify(processRun, null, 2));
          
          setUploadResult({
            success: true,
            count: runs.length,
            message: `✅ Saved 1 process run with ${runs.length} sensor readings in ${duration}s.`
          });
        }
        queryClient.invalidateQueries({ queryKey: ['processRuns'] });
        queryClient.invalidateQueries({ queryKey: ['runs-spc'] }); // Also invalidate SPC page cache
        
        setRecentProcessUpload({
          ...pendingUpload,
          savedAs: 'process_run',
          linkedTo: uploadMode === "linked" ? selectedProcessRunId : null,
          historyId: historyRecord.id
        });
      } else if (destination === "knowledge_base") {
        // Save as knowledge document for AI universal intelligence - NO process runs created
        await api.entities.KnowledgeDocument.create({
          title: `Process Data - ${pendingUpload.fileName}`,
          documentType: 'technical_paper',
          fileUrl: pendingUpload.fileUrl,
          summary: `Uploaded process data with ${runs.length} records. Contains parameters: ${runs.length > 0 ? Object.keys(runs[0]).join(', ') : 'N/A'}`,
          keywords: ['process data', 'uploaded', ...Object.keys(runs[0] || {}).slice(0, 15)],
          relatedTopics: ['process optimization', 'manufacturing data'],
          uploadedBy: user.email,
          status: 'active'
        });
        
        setUploadResult({
          success: true,
          count: runs.length,
          message: `Successfully saved to Knowledge Base (no Process Runs created).`
        });
        
        setRecentProcessUpload({
          ...pendingUpload,
          savedAs: 'knowledge_base',
          historyId: historyRecord.id
        });
      }
      
      // Run AI analysis
      const contextInfo = uploadMode === "linked" && selectedProcessRunId ? 
        `\n\nLinked to Process Run on ${processRuns.find(r => r.id === selectedProcessRunId)?.line}` : "";
      await analyzeProcessData(runs, contextInfo);
      
      // Update cumulative statistics and check for anomalies
      await updateCumulativeStats(runs, historyRecord.id);
      
      // Force refresh upload history
      await queryClient.invalidateQueries({ queryKey: ['upload-history'] });
      await queryClient.refetchQueries({ queryKey: ['upload-history'] });
      
      console.log('✅ Upload complete - history should refresh now');
      setPendingUpload(null);
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || "Failed to save data"
      });
    }
    
    setUploading(false);
  };

  const handleDefectDataUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);
    setDefectAiInsights(null);

    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      let contextInfo = "";
      if (uploadMode === "linked" && selectedDefectId) {
        const defect = defects.find(d => d.id === selectedDefectId);
        if (defect) {
          contextInfo = `\n\nThis data is linked to Defect:
- ID: ${defect.id}
- Type: ${defect.defectType}
- Line: ${defect.line}
- Severity: ${defect.severity}
- Date: ${new Date(defect.dateTime || defect.created_date).toLocaleString()}`;
        }
      }

      let defectsData = [];
      const isCSV = file.name.endsWith('.csv');

      if (isCSV) {
        // Direct CSV parsing - fast and reliable
        const response = await fetch(file_url);
        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
          defectsData = lines.slice(1).map(line => {
            const values = line.split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((header, idx) => {
              const value = values[idx];
              if (!value || value === '') {
                obj[header] = null;
              } else {
                const numValue = parseFloat(value);
                obj[header] = isNaN(numValue) ? value : numValue;
              }
            });
            return obj;
          });
        }
      } else if (isExcel) {
        // Use LLM to read Excel file
        const excelData = await api.integrations.Core.InvokeLLM({
          prompt: `Extract ALL defect data from this Excel file. Each row should include: dateTime, line, productCode, defectType, severity, operator, webPositionMD, webPositionCD. Return format: {"defects": [array of defect objects]}`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              defects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dateTime: { type: "string" },
                    line: { type: "string" },
                    productCode: { type: "string" },
                    defectType: { type: "string" },
                    severity: { type: "string" },
                    operator: { type: "string" },
                    webPositionMD: { type: "number" },
                    webPositionCD: { type: "number" }
                  }
                }
              }
            }
          }
        });
        defectsData = excelData.defects || [];
      } else {
        throw new Error("Unsupported file format. Please use CSV or Excel files.");
      }
      
      setRecentDefectUpload({
        rawData: defectsData,
        fileUrl: file_url,
        uploadedAt: new Date().toISOString(),
        fileName: file?.name || 'uploaded_file',
        linkedTo: uploadMode === "linked" ? selectedDefectId : null
      });
      
      if (uploadMode === "linked" && selectedDefectId && defectsData.length > 0) {
        const existingDefect = defects.find(d => d.id === selectedDefectId);
        await api.entities.DefectTicket.update(selectedDefectId, {
          ...existingDefect,
          ...defectsData[0],
          linkedUploadUrl: file_url
        });
        queryClient.invalidateQueries({ queryKey: ['defects-upload'] });
        setUploadResult({
          success: true,
          count: 1,
          message: `✅ File uploaded: ${file.name} | Updated defect with data from ${isExcel ? 'Excel' : 'CSV'}`
        });
        
        await generateStructuredSummary(defectsData, file.name, 'defect', file_url);
      } else {
        for (const defect of defectsData) {
          await api.entities.DefectTicket.create({
            ...defect,
            status: "open"
          });
        }
        queryClient.invalidateQueries({ queryKey: ['defects-upload'] });
        setUploadResult({
          success: true,
          count: defectsData.length,
          message: `✅ File uploaded: ${file.name} | Imported ${defectsData.length} defect records from ${isExcel ? 'Excel' : 'CSV'}`
        });
        
        await generateStructuredSummary(defectsData, file.name, 'defect', file_url);
      }

      await analyzeDefectData(defectsData, contextInfo);
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || "Upload failed"
      });
    }

    setUploading(false);
  };

  const analyzeProcessData = async (runs, contextInfo = "", mapping = null) => {
    setAnalyzing(true);

    try {
      // Build parameter context if mapping provided
      let parameterContext = "";
      if (mapping) {
        const responses = Object.entries(mapping).filter(([_, role]) => role === 'response').map(([name]) => name);
        const factors = Object.entries(mapping).filter(([_, role]) => role === 'factor').map(([name]) => name);
        
        parameterContext = `\n\nPARAMETER MAPPING:
- Response Variables (Quality Characteristics): ${responses.join(', ')}
- Factor Variables (Process Settings): ${factors.join(', ')}

Focus analysis on relationship between factors and responses. Identify which factors most influence the responses.`;
      }

      // Format data more clearly for AI
      const dataDescription = runs.length > 0 ? `
EXTRACTED DATA FROM UPLOADED CSV (${runs.length} rows):
${JSON.stringify(runs.slice(0, 10), null, 2)}

DATA COLUMNS FOUND: ${runs.length > 0 ? Object.keys(runs[0]).join(', ') : 'None'}
TOTAL RECORDS: ${runs.length}
` : 'No data extracted from file';

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this ACTUAL uploaded lamination process data for window films/PPF manufacturing.${contextInfo}${parameterContext}

${dataDescription}

Provide:
1. Key trends and patterns in process parameters
2. ${mapping ? "Factor-Response relationships and correlations" : (uploadMode === "linked" ? "Specific recommendations for this process run" : "General automation and IoT opportunities")}
3. Suggested experiments (DoE) to optimize process
4. ${uploadMode === "linked" ? "Root cause analysis if this data explains defects" : "Recommendations for process standardization"}
${mapping ? "\n5. Capability insights for response variables" : ""}

${uploadMode === "linked" ? "Focus on the specific context and be very detailed about this particular run." : "Provide general insights applicable across runs."}`,
        response_json_schema: {
          type: "object",
          properties: {
            trends: { type: "array", items: { type: "string" } },
            automationOpportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  benefit: { type: "string" },
                  complexity: { type: "string" }
                }
              }
            },
            suggestedExperiments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  objective: { type: "string" },
                  factors: { type: "array", items: { type: "string" } },
                  expectedImpact: { type: "string" }
                }
              }
            },
            specificRecommendations: { type: "array", items: { type: "string" } },
            standardizationRecommendations: { type: "array", items: { type: "string" } },
            factorResponseAnalysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  response: { type: "string" },
                  relationship: { type: "string" },
                  strength: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            capabilityInsights: { type: "array", items: { type: "string" } }
          }
        }
      });

      setProcessAiInsights({
        ...result,
        type: 'process',
        mode: uploadMode,
        linkedTo: uploadMode === "linked" ? "process run" : null,
        hasMapping: !!mapping
      });
    } catch (error) {
      console.error("AI analysis error:", error);
    }

    setAnalyzing(false);
  };



  const updateCumulativeStats = async (data, uploadHistoryId) => {
    if (!data || data.length === 0) return;
    
    try {
      const user = await api.auth.me();
      const headers = Object.keys(data[0]);
      
      // Process each numeric parameter
      for (const param of headers) {
        const values = data.map(row => row[param]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;
        
        // Fetch existing cumulative stats for this parameter
        const existingStats = await api.entities.StatisticalSummary.filter({ 
          parameterName: param, 
          fileType: 'process_run' 
        });
        
        const currentMean = values.reduce((a, b) => a + b, 0) / values.length;
        const currentStdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - currentMean, 2), 0) / values.length);
        const currentMin = Math.min(...values);
        const currentMax = Math.max(...values);
        
        let anomalyDetected = false;
        let anomalyDetails = "";
        
        if (existingStats.length > 0) {
          const stat = existingStats[0];
          const historicalMean = stat.cumulativeStats?.mean || currentMean;
          const historicalStdDev = stat.cumulativeStats?.stdDev || currentStdDev;
          
          // Detect anomalies: 3-sigma rule
          if (Math.abs(currentMean - historicalMean) > 3 * historicalStdDev) {
            anomalyDetected = true;
            anomalyDetails = `Mean shifted from ${historicalMean.toFixed(2)} to ${currentMean.toFixed(2)} (>${3 * historicalStdDev.toFixed(2)} change)`;
          }
          
          // Update cumulative stats
          const updatedStats = {
            count: (stat.cumulativeStats?.count || 0) + values.length,
            mean: ((historicalMean * (stat.cumulativeStats?.count || 0)) + (currentMean * values.length)) / ((stat.cumulativeStats?.count || 0) + values.length),
            stdDev: currentStdDev, // Simplified - use current
            min: Math.min(stat.cumulativeStats?.min || currentMin, currentMin),
            max: Math.max(stat.cumulativeStats?.max || currentMax, currentMax),
            median: currentMean // Simplified
          };
          
          await api.entities.StatisticalSummary.update(stat.id, {
            cumulativeStats: updatedStats,
            lastValue: currentMean,
            anomalyDetected,
            anomalyDetails,
            historicalValues: [
              ...(stat.historicalValues || []).slice(-50), // Keep last 50
              {
                timestamp: new Date().toISOString(),
                value: currentMean,
                uploadId: uploadHistoryId
              }
            ],
            lastUpdated: new Date().toISOString()
          });
        } else {
          // Create new cumulative stats
          await api.entities.StatisticalSummary.create({
            parameterName: param,
            fileType: 'process_run',
            cumulativeStats: {
              count: values.length,
              mean: currentMean,
              stdDev: currentStdDev,
              min: currentMin,
              max: currentMax,
              median: currentMean
            },
            lastValue: currentMean,
            anomalyDetected: false,
            historicalValues: [{
              timestamp: new Date().toISOString(),
              value: currentMean,
              uploadId: uploadHistoryId
            }],
            lastUpdated: new Date().toISOString()
          });
        }
        
        // Create notification if anomaly detected
        if (anomalyDetected) {
          const notification = await api.entities.AnomalyNotification.create({
            title: `Anomaly Detected: ${param}`,
            message: anomalyDetails,
            parameterName: param,
            anomalyType: 'trend_shift',
            severity: 'high',
            uploadHistoryId: uploadHistoryId,
            readBy: [],
            dismissed: false
          });
          
          // Send email to all users
          const allUsers = await api.entities.User.list();
          for (const targetUser of allUsers) {
            await api.integrations.Core.SendEmail({
              to: targetUser.email,
              subject: `⚠️ Quality Alert: Anomaly Detected in ${param}`,
              body: `An anomaly has been detected in parameter: ${param}\n\n${anomalyDetails}\n\nClick to view details in the Data Upload section.`
            });
          }
        }
      }
    } catch (error) {
      console.error("Cumulative stats update error:", error);
    }
  };

  const generateStructuredSummary = async (data, fileName, fileType, fileUrl) => {
    setGeneratingSummary(true);
    try {
      const user = await api.auth.me();
      const sampleData = data.slice(0, 3);
      
      const summary = await api.integrations.Core.InvokeLLM({
        prompt: `Manufacturing Process Data Analysis Report

FILE: ${fileName}
RECORDS: ${data.length}
COLUMNS: ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'N/A'}

SAMPLE DATA:
${JSON.stringify(sampleData, null, 2)}

Provide a STRUCTURED, PROFESSIONAL analysis in the following format:

**SECTION 1: DATA OVERVIEW**
- Records extracted: [number]
- Columns identified: [list]
- Data quality score: [1-10]
- Date range: [if applicable]

**SECTION 2: STATISTICAL SUMMARY**
For each numeric column, report: min, max, mean, std deviation (keep concise)

**SECTION 3: TRENDS & PATTERNS**
- Identify 5-7 key trends (e.g., "Temperature increases over time", "Speed correlates with defects")
- Note any seasonal patterns or time-based variations

**SECTION 4: ANOMALIES DETECTED**
- List 5-7 outliers or unusual values with specifics
- Statistical significance if applicable
- Potential impact on quality

**SECTION 5: CORRELATIONS**
- Top 5 significant correlations between parameters
- Strength and direction (positive/negative)

**SECTION 6: ACTIONABLE INSIGHTS**
Write as an SOP-style professional recommendation:
1. **Immediate Actions**: [5-7 bullets - specific, actionable steps]
2. **Quality Monitoring**: [5-7 bullets on what to monitor in SPC]
3. **Process Optimization**: [5-7 bullets on DoE opportunities]
4. **Data Recommendations**: [5-7 bullets on data quality/collection]

Keep each section concise and professional. Use bullet points. Avoid repetition.`,
        response_json_schema: {
          type: "object",
          properties: {
            dataOverview: {
              type: "object",
              properties: {
                recordCount: { type: "number" },
                columns: { type: "array", items: { type: "string" } },
                qualityScore: { type: "number" },
                dateRange: { type: "string" }
              }
            },
            statisticalSummary: { type: "string" },
            trendsAndPatterns: { type: "array", items: { type: "string" } },
            anomaliesDetected: { type: "array", items: { type: "string" } },
            correlations: { type: "array", items: { type: "string" } },
            actionableInsights: {
              type: "object",
              properties: {
                immediateActions: { type: "array", items: { type: "string" } },
                qualityMonitoring: { type: "array", items: { type: "string" } },
                processOptimization: { type: "array", items: { type: "string" } },
                dataRecommendations: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setUploadSummary(summary);

      queryClient.invalidateQueries({ queryKey: ['upload-history'] });
    } catch (error) {
      console.error("Summary generation failed:", error);
    }
    setGeneratingSummary(false);
  };

  const analyzeDefectData = async (defectsData, contextInfo = "") => {
    setAnalyzing(true);

    try {
      // Format data more clearly for AI
      const dataDescription = defectsData.length > 0 ? `
EXTRACTED DEFECT DATA FROM UPLOADED CSV (${defectsData.length} rows):
${JSON.stringify(defectsData.slice(0, 10), null, 2)}

DATA COLUMNS FOUND: ${defectsData.length > 0 ? Object.keys(defectsData[0]).join(', ') : 'None'}
TOTAL DEFECT RECORDS: ${defectsData.length}
` : 'No data extracted from file';

      const result = await api.integrations.Core.InvokeLLM({
        prompt: `Analyze this ACTUAL uploaded defect data for lamination processes.${contextInfo}

${dataDescription}

Provide:
1. ${uploadMode === "linked" ? "Detailed root cause analysis for this specific defect" : "Pattern analysis across defects"}
2. Immediate corrective actions
3. ${uploadMode === "linked" ? "Parameter adjustments specific to this issue" : "General preventive measures"}
4. Related quality metrics to monitor

${uploadMode === "linked" ? "Be very specific about this particular defect and its causes." : "Provide general insights across defect types."}`,
        response_json_schema: {
          type: "object",
          properties: {
            rootCauses: { type: "array", items: { type: "string" } },
            correctiveActions: { type: "array", items: { type: "string" } },
            parameterAdjustments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  currentValue: { type: "string" },
                  recommendedValue: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            preventiveMeasures: { type: "array", items: { type: "string" } },
            metricsToMonitor: { type: "array", items: { type: "string" } }
          }
        }
      });

      setDefectAiInsights({
        ...result,
        type: 'defect',
        mode: uploadMode,
        linkedTo: uploadMode === "linked" ? "defect" : null
      });
    } catch (error) {
      console.error("AI analysis error:", error);
    }

    setAnalyzing(false);
  };

  const analyzeKnowledgeDoc = async (analysis) => {
    setAnalyzing(true);
    
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You just analyzed a knowledge document with these details:
        
Title: ${analysis.suggestedTitle}
Type: ${analysis.documentType}
Summary: ${analysis.summary}
Keywords: ${analysis.keywords?.join(', ')}
Defect Types: ${analysis.defectTypes?.join(', ')}

Provide actionable insights:
1. How this document can be used in quality workflows (RCA, CAPA, etc.)
2. Specific defect prevention strategies from this document
3. Training recommendations based on this content
4. Key process improvements mentioned`,
        response_json_schema: {
          type: "object",
          properties: {
            usageInWorkflows: { type: "array", items: { type: "string" } },
            preventionStrategies: { type: "array", items: { type: "string" } },
            trainingRecommendations: { type: "array", items: { type: "string" } },
            processImprovements: { type: "array", items: { type: "string" } }
          }
        }
      });

      setKnowledgeAiInsights({
        ...result,
        type: 'knowledge',
        documentTitle: analysis.suggestedTitle,
        documentType: analysis.documentType
      });
    } catch (error) {
      console.error("AI knowledge analysis error:", error);
    }
    
    setAnalyzing(false);
  };

  const handleKnowledgeDocUpload = async (file) => {
    setUploading(true);
    setUploadResult(null);
    setKnowledgeAiInsights(null);

    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      
      // Use AI to analyze and categorize the document
      const analysis = await api.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a knowledge document for a lamination manufacturing quality management system (window films/PPF).

Read the ENTIRE document carefully and extract comprehensive information:

1. Document Title: Suggest a clear, descriptive title
2. Document Type: Choose one: sop, technical_paper, vendor_spec, training_material, research, best_practice, troubleshooting_guide
3. Summary: Write a detailed 3-5 sentence summary capturing the main content
4. Keywords: Extract 15-20 highly relevant keywords and technical terms
5. Related Topics: List 5-10 related topics and concepts
6. Defect Types: Identify which defects this relates to: bubbles_voids, delamination, fisheyes, gels_contamination, haze, orange_peel, streaks_banding, scratches, curl, blocking, telescoping, optical_distortion, adhesive_ooze
7. Process Steps: List all process steps covered (unwinding, lamination, coating, drying, rewinding, slitting, quality_inspection, etc.)
8. Key Parameters: Extract ALL parameters mentioned (line speed, nip pressure, temperature zones, tension, humidity, coating weight, cure time, etc.) with their values and context

Be thorough and specific. Extract maximum value from this document for future RCA/CAPA workflows.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            suggestedTitle: { type: "string" },
            documentType: { type: "string" },
            summary: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            relatedTopics: { type: "array", items: { type: "string" } },
            defectTypes: { type: "array", items: { type: "string" } },
            processSteps: { type: "array", items: { type: "string" } },
            parameters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  value: { type: "string" },
                  context: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Store in knowledge base
      const user = await api.auth.me();
      await api.entities.KnowledgeDocument.create({
        title: analysis.suggestedTitle || file.name,
        documentType: analysis.documentType || 'technical_paper',
        fileUrl: file_url,
        summary: analysis.summary,
        keywords: analysis.keywords || [],
        relatedTopics: analysis.relatedTopics || [],
        defectTypes: analysis.defectTypes || [],
        processSteps: analysis.processSteps || [],
        parameters: analysis.parameters || [],
        uploadedBy: user.email,
        status: 'active'
      });

      setUploadResult({
        success: true,
        message: `Document "${analysis.suggestedTitle || file.name}" uploaded and analyzed. AI extracted ${analysis.keywords?.length || 0} keywords and linked to ${analysis.defectTypes?.length || 0} defect types.`,
        fileUrl: file_url,
        analysis
      });

      // Generate actionable insights
      await analyzeKnowledgeDoc(analysis);
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || "Upload failed"
      });
    }

    setUploading(false);
  };

  const selectedProcessRun = processRuns.find(r => r.id === selectedProcessRunId);
  const selectedDefect = defects.find(d => d.id === selectedDefectId);

  const handleBulkDeleteProcessRuns = async () => {
    if (!isAdmin) {
      alert("Only admins can delete Process Runs");
      return;
    }
    if (selectedProcessRunIds.length === 0) {
      alert("Please select runs to delete");
      return;
    }
    if (window.confirm(`Delete ${selectedProcessRunIds.length} selected process runs? This cannot be undone.`)) {
      console.log('🗑️ Starting bulk delete from DataUpload page:', selectedProcessRunIds);
      await bulkDeleteProcessRunsMutation.mutateAsync(selectedProcessRunIds);
    }
  };

  const toggleSelectProcessRun = (runId) => {
    setSelectedProcessRunIds(prev => 
      prev.includes(runId) 
        ? prev.filter(id => id !== runId) 
        : [...prev, runId]
    );
  };

  const toggleSelectAllProcessRuns = () => {
    if (selectedProcessRunIds.length === processRuns.length) {
      setSelectedProcessRunIds([]);
    } else {
      setSelectedProcessRunIds(processRuns.map(r => r.id));
    }
  };

  const markNotificationRead = async (notificationId) => {
    const user = await api.auth.me();
    const notification = anomalyNotifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    const readBy = notification.readBy || [];
    if (!readBy.includes(user.email)) {
      await api.entities.AnomalyNotification.update(notificationId, {
        readBy: [...readBy, user.email]
      });
      queryClient.invalidateQueries({ queryKey: ['anomaly-notifications'] });
    }
    
    // Navigate to related upload history
    if (notification.uploadHistoryId) {
      const upload = uploadHistory.find(u => u.id === notification.uploadHistoryId);
      if (upload) {
        setPreviewingUpload(upload);
        setActiveTab('history');
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Data Upload & AI Analysis
          </h1>
          <p className="text-gray-600 mt-1">Import process data, defects, and knowledge documents</p>
        </div>

        {/* Anomaly Notifications */}
        {anomalyNotifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {anomalyNotifications.map((notification) => (
              <Alert 
                key={notification.id} 
                className={`cursor-pointer ${
                  notification.severity === 'critical' ? 'bg-red-50 border-red-300' :
                  notification.severity === 'high' ? 'bg-orange-50 border-orange-300' :
                  'bg-yellow-50 border-yellow-300'
                }`}
                onClick={() => markNotificationRead(notification.id)}
              >
                <AlertTriangle className={`h-4 w-4 ${
                  notification.severity === 'critical' ? 'text-red-600' :
                  notification.severity === 'high' ? 'text-orange-600' :
                  'text-yellow-600'
                }`} />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to view upload history and data
                    </p>
                  </div>
                  <Badge className={
                    notification.severity === 'critical' ? 'bg-red-600 text-white' :
                    notification.severity === 'high' ? 'bg-orange-600 text-white' :
                    'bg-yellow-600 text-white'
                  }>
                    {notification.severity}
                  </Badge>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {uploadResult && !uploadResult.analysis && (
          <Alert className={`mb-6 ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {uploadResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
              {uploadResult.message}
              {uploadResult.count && ` (${uploadResult.count} records)`}
            </AlertDescription>
          </Alert>
        )}

        {generatingSummary && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Generating AI summary of uploaded data...
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="process">Process Data ({processRuns.length})</TabsTrigger>
            <TabsTrigger value="defects">Defect Data ({defects.length})</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Docs</TabsTrigger>
            <TabsTrigger value="history">Upload History ({uploadHistory.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="process">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      Upload Process Parameters
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-2">
                      Upload CSV or Excel files with process run data. <span className="text-blue-600 font-medium">CSV recommended</span> for faster processing.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* NEW: Upload Mode Selection */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <Label className="text-sm font-semibold text-blue-900 mb-3 block">
                        📎 Upload Mode
                      </Label>
                      <RadioGroup value={uploadMode} onValueChange={setUploadMode}>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border hover:border-blue-400 transition-colors cursor-pointer">
                            <RadioGroupItem value="universal" id="universal" />
                            <Label htmlFor="universal" className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-600" />
                                <span className="font-medium">Universal Upload</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Create new records, not linked to existing data</p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border hover:border-blue-400 transition-colors cursor-pointer">
                            <RadioGroupItem value="linked" id="linked" />
                            <Label htmlFor="linked" className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">Link to Specific Run</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Update/enrich selected process run with new data</p>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>

                      {uploadMode === "linked" && (
                        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                          {selectedProcessRun ? (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-blue-900">Selected Process Run:</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSelectedProcessRunId(null)}
                                  className="h-6 text-xs"
                                >
                                  Clear
                                </Button>
                              </div>
                              <div className="p-2 bg-white rounded border border-blue-200">
                                <p className="text-sm font-medium">{selectedProcessRun.productCode}</p>
                                <p className="text-xs text-gray-600">
                                  Line {selectedProcessRun.line} • {new Date(selectedProcessRun.dateTimeStart).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-blue-800">
                              👉 Select a process run from the list on the right
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                        onChange={(e) => e.target.files[0] && handleProcessDataUpload(e.target.files[0])}
                        className="hidden"
                        id="process-upload"
                        disabled={uploading || (uploadMode === "linked" && !selectedProcessRunId)}
                      />
                      <label htmlFor="process-upload">
                        <Button 
                          asChild 
                          disabled={uploading || (uploadMode === "linked" && !selectedProcessRunId)}
                        >
                          <span>
                            {uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Select File
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">CSV or Excel files (.xlsx, .xls)</p>
                      <p className="text-xs text-blue-600 mt-1">💡 CSV recommended for faster processing</p>
                        {uploadMode === "linked" && !selectedProcessRunId && (
                          <p className="text-xs text-orange-600 mt-2">
                            ⚠️ Select a process run first
                          </p>
                        )}
                      </div>

                      {/* Pending Upload - Choose Destination */}
                      {pendingUpload && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-300">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="font-medium text-gray-900">
                              {pendingUpload.rawData.length} records extracted
                            </p>
                          </div>

                          {/* Ask for Line, Product, and Custom Name */}
                          <div className="mb-4 p-3 bg-white rounded-lg border-2 border-blue-400">
                            <p className="text-sm font-medium text-gray-900 mb-3">📋 File Information (Required):</p>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Custom File Name*</Label>
                                <Input
                                  value={customFileName}
                                  onChange={(e) => setCustomFileName(e.target.value)}
                                  placeholder="e.g., Line1_PPF100_Jan2025"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  This name will appear in SPC file dropdown for easy selection
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Production Line*</Label>
                                  <Input
                                    value={lineInput}
                                    onChange={(e) => {
                                      setLineInput(e.target.value);
                                      setPendingUpload(prev => ({...prev, userLine: e.target.value}));
                                    }}
                                    placeholder="e.g., Line1, LineA"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Product Code*</Label>
                                  <Input
                                    value={productInput}
                                    onChange={(e) => {
                                      setProductInput(e.target.value);
                                      setPendingUpload(prev => ({...prev, userProduct: e.target.value}));
                                    }}
                                    placeholder="e.g., PPF-100"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Line/Product used for comparative analysis in Custom Reports
                            </p>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">Where do you want to save this data?</p>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Button
                              onClick={() => saveUploadedData("process_run")}
                              disabled={uploading || !lineInput || !productInput || !customFileName.trim()}
                              className="bg-blue-600 hover:bg-blue-700 flex flex-col h-auto py-3"
                            >
                              <Database className="w-5 h-5 mb-1" />
                              <span className="text-xs">Save as Process Run</span>
                              <span className="text-[10px] opacity-75">
                                {!lineInput || !productInput || !customFileName.trim() 
                                  ? '⚠️ Fill all fields above' 
                                  : 'For SPC & Custom Reports'}
                              </span>
                            </Button>
                            <Button
                              onClick={() => saveUploadedData("knowledge_base")}
                              disabled={uploading}
                              variant="outline"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50 flex flex-col h-auto py-3"
                            >
                              <Brain className="w-5 h-5 mb-1" />
                              <span className="text-xs">Save to Knowledge Base</span>
                              <span className="text-[10px] opacity-75">For AI universal intelligence</span>
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingUpload(null)}
                            className="w-full text-gray-500"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Expected Columns:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>• dateTimeStart, line, productCode, operator</p>
                        <p>• lineSpeed, nipPressure, webTensionIn/Out</p>
                        <p>• ovenZonesTemp[], humidity, roomTemp</p>
                        <p>• rollTempChill/Top/Bottom, coronaDyne</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Process Runs List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Process Runs ({processRuns.length})</CardTitle>
                    <Badge variant="outline">{processRuns.length} total</Badge>
                  </div>
                  {uploadMode === "linked" && (
                    <p className="text-xs text-blue-600 mt-2">
                      <Target className="w-3 h-3 inline mr-1" />
                      Click on a run to select it for linked upload
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {/* Bulk Actions */}
                  {isAdmin && processRuns.length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedProcessRunIds.length === processRuns.length && processRuns.length > 0}
                            onCheckedChange={toggleSelectAllProcessRuns}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {selectedProcessRunIds.length === 0 
                              ? 'Select runs for bulk delete' 
                              : `${selectedProcessRunIds.length} run(s) selected`}
                          </span>
                        </div>
                        {selectedProcessRunIds.length > 0 && (
                          <Button
                            onClick={handleBulkDeleteProcessRuns}
                            disabled={bulkDeleteProcessRunsMutation.isPending}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {bulkDeleteProcessRunsMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedProcessRunIds.length})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {processRuns.map((run) => (
                      <div 
                        key={run.id} 
                        className={`p-3 border rounded-lg transition-all ${
                          selectedProcessRunId === run.id 
                            ? 'bg-blue-50 border-blue-400 shadow-sm' 
                            : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isAdmin && (
                            <Checkbox
                              checked={selectedProcessRunIds.includes(run.id)}
                              onCheckedChange={() => toggleSelectProcessRun(run.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              if (uploadMode === "linked") {
                                setSelectedProcessRunId(run.id === selectedProcessRunId ? null : run.id);
                              }
                            }}
                          >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{run.productCode}</span>
                          <Badge>{run.line}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          Speed: {run.lineSpeed}m/min • Pressure: {run.nipPressure}bar
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(run.dateTimeStart).toLocaleString()} • {run.operator}
                        </p>
                        {selectedProcessRunId === run.id && (
                          <Badge className="mt-2 bg-blue-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {processRuns.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No process runs yet. Upload data to get started.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Professional Data Analysis Report - MOVED HERE */}
            {uploadSummary && (
              <Card className="mt-6 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Professional Data Analysis Report
                  </CardTitle>
                  {pendingUpload?.fileName && (
                    <p className="text-sm text-blue-700 mt-2 font-medium">
                      📁 File: {pendingUpload.fileName} ({pendingUpload.rawData?.length || 0} records)
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Data Overview - Always Visible */}
                  {uploadSummary.dataOverview && (
                    <div className="p-4 bg-white rounded-lg border">
                      <h3 className="font-semibold text-gray-900 mb-3">📊 Data Overview</h3>
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Records</p>
                          <p className="font-bold text-lg">{uploadSummary.dataOverview.recordCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Quality Score</p>
                          <p className="font-bold text-lg">{uploadSummary.dataOverview.qualityScore}/10</p>
                        </div>
                        {uploadSummary.dataOverview.dateRange && (
                          <div>
                            <p className="text-gray-600">Date Range</p>
                            <p className="font-semibold text-xs">{uploadSummary.dataOverview.dateRange}</p>
                          </div>
                        )}
                      </div>
                      {uploadSummary.dataOverview.columns && (
                        <div className="mt-3">
                          <p className="text-gray-600 text-xs mb-2">Columns ({uploadSummary.dataOverview.columns.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {uploadSummary.dataOverview.columns.map((col, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{col}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Statistical Summary - Expandable with Table */}
                  {pendingUpload?.analysis?.statistics && Object.keys(pendingUpload.analysis.statistics).length > 0 && (
                    <ExpandableSection title="📈 Statistical Summary" defaultExpanded={true} className="bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left border font-semibold text-gray-700">Parameter</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Count</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Mean</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Std Dev</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Min</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Median</th>
                              <th className="px-3 py-2 text-right border font-semibold text-gray-700">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(pendingUpload.analysis.statistics).map(([param, stats]) => (
                              <tr key={param} className="hover:bg-blue-50">
                                <td className="px-3 py-2 border font-medium text-gray-900">{param}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.count}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.mean}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.stdDev}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.min}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.median}</td>
                                <td className="px-3 py-2 border text-right text-gray-700">{stats.max}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ExpandableSection>
                  )}

                  {/* Correlation Heatmap - Expandable */}
                  {pendingUpload?.analysis?.correlationMatrix && (
                    <ExpandableSection title="🔥 Correlation Heatmap" defaultExpanded={true} className="bg-white">
                      <CorrelationHeatmap 
                        correlationMatrix={pendingUpload.analysis.correlationMatrix}
                        parameters={pendingUpload.analysis.numericColumns}
                      />
                    </ExpandableSection>
                  )}

                  {/* Trends & Patterns - Expandable */}
                  {uploadSummary.trendsAndPatterns?.length > 0 && (
                    <ExpandableSection title="📊 Trends & Patterns" defaultExpanded={true} className="bg-green-50 border-green-200">
                      <ul className="space-y-1">
                        {uploadSummary.trendsAndPatterns.map((trend, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {trend}</li>
                        ))}
                      </ul>
                    </ExpandableSection>
                  )}

                  {/* Anomalies - Expandable */}
                  {uploadSummary.anomaliesDetected?.length > 0 && (
                    <ExpandableSection title="⚠️ Anomalies Detected" defaultExpanded={true} className="bg-orange-50 border-orange-200">
                      <ul className="space-y-1">
                        {uploadSummary.anomaliesDetected.map((anomaly, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {anomaly}</li>
                        ))}
                      </ul>
                    </ExpandableSection>
                  )}

                  {/* Correlations List - Expandable */}
                  {uploadSummary.correlations?.length > 0 && (
                    <ExpandableSection title="🔗 Key Correlations" defaultExpanded={false} className="bg-purple-50 border-purple-200">
                      <ul className="space-y-1">
                        {uploadSummary.correlations.map((corr, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {corr}</li>
                        ))}
                      </ul>
                    </ExpandableSection>
                  )}

                  {/* Actionable Insights - Expandable */}
                  {uploadSummary.actionableInsights && (
                    <ExpandableSection title="✅ ACTIONABLE INSIGHTS" defaultExpanded={true} className="bg-blue-50 border-2 border-blue-300">
                      {uploadSummary.actionableInsights.immediateActions?.length > 0 && (
                        <div className="mb-3">
                          <p className="font-semibold text-sm text-blue-900 mb-1">1. Immediate Actions:</p>
                          <ul className="space-y-1 ml-4">
                            {uploadSummary.actionableInsights.immediateActions.map((action, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {uploadSummary.actionableInsights.qualityMonitoring?.length > 0 && (
                        <div className="mb-3">
                          <p className="font-semibold text-sm text-blue-900 mb-1">2. Quality Monitoring (SPC):</p>
                          <ul className="space-y-1 ml-4">
                            {uploadSummary.actionableInsights.qualityMonitoring.map((item, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {uploadSummary.actionableInsights.processOptimization?.length > 0 && (
                        <div className="mb-3">
                          <p className="font-semibold text-sm text-blue-900 mb-1">3. Process Optimization (DoE):</p>
                          <ul className="space-y-1 ml-4">
                            {uploadSummary.actionableInsights.processOptimization.map((item, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {uploadSummary.actionableInsights.dataRecommendations?.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm text-blue-900 mb-1">4. Data Quality Recommendations:</p>
                          <ul className="space-y-1 ml-4">
                            {uploadSummary.actionableInsights.dataRecommendations.map((item, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </ExpandableSection>
                  )}

                  {/* Parameter Selector for Insights */}
                  {pendingUpload?.analysis && (
                    <ParameterInsights 
                      uploadSummary={uploadSummary}
                      analysis={pendingUpload.analysis}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recently Uploaded Data Section */}
            {recentProcessUpload && (
              <Card className="mt-6 border-2 border-green-300 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Recently Uploaded Data
                    </CardTitle>
                    <div className="flex gap-2">
                      <AnalysisPDFExporter
                        uploadSummary={uploadSummary}
                        analysis={recentProcessUpload.analysis}
                        fileName={recentProcessUpload.fileName}
                        uploadedAt={recentProcessUpload.uploadedAt}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Generate full analysis report
                          let report = `FULL DATA ANALYSIS REPORT\n${'='.repeat(80)}\n\n`;
                          report += `File: ${recentProcessUpload.fileName}\n`;
                          report += `Uploaded: ${new Date(recentProcessUpload.uploadedAt).toLocaleString()}\n`;
                          report += `Records: ${recentProcessUpload.rawData.length}\n\n`;

                          // Data Overview
                          if (uploadSummary?.dataOverview) {
                            report += `${'='.repeat(80)}\nDATA OVERVIEW\n${'='.repeat(80)}\n\n`;
                            report += `Record Count: ${uploadSummary.dataOverview.recordCount}\n`;
                            report += `Quality Score: ${uploadSummary.dataOverview.qualityScore}/10\n`;
                            report += `Date Range: ${uploadSummary.dataOverview.dateRange || 'N/A'}\n`;
                            report += `Columns: ${uploadSummary.dataOverview.columns?.join(', ')}\n\n`;
                          }

                          // Statistical Summary
                          if (recentProcessUpload.analysis?.statistics) {
                            report += `${'='.repeat(80)}\nSTATISTICAL SUMMARY\n${'='.repeat(80)}\n\n`;
                            Object.entries(recentProcessUpload.analysis.statistics).forEach(([param, stats]) => {
                              report += `${param}:\n`;
                              report += `  Count: ${stats.count}\n`;
                              report += `  Mean: ${stats.mean}\n`;
                              report += `  Std Dev: ${stats.stdDev}\n`;
                              report += `  Min: ${stats.min}\n`;
                              report += `  Median: ${stats.median}\n`;
                              report += `  Max: ${stats.max}\n\n`;
                            });
                          }

                          // Correlation Matrix
                          if (recentProcessUpload.analysis?.correlationMatrix) {
                            report += `${'='.repeat(80)}\nCORRELATION MATRIX\n${'='.repeat(80)}\n\n`;
                            const params = recentProcessUpload.analysis.numericColumns;
                            report += `           `;
                            params.forEach(p => report += `${p.substring(0, 10).padEnd(12)} `);
                            report += `\n`;
                            params.forEach(pY => {
                              report += `${pY.substring(0, 10).padEnd(12)} `;
                              params.forEach(pX => {
                                const val = recentProcessUpload.analysis.correlationMatrix[pY]?.[pX];
                                report += `${val !== undefined ? val.toFixed(2).padEnd(12) : 'N/A'.padEnd(12)} `;
                              });
                              report += `\n`;
                            });
                            report += `\n`;
                          }

                          // Trends & Patterns
                          if (uploadSummary?.trendsAndPatterns?.length > 0) {
                            report += `${'='.repeat(80)}\nTRENDS & PATTERNS\n${'='.repeat(80)}\n\n`;
                            uploadSummary.trendsAndPatterns.forEach(t => report += `• ${t}\n`);
                            report += `\n`;
                          }

                          // Anomalies
                          if (uploadSummary?.anomaliesDetected?.length > 0) {
                            report += `${'='.repeat(80)}\nANOMALIES DETECTED\n${'='.repeat(80)}\n\n`;
                            uploadSummary.anomaliesDetected.forEach(a => report += `• ${a}\n`);
                            report += `\n`;
                          }

                          // Actionable Insights
                          if (uploadSummary?.actionableInsights) {
                            report += `${'='.repeat(80)}\nACTIONABLE INSIGHTS\n${'='.repeat(80)}\n\n`;
                            if (uploadSummary.actionableInsights.immediateActions?.length > 0) {
                              report += `IMMEDIATE ACTIONS:\n`;
                              uploadSummary.actionableInsights.immediateActions.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                            if (uploadSummary.actionableInsights.qualityMonitoring?.length > 0) {
                              report += `QUALITY MONITORING:\n`;
                              uploadSummary.actionableInsights.qualityMonitoring.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                            if (uploadSummary.actionableInsights.processOptimization?.length > 0) {
                              report += `PROCESS OPTIMIZATION:\n`;
                              uploadSummary.actionableInsights.processOptimization.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                            if (uploadSummary.actionableInsights.dataRecommendations?.length > 0) {
                              report += `DATA RECOMMENDATIONS:\n`;
                              uploadSummary.actionableInsights.dataRecommendations.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                          }

                          const blob = new Blob([report], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `full-analysis-report-${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download Analysis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setRecentProcessUpload(null);
                          setProcessAiInsights(null);
                          setPendingUpload(null);
                          setUploadResult(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(recentProcessUpload.uploadedAt).toLocaleString()}
                    </span>
                    <Badge variant="outline">{recentProcessUpload.rawData.length} records</Badge>
                    {recentProcessUpload.linkedTo && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Linked to Run
                      </Badge>
                    )}
                  </div>
                  
                  {/* Statistical Analysis */}
                  {recentProcessUpload.analysis && (
                    <Card className="mb-4 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="w-5 h-5 text-blue-600" />
                          Statistical Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Summary */}
                        <div className="grid md:grid-cols-3 gap-3 text-sm">
                          <div className="p-2 bg-white rounded border">
                            <p className="text-gray-600 text-xs">Total Records</p>
                            <p className="font-bold text-lg">{recentProcessUpload.analysis.rowCount}</p>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <p className="text-gray-600 text-xs">Numeric Columns</p>
                            <p className="font-bold text-lg">{recentProcessUpload.analysis.numericColumns.length}</p>
                          </div>
                          <div className="p-2 bg-white rounded border">
                            <p className="text-gray-600 text-xs">Categorical Columns</p>
                            <p className="font-bold text-lg">{recentProcessUpload.analysis.categoricalColumns.length}</p>
                          </div>
                        </div>

                        {/* Correlations - Collapsible */}
                        {recentProcessUpload.analysis.correlations.length > 0 && (
                          <ExpandableSection title="🔗 Significant Correlations (|r| > 0.5)" defaultExpanded={false} className="bg-white">
                            <div className="space-y-2">
                              {recentProcessUpload.analysis.correlations.map((corr, idx) => (
                                <div key={idx} className="p-2 bg-blue-50 rounded border flex items-center justify-between">
                                  <span className="text-xs">
                                    <strong>{corr.col1}</strong> ↔ <strong>{corr.col2}</strong>
                                  </span>
                                  <Badge className={parseFloat(corr.correlation) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                    r = {corr.correlation} ({corr.strength})
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ExpandableSection>
                        )}

                        {/* Statistics for numeric columns - Collapsible */}
                        {Object.keys(recentProcessUpload.analysis.statistics).length > 0 && (
                          <ExpandableSection title="📊 Descriptive Statistics" defaultExpanded={false} className="bg-white">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-2 py-1 text-left border">Parameter</th>
                                    <th className="px-2 py-1 text-right border">Count</th>
                                    <th className="px-2 py-1 text-right border">Mean</th>
                                    <th className="px-2 py-1 text-right border">Std Dev</th>
                                    <th className="px-2 py-1 text-right border">Min</th>
                                    <th className="px-2 py-1 text-right border">Median</th>
                                    <th className="px-2 py-1 text-right border">Max</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(recentProcessUpload.analysis.statistics).map(([col, stats]) => (
                                    <tr key={col} className="bg-white hover:bg-blue-50">
                                      <td className="px-2 py-1 border font-medium">{col}</td>
                                      <td className="px-2 py-1 border text-right">{stats.count}</td>
                                      <td className="px-2 py-1 border text-right">{stats.mean}</td>
                                      <td className="px-2 py-1 border text-right">{stats.stdDev}</td>
                                      <td className="px-2 py-1 border text-right">{stats.min}</td>
                                      <td className="px-2 py-1 border text-right">{stats.median}</td>
                                      <td className="px-2 py-1 border text-right">{stats.max}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </ExpandableSection>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Data Preview Table */}
                  <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {recentProcessUpload.rawData[0] && Object.keys(recentProcessUpload.rawData[0]).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium text-gray-700 border-b">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentProcessUpload.rawData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx} className="px-2 py-1 text-gray-600">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {recentProcessUpload.rawData.length > 10 && (
                      <p className="text-xs text-gray-500 text-center py-2 bg-gray-50">
                        Showing 10 of {recentProcessUpload.rawData.length} records
                      </p>
                    )}
                  </div>
                  
                  {/* Use for Golden Batch Comparison */}
                  {recentProcessUpload.rawData.length > 0 && !recentProcessUpload.linkedTo && (
                    <Alert className="mt-3 bg-yellow-50 border-yellow-200">
                      <Award className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Tip:</strong> This data has been saved as Process Runs and is now available for Golden Batch comparison.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Insights for Process Data - Inline */}
            {(analyzing && activeTab === "process") || processAiInsights ? (
              <Card className="mt-6 border-2 border-purple-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI Process Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">
                        {processAiInsights?.mode === "linked" 
                          ? "AI is analyzing your specific process run with full context..." 
                          : "AI is analyzing process data patterns..."
                        }
                      </p>
                    </div>
                  ) : processAiInsights ? (
                    <div className="space-y-6">
                      {processAiInsights.mode === "linked" && (
                        <Alert className="bg-blue-50 border-blue-200">
                          <LinkIcon className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-900">
                            <strong>Context-Aware Analysis:</strong> Performed with specific context from selected process run
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Automation Opportunities */}
                      {processAiInsights.automationOpportunities?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-purple-600" />
                            Automation & IoT Opportunities
                          </h4>
                          <div className="space-y-3">
                            {processAiInsights.automationOpportunities.map((opp, idx) => (
                              <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-gray-900">{opp.opportunity}</h5>
                                  <Badge className="bg-purple-100 text-purple-800">{opp.complexity}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{opp.benefit}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Factor-Response Analysis */}
                      {processAiInsights.hasMapping && processAiInsights.factorResponseAnalysis?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            Factor-Response Relationships
                          </h4>
                          <div className="space-y-3">
                            {processAiInsights.factorResponseAnalysis.map((rel, idx) => (
                              <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-gray-900">
                                    {rel.factor} → {rel.response}
                                  </h5>
                                  <Badge className="bg-purple-100 text-purple-800">{rel.strength}</Badge>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{rel.relationship}</p>
                                <p className="text-sm text-purple-700">
                                  <strong>Recommendation:</strong> {rel.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capability Insights */}
                      {processAiInsights.hasMapping && processAiInsights.capabilityInsights?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Capability Insights</h4>
                          <div className="space-y-2">
                            {processAiInsights.capabilityInsights.map((insight, idx) => (
                              <div key={idx} className="p-3 border-l-4 border-green-500 bg-green-50 pl-4">
                                <p className="text-sm text-gray-700">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Experiments */}
                      {processAiInsights.suggestedExperiments?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Suggested Experiments (DoE)
                          </h4>
                          <div className="space-y-3">
                            {processAiInsights.suggestedExperiments.map((exp, idx) => (
                              <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <h5 className="font-semibold text-gray-900 mb-2">{exp.objective}</h5>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Factors:</strong> {exp.factors?.join(', ')}
                                </p>
                                <p className="text-sm text-green-700">
                                  <strong>Expected Impact:</strong> {exp.expectedImpact}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trends & Recommendations */}
                      {(processAiInsights.trends || processAiInsights.specificRecommendations || processAiInsights.standardizationRecommendations) && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Key Trends & Recommendations</h4>
                          {processAiInsights.trends?.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <p className="font-medium text-gray-700 mb-2">Trends:</p>
                              {processAiInsights.trends.map((trend, idx) => (
                                <div key={idx} className="p-3 border-l-4 border-blue-500 bg-blue-50 pl-4">
                                  <p className="text-sm text-gray-700">{trend}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {processAiInsights.specificRecommendations?.length > 0 && (
                            <div className="mt-4">
                              <p className="font-medium text-gray-700 mb-2">Specific Recommendations:</p>
                              <ul className="space-y-1 pl-4 list-disc">
                                {processAiInsights.specificRecommendations.map((rec, idx) => (
                                  <li key={idx} className="text-sm text-gray-600">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {processAiInsights.standardizationRecommendations?.length > 0 && (
                            <div className="mt-4">
                              <p className="font-medium text-gray-700 mb-2">Standardization:</p>
                              <ul className="space-y-1 pl-4 list-disc">
                                {processAiInsights.standardizationRecommendations.map((rec, idx) => (
                                  <li key={idx} className="text-sm text-gray-600">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="defects">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                      Upload Defect Data
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-2">
                      Bulk import historical defect data (CSV or Excel). <span className="text-blue-600 font-medium">CSV preferred</span> for best results.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* NEW: Upload Mode Selection for Defects */}
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <Label className="text-sm font-semibold text-orange-900 mb-3 block">
                        📎 Upload Mode
                      </Label>
                      <RadioGroup value={uploadMode} onValueChange={setUploadMode}>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border hover:border-orange-400 transition-colors cursor-pointer">
                            <RadioGroupItem value="universal" id="def-universal" />
                            <Label htmlFor="def-universal" className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-600" />
                                <span className="font-medium">Universal Upload</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Create new defect records</p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border hover:border-orange-400 transition-colors cursor-pointer">
                            <RadioGroupItem value="linked" id="def-linked" />
                            <Label htmlFor="def-linked" className="cursor-pointer flex-1">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-orange-600" />
                                <span className="font-medium">Link to Specific Defect</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Enrich selected defect with additional data</p>
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>

                      {uploadMode === "linked" && (
                        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                          {selectedDefect ? (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-orange-900">Selected Defect:</p>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSelectedDefectId(null)}
                                  className="h-6 text-xs"
                                >
                                  Clear
                                </Button>
                              </div>
                              <div className="p-2 bg-white rounded border border-orange-200">
                                <p className="text-sm font-medium">{selectedDefect.defectType?.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-gray-600">
                                  Line {selectedDefect.line} • {selectedDefect.severity}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-orange-800">
                              👉 Select a defect from the list on the right
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                        onChange={(e) => e.target.files[0] && handleDefectDataUpload(e.target.files[0])}
                        className="hidden"
                        id="defect-upload"
                        disabled={uploading || (uploadMode === "linked" && !selectedDefectId)}
                      />
                      <label htmlFor="defect-upload">
                        <Button 
                          asChild 
                          disabled={uploading || (uploadMode === "linked" && !selectedDefectId)}
                        >
                          <span>
                            {uploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Select Defect Data File
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      {uploadMode === "linked" && !selectedDefectId && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Select a defect first
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Defects List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Uploaded Defects ({defects.length})</CardTitle>
                    <Badge variant="outline">{defects.length} total</Badge>
                  </div>
                  {uploadMode === "linked" && (
                    <p className="text-xs text-orange-600 mt-2">
                      <Target className="w-3 h-3 inline mr-1" />
                      Click on a defect to select it for linked upload
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {defects.map((defect) => (
                      <div 
                        key={defect.id} 
                        className={`p-3 border rounded-lg transition-all cursor-pointer ${
                          selectedDefectId === defect.id 
                            ? 'bg-orange-50 border-orange-400 shadow-sm' 
                            : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => {
                          if (uploadMode === "linked") {
                            setSelectedDefectId(defect.id === selectedDefectId ? null : defect.id);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{defect.defectType?.replace(/_/g, ' ')}</span>
                          <Badge className={
                            defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            defect.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {defect.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          Line {defect.line} • {defect.productCode}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(defect.dateTime || defect.created_date).toLocaleString()}
                        </p>
                        {selectedDefectId === defect.id && (
                          <Badge className="mt-2 bg-orange-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                    ))}
                    {defects.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No defects uploaded yet. Import defect data to get started.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recently Uploaded Defect Data Section */}
            {recentDefectUpload && (
              <Card className="mt-6 border-2 border-orange-300 bg-orange-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-orange-600" />
                      Recently Uploaded Defect Data
                    </CardTitle>
                    <div className="flex gap-2">
                      {uploadSummary && (
                        <AnalysisPDFExporter
                          uploadSummary={uploadSummary}
                          analysis={recentDefectUpload.analysis || {}}
                          fileName={recentDefectUpload.fileName}
                          uploadedAt={recentDefectUpload.uploadedAt}
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Generate full defect analysis report
                          let report = `DEFECT ANALYSIS REPORT\n${'='.repeat(80)}\n\n`;
                          report += `File: ${recentDefectUpload.fileName}\n`;
                          report += `Uploaded: ${new Date(recentDefectUpload.uploadedAt).toLocaleString()}\n`;
                          report += `Records: ${recentDefectUpload.rawData.length}\n\n`;

                          if (uploadSummary) {
                            if (uploadSummary.dataOverview) {
                              report += `DATA OVERVIEW:\n`;
                              report += `  Records: ${uploadSummary.dataOverview.recordCount}\n`;
                              report += `  Quality Score: ${uploadSummary.dataOverview.qualityScore}/10\n\n`;
                            }

                            if (uploadSummary.anomaliesDetected?.length > 0) {
                              report += `ANOMALIES:\n`;
                              uploadSummary.anomaliesDetected.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }

                            if (uploadSummary.actionableInsights?.immediateActions?.length > 0) {
                              report += `RECOMMENDED ACTIONS:\n`;
                              uploadSummary.actionableInsights.immediateActions.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                          }

                          if (defectAiInsights) {
                            report += `${'='.repeat(80)}\nAI ANALYSIS\n${'='.repeat(80)}\n\n`;
                            if (defectAiInsights.rootCauses?.length > 0) {
                              report += `ROOT CAUSES:\n`;
                              defectAiInsights.rootCauses.forEach(r => report += `  • ${r}\n`);
                              report += `\n`;
                            }
                            if (defectAiInsights.correctiveActions?.length > 0) {
                              report += `CORRECTIVE ACTIONS:\n`;
                              defectAiInsights.correctiveActions.forEach(a => report += `  • ${a}\n`);
                              report += `\n`;
                            }
                          }

                          const blob = new Blob([report], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `defect-analysis-${new Date().toISOString().split('T')[0]}.txt`;
                          a.click();
                          }}
                          >
                          <FileDown className="w-4 h-4 mr-1" />
                          Text Report
                          </Button>
                          <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                          const csvContent = [
                            Object.keys(recentDefectUpload.rawData[0] || {}).join(','),
                            ...recentDefectUpload.rawData.map(row => 
                              Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(',')
                            )
                          ].join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `defect-data-${new Date().toISOString().split('T')[0]}.csv`;
                          a.click();
                          }}
                          >
                          <Download className="w-4 h-4 mr-1" />
                          CSV
                          </Button>
                          <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                          setRecentDefectUpload(null);
                          setDefectAiInsights(null);
                          setUploadResult(null);
                          }}
                          >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Clear
                          </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(recentDefectUpload.uploadedAt).toLocaleString()}
                    </span>
                    <Badge variant="outline">{recentDefectUpload.rawData.length} records</Badge>
                    {recentDefectUpload.linkedTo && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Linked to Defect
                      </Badge>
                    )}
                  </div>
                  
                  {/* Data Preview Table */}
                  <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-lg bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {recentDefectUpload.rawData[0] && Object.keys(recentDefectUpload.rawData[0]).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium text-gray-700 border-b">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentDefectUpload.rawData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx} className="px-2 py-1 text-gray-600">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {recentDefectUpload.rawData.length > 10 && (
                      <p className="text-xs text-gray-500 text-center py-2 bg-gray-50">
                        Showing 10 of {recentDefectUpload.rawData.length} records
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights for Defect Data - Inline */}
            {(analyzing && activeTab === "defects") || defectAiInsights ? (
              <Card className="mt-6 border-2 border-orange-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-orange-600" />
                    AI Defect Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">
                        {defectAiInsights?.mode === "linked" 
                          ? "AI is analyzing this specific defect with full context..." 
                          : "AI is analyzing defect patterns..."
                        }
                      </p>
                    </div>
                  ) : defectAiInsights ? (
                    <div className="space-y-6">
                      {defectAiInsights.mode === "linked" && (
                        <Alert className="bg-orange-50 border-orange-200">
                          <LinkIcon className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-900">
                            <strong>Context-Aware Analysis:</strong> Performed with specific context from selected defect
                          </AlertDescription>
                        </Alert>
                      )}

                      {defectAiInsights.rootCauses?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-red-600" />
                            Root Cause Analysis
                          </h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {defectAiInsights.rootCauses.map((cause, idx) => (
                              <li key={idx}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {defectAiInsights.correctiveActions?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-yellow-600" />
                            Immediate Corrective Actions
                          </h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {defectAiInsights.correctiveActions.map((action, idx) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {defectAiInsights.parameterAdjustments?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Parameter Adjustments
                          </h4>
                          <div className="space-y-3">
                            {defectAiInsights.parameterAdjustments.map((adj, idx) => (
                              <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h5 className="font-semibold text-gray-900 mb-1">{adj.parameter}</h5>
                                <p className="text-sm text-gray-600">
                                  Current: <Badge variant="outline">{adj.currentValue}</Badge> → Recommended: <Badge className="bg-purple-100 text-purple-800">{adj.recommendedValue}</Badge>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{adj.reasoning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {defectAiInsights.preventiveMeasures?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Preventive Measures
                          </h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {defectAiInsights.preventiveMeasures.map((measure, idx) => (
                              <li key={idx}>{measure}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {defectAiInsights.metricsToMonitor?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Metrics to Monitor</h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {defectAiInsights.metricsToMonitor.map((metric, idx) => (
                              <li key={idx}>{metric}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="knowledge">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Upload Knowledge Documents
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload SOPs, technical papers, vendor specs, training materials for AI knowledge base
                  </p>
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 font-medium mb-1">🤖 AI Auto-Categorization:</p>
                    <ul className="text-xs text-purple-700 space-y-1">
                      <li>• Extracts keywords and topics automatically</li>
                      <li>• Links to relevant defect types</li>
                      <li>• Identifies process parameters</li>
                      <li>• Surfaces documents during RCA and CAPA creation</li>
                    </ul>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => e.target.files[0] && handleKnowledgeDocUpload(e.target.files[0])}
                    className="hidden"
                    id="knowledge-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="knowledge-upload">
                    <Button asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing document...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Select Document
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">PDF, Word, or Text files</p>
                </div>

                {uploadResult && uploadResult.analysis && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-3">
                      ✅ Document analyzed successfully!
                    </p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium text-green-900">Title:</span>
                        <span className="text-green-700 ml-2">{uploadResult.analysis.suggestedTitle}</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-900">Type:</span>
                        <span className="text-green-700 ml-2">{uploadResult.analysis.documentType}</span>
                      </div>
                      {uploadResult.analysis.keywords?.length > 0 && (
                        <div>
                          <span className="font-medium text-green-900">Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {uploadResult.analysis.keywords.slice(0, 10).map((kw, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {uploadResult.analysis.defectTypes?.length > 0 && (
                        <div>
                          <span className="font-medium text-green-900">Linked to defects:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {uploadResult.analysis.defectTypes.map((dt, idx) => (
                              <Badge key={idx} className="bg-orange-100 text-orange-800 text-xs">
                                {dt.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Documents List */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Uploaded Knowledge Documents ({knowledgeDocs.length})</CardTitle>
                  <Badge variant="outline">{knowledgeDocs.length} documents</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {knowledgeDocs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No knowledge documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {knowledgeDocs.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-purple-100 text-purple-800 text-xs">
                                {doc.documentType?.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(doc.created_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Delete "${doc.title}"?`)) {
                                deleteKnowledgeDocMutation.mutate(doc.id);
                              }
                            }}
                            disabled={deleteKnowledgeDocMutation.isPending}
                          >
                            {deleteKnowledgeDocMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{doc.summary}</p>
                        {doc.keywords && doc.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {doc.keywords.slice(0, 8).map((kw, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{kw}</Badge>
                            ))}
                            {doc.keywords.length > 8 && (
                              <Badge variant="outline" className="text-xs">+{doc.keywords.length - 8} more</Badge>
                            )}
                          </div>
                        )}
                        {doc.defectTypes && doc.defectTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 mr-1">Linked defects:</span>
                            {doc.defectTypes.slice(0, 5).map((dt, idx) => (
                              <Badge key={idx} className="bg-orange-100 text-orange-800 text-xs">
                                {dt.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">By: {doc.uploadedBy}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Insights for Knowledge Documents - Inline */}
            {(analyzing && activeTab === "knowledge") || knowledgeAiInsights ? (
              <Card className="mt-6 border-2 border-green-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                    AI Document Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analyzing ? (
                    <div className="p-12 text-center">
                      <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Extracting actionable insights from document...</p>
                    </div>
                  ) : knowledgeAiInsights ? (
                    <div className="space-y-6">
                      <Alert className="bg-green-50 border-green-200">
                        <FileText className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900">
                          <strong>Document:</strong> {knowledgeAiInsights.documentTitle} ({knowledgeAiInsights.documentType})
                        </AlertDescription>
                      </Alert>

                      {knowledgeAiInsights.usageInWorkflows?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Usage in Quality Workflows</h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {knowledgeAiInsights.usageInWorkflows.map((usage, idx) => (
                              <li key={idx}>{usage}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {knowledgeAiInsights.preventionStrategies?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Defect Prevention Strategies</h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {knowledgeAiInsights.preventionStrategies.map((strategy, idx) => (
                              <li key={idx}>{strategy}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {knowledgeAiInsights.trainingRecommendations?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Training Recommendations</h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {knowledgeAiInsights.trainingRecommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {knowledgeAiInsights.processImprovements?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Process Improvements</h4>
                          <ul className="space-y-2 pl-4 list-disc text-gray-700">
                            {knowledgeAiInsights.processImprovements.map((improvement, idx) => (
                              <li key={idx}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
            </div>
          </TabsContent>

          {/* Upload History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Upload History</CardTitle>
                <p className="text-sm text-gray-600">View summaries of your past uploads</p>
              </CardHeader>
              <CardContent>
                {uploadHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No upload history yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploadHistory.map((upload) => (
                      <Card key={upload.id} className="border-gray-200">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{upload.fileName}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={
                                  upload.fileType === 'process_run' ? 'bg-blue-100 text-blue-800' :
                                  upload.fileType === 'defect' ? 'bg-orange-100 text-orange-800' :
                                  'bg-purple-100 text-purple-800'
                                }>
                                  {upload.fileType.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(upload.created_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline">{upload.recordCount} records</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 mb-3">{upload.summary}</p>
                          {upload.keyMetrics && (
                            <div className="grid md:grid-cols-3 gap-2 text-xs mb-3">
                              {upload.keyMetrics.totalRecords && (
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="text-gray-600">Records</p>
                                  <p className="font-semibold">{upload.keyMetrics.totalRecords}</p>
                                </div>
                              )}
                              {upload.keyMetrics.dateRange && (
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="text-gray-600">Date Range</p>
                                  <p className="font-semibold text-xs">{upload.keyMetrics.dateRange}</p>
                                </div>
                              )}
                              {upload.keyMetrics.keyColumns && (
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="text-gray-600">Columns</p>
                                  <p className="font-semibold">{upload.keyMetrics.keyColumns.length}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Uploaded by: {upload.uploadedBy}</p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewingUpload(upload)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = upload.fileUrl;
                                  link.download = upload.fileName;
                                  link.click();
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                CSV
                              </Button>
                              {upload.keyMetrics?.aiSummary && (
                                <AnalysisPDFExporter
                                  uploadSummary={upload.keyMetrics.aiSummary}
                                  analysis={upload.keyMetrics.analysis || {}}
                                  fileName={upload.fileName}
                                  uploadedAt={upload.created_date}
                                />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm('Delete this upload history record?')) {
                                    deleteHistoryMutation.mutate(upload.id);
                                  }
                                }}
                                disabled={deleteHistoryMutation.isPending}
                              >
                                {deleteHistoryMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FilePreviewModal 
          upload={previewingUpload}
          open={!!previewingUpload}
          onClose={() => setPreviewingUpload(null)}
        />
      </div>
    </div>
  );
}