import React, { useState } from "react";
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Eye, EyeOff, Info } from "lucide-react";

export default function SampleDataLoader({ onSuccess, sampleDataCount, showSampleData, onToggleShow }) {
  const [loading, setLoading] = useState(false);

  const loadSampleData = async () => {
    setLoading(true);
    try {
      const user = await api.auth.me();
      const baseDate = new Date('2024-12-01T08:00:00');
      
      // Create 5 sample process runs with varying quality
      const sampleRuns = [
        {
          dateTimeStart: new Date(baseDate.getTime() + 0 * 86400000).toISOString(),
          dateTimeEnd: new Date(baseDate.getTime() + 0 * 86400000 + 28800000).toISOString(),
          line: "Line 1", productCode: "WF-TINT-5MIL", orderID: "WO-SAMPLE-001",
          operator: "Demo Operator", shift: "A",
          lineSpeed: 45, webTensionIn: 25, webTensionOut: 23, nipPressure: 4.5,
          rollTempChill: 18, rollTempTop: 85, rollTempBottom: 82,
          humidity: 45, roomTemp: 22, coronaDyne: 42, uvDose: 350, coatWeight: 18,
          unwindTorque: 12, rewindTorque: 15,
          qualityMetrics: { firstPassYield: 98.5, defectRate: 1.5, wastePercent: 2.0 },
          isSampleData: true
        },
        {
          dateTimeStart: new Date(baseDate.getTime() + 1 * 86400000).toISOString(),
          dateTimeEnd: new Date(baseDate.getTime() + 1 * 86400000 + 28800000).toISOString(),
          line: "Line 1", productCode: "WF-TINT-5MIL", orderID: "WO-SAMPLE-002",
          operator: "Demo Operator", shift: "B",
          lineSpeed: 48, webTensionIn: 27, webTensionOut: 25, nipPressure: 4.8,
          rollTempChill: 19, rollTempTop: 88, rollTempBottom: 85,
          humidity: 42, roomTemp: 23, coronaDyne: 44, uvDose: 360, coatWeight: 19,
          unwindTorque: 13, rewindTorque: 16,
          qualityMetrics: { firstPassYield: 97.2, defectRate: 2.8, wastePercent: 2.5 },
          isSampleData: true
        },
        {
          dateTimeStart: new Date(baseDate.getTime() + 2 * 86400000).toISOString(),
          dateTimeEnd: new Date(baseDate.getTime() + 2 * 86400000 + 28800000).toISOString(),
          line: "Line 1", productCode: "WF-TINT-5MIL", orderID: "WO-SAMPLE-003",
          operator: "Demo Operator", shift: "A",
          lineSpeed: 52, webTensionIn: 30, webTensionOut: 28, nipPressure: 5.2,
          rollTempChill: 20, rollTempTop: 92, rollTempBottom: 90,
          humidity: 48, roomTemp: 24, coronaDyne: 38, uvDose: 320, coatWeight: 17,
          unwindTorque: 14, rewindTorque: 17,
          qualityMetrics: { firstPassYield: 85.3, defectRate: 14.7, wastePercent: 8.2 },
          isSampleData: true
        },
        {
          dateTimeStart: new Date(baseDate.getTime() + 3 * 86400000).toISOString(),
          dateTimeEnd: new Date(baseDate.getTime() + 3 * 86400000 + 28800000).toISOString(),
          line: "Line 2", productCode: "PPF-CLEAR-8MIL", orderID: "WO-SAMPLE-004",
          operator: "Demo Operator", shift: "C",
          lineSpeed: 40, webTensionIn: 22, webTensionOut: 20, nipPressure: 4.0,
          rollTempChill: 17, rollTempTop: 80, rollTempBottom: 78,
          humidity: 50, roomTemp: 21, coronaDyne: 45, uvDose: 380, coatWeight: 20,
          unwindTorque: 11, rewindTorque: 14,
          qualityMetrics: { firstPassYield: 96.8, defectRate: 3.2, wastePercent: 3.0 },
          isSampleData: true
        },
        {
          dateTimeStart: new Date(baseDate.getTime() + 4 * 86400000).toISOString(),
          dateTimeEnd: new Date(baseDate.getTime() + 4 * 86400000 + 28800000).toISOString(),
          line: "Line 1", productCode: "WF-TINT-5MIL", orderID: "WO-SAMPLE-005",
          operator: "Demo Operator", shift: "A",
          lineSpeed: 46, webTensionIn: 26, webTensionOut: 24, nipPressure: 4.6,
          rollTempChill: 18, rollTempTop: 86, rollTempBottom: 83,
          humidity: 44, roomTemp: 22, coronaDyne: 43, uvDose: 355, coatWeight: 18.5,
          unwindTorque: 12, rewindTorque: 15,
          qualityMetrics: { firstPassYield: 98.8, defectRate: 1.2, wastePercent: 1.8 },
          isSampleData: true
        }
      ];

      const createdRuns = [];
      for (const run of sampleRuns) {
        const created = await api.entities.ProcessRun.create(run);
        createdRuns.push(created);
      }

      // Create sample defects linked to the poor quality run (85.3% FPY)
      const poorRun = createdRuns[2];
      const sampleDefects = [
        {
          dateTime: new Date(poorRun.dateTimeStart).toISOString(),
          line: poorRun.line, productCode: poorRun.productCode,
          defectType: "bubbles_voids", severity: "major",
          operator: poorRun.operator, shift: poorRun.shift,
          webPositionMD: 150.5, webPositionCD: 320,
          status: "open", processRunId: poorRun.id, isSampleData: true
        },
        {
          dateTime: new Date(poorRun.dateTimeStart).toISOString(),
          line: poorRun.line, productCode: poorRun.productCode,
          defectType: "haze", severity: "minor",
          operator: poorRun.operator, shift: poorRun.shift,
          webPositionMD: 280.3, webPositionCD: 450,
          status: "open", processRunId: poorRun.id, isSampleData: true
        }
      ];

      for (const defect of sampleDefects) {
        await api.entities.DefectTicket.create(defect);
      }

      // Create golden batch based on best run (98.8% FPY)
      const bestRun = createdRuns[4];
      await api.entities.GoldenBatch.create({
        name: "🌟 SAMPLE Golden Standard - WF-TINT-5MIL",
        description: "Optimal parameters for Window Film Tint 5mil (DEMO DATA)",
        productCode: bestRun.productCode, line: bestRun.line,
        sourceProcessRunId: bestRun.id,
        parameters: {
          lineSpeed: bestRun.lineSpeed, webTensionIn: bestRun.webTensionIn,
          webTensionOut: bestRun.webTensionOut, nipPressure: bestRun.nipPressure,
          rollTempChill: bestRun.rollTempChill, rollTempTop: bestRun.rollTempTop,
          rollTempBottom: bestRun.rollTempBottom, humidity: bestRun.humidity,
          roomTemp: bestRun.roomTemp, coronaDyne: bestRun.coronaDyne,
          uvDose: bestRun.uvDose, coatWeight: bestRun.coatWeight,
          unwindTorque: bestRun.unwindTorque, rewindTorque: bestRun.rewindTorque
        },
        tolerances: {
          lineSpeed: 5, webTensionIn: 5, webTensionOut: 5, nipPressure: 5,
          rollTempChill: 10, rollTempTop: 5, rollTempBottom: 5,
          humidity: 10, roomTemp: 10, coronaDyne: 5, uvDose: 5,
          coatWeight: 5, unwindTorque: 10, rewindTorque: 10
        },
        qualityMetrics: bestRun.qualityMetrics,
        status: "active", approvedBy: user.email,
        approvedDate: new Date().toISOString(), isSampleData: true
      });

      onSuccess();
    } catch (error) {
      alert("Failed to load sample data: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {sampleDataCount > 0 && (
        <Alert className="bg-purple-50 border-purple-200">
          <Info className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-900">
            <div className="flex items-center justify-between">
              <div>
                <strong>{sampleDataCount} sample records loaded.</strong> Sample data is tagged and separate from your production data.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShow}
                className={showSampleData ? "bg-purple-100" : ""}
              >
                {showSampleData ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showSampleData ? "Hide" : "Show"} Sample
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {sampleDataCount === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="flex items-center justify-between">
              <div>
                <strong>New here?</strong> Load sample data to explore features:
                <div className="text-sm mt-1">
                  • 5 process runs with varying quality (85-98% FPY)
                  <br />
                  • 1 golden batch for comparison
                  <br />
                  • 2 linked defects showing correlations
                </div>
              </div>
              <Button
                onClick={loadSampleData}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Load Sample Data</>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}