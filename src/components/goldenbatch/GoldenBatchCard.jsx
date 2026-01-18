import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Trash2, Eye, TrendingUp, Settings, ChevronDown, ChevronUp } from "lucide-react";

const PARAMETER_LABELS = {
  lineSpeed: { label: "Line Speed", unit: "m/min" },
  webTensionIn: { label: "Web Tension In", unit: "N/m" },
  webTensionOut: { label: "Web Tension Out", unit: "N/m" },
  nipPressure: { label: "Nip Pressure", unit: "bar" },
  rollTempChill: { label: "Chill Roll Temp", unit: "°C" },
  rollTempTop: { label: "Top Roll Temp", unit: "°C" },
  rollTempBottom: { label: "Bottom Roll Temp", unit: "°C" },
  humidity: { label: "Humidity", unit: "%" },
  roomTemp: { label: "Room Temp", unit: "°C" },
  coronaDyne: { label: "Corona Dyne", unit: "dyne/cm" },
  uvDose: { label: "UV Dose", unit: "mJ/cm²" },
  coatWeight: { label: "Coat Weight", unit: "g/m²" },
  unwindTorque: { label: "Unwind Torque", unit: "Nm" },
  rewindTorque: { label: "Rewind Torque", unit: "Nm" },
};

export default function GoldenBatchCard({ batch, isAdmin, onDelete, onSelect }) {
  const [showParams, setShowParams] = useState(false);
  const paramCount = Object.keys(batch.parameters || {}).filter(k => batch.parameters[k] !== undefined).length;

  return (
    <Card className="hover:shadow-lg transition-shadow border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-lg">{batch.name}</CardTitle>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{batch.productCode}</Badge>
          <Badge variant="outline">{batch.line}</Badge>
        </div>
        
        {batch.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{batch.description}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Settings className="w-3 h-3" />
            <span>{paramCount} parameters</span>
          </div>
          {batch.qualityMetrics?.firstPassYield && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>FPY: {batch.qualityMetrics.firstPassYield}%</span>
            </div>
          )}
        </div>

        {/* View Parameters Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowParams(!showParams)}
          className="w-full justify-between text-gray-600 hover:text-gray-900"
        >
          <span className="text-xs">View Parameters</span>
          {showParams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showParams && (
          <div className="p-3 bg-white rounded-lg border border-yellow-200 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 text-gray-600">Parameter</th>
                  <th className="text-right py-1 text-gray-600">Value</th>
                  <th className="text-right py-1 text-gray-600">Tol.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(batch.parameters || {}).map(([key, value]) => {
                  if (value === undefined || value === null) return null;
                  const paramInfo = PARAMETER_LABELS[key] || { label: key, unit: "" };
                  const tolerance = batch.tolerances?.[key] || 5;
                  return (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-1 text-gray-700">{paramInfo.label}</td>
                      <td className="py-1 text-right font-medium">{value} {paramInfo.unit}</td>
                      <td className="py-1 text-right text-gray-500">±{tolerance}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {batch.qualityMetrics && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-600 font-medium mb-1">Quality Metrics:</p>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {batch.qualityMetrics.firstPassYield && (
                    <span>FPY: {batch.qualityMetrics.firstPassYield}%</span>
                  )}
                  {batch.qualityMetrics.defectRate && (
                    <span>Defect: {batch.qualityMetrics.defectRate}%</span>
                  )}
                  {batch.qualityMetrics.wastePercent && (
                    <span>Waste: {batch.qualityMetrics.wastePercent}%</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          Created: {new Date(batch.created_date).toLocaleDateString()}
          {batch.approvedBy && ` by ${batch.approvedBy}`}
        </div>
        
        <Button 
          onClick={onSelect}
          className="w-full bg-yellow-500 hover:bg-yellow-600 mt-2"
        >
          <Eye className="w-4 h-4 mr-2" />
          View & Compare
        </Button>
      </CardContent>
    </Card>
  );
}