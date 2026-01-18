import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, X, Loader2, AlertTriangle, CheckCircle2, 
  Thermometer, Gauge, Wind, Zap
} from "lucide-react";

const PARAMETER_FIELDS = [
  { key: "lineSpeed", label: "Line Speed", unit: "m/min", icon: Gauge, group: "speed" },
  { key: "webTensionIn", label: "Web Tension In", unit: "N/m", icon: Gauge, group: "tension" },
  { key: "webTensionOut", label: "Web Tension Out", unit: "N/m", icon: Gauge, group: "tension" },
  { key: "nipPressure", label: "Nip Pressure", unit: "bar", icon: Gauge, group: "pressure" },
  { key: "rollTempChill", label: "Chill Roll Temp", unit: "°C", icon: Thermometer, group: "temperature" },
  { key: "rollTempTop", label: "Top Roll Temp", unit: "°C", icon: Thermometer, group: "temperature" },
  { key: "rollTempBottom", label: "Bottom Roll Temp", unit: "°C", icon: Thermometer, group: "temperature" },
  { key: "humidity", label: "Humidity", unit: "%", icon: Wind, group: "environment" },
  { key: "roomTemp", label: "Room Temp", unit: "°C", icon: Thermometer, group: "environment" },
  { key: "coronaDyne", label: "Corona Dyne", unit: "dyne/cm", icon: Zap, group: "treatment" },
  { key: "uvDose", label: "UV Dose", unit: "mJ/cm²", icon: Zap, group: "treatment" },
  { key: "coatWeight", label: "Coat Weight", unit: "g/m²", icon: Gauge, group: "coating" },
  { key: "unwindTorque", label: "Unwind Torque", unit: "Nm", icon: Gauge, group: "torque" },
  { key: "rewindTorque", label: "Rewind Torque", unit: "Nm", icon: Gauge, group: "torque" },
];

const PARAMETER_GROUPS = {
  speed: "Speed & Motion",
  tension: "Web Tension",
  pressure: "Pressure",
  temperature: "Temperature",
  environment: "Environment",
  treatment: "Surface Treatment",
  coating: "Coating",
  torque: "Torque"
};

export default function ProcessRunEditor({ run, mode, isAdmin, defects = [], onComplete, onCancel }) {
  const [formData, setFormData] = useState({
    dateTimeStart: "",
    dateTimeEnd: "",
    line: "",
    productCode: "",
    orderID: "",
    operator: "",
    shift: "A",
    lineSpeed: "",
    webTensionIn: "",
    webTensionOut: "",
    nipPressure: "",
    rollTempChill: "",
    rollTempTop: "",
    rollTempBottom: "",
    humidity: "",
    roomTemp: "",
    coronaDyne: "",
    uvDose: "",
    coatWeight: "",
    unwindTorque: "",
    rewindTorque: "",
    qualityMetrics: {
      firstPassYield: "",
      defectRate: "",
      wastePercent: ""
    }
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (run) {
      setFormData({
        dateTimeStart: run.dateTimeStart ? new Date(run.dateTimeStart).toISOString().slice(0, 16) : "",
        dateTimeEnd: run.dateTimeEnd ? new Date(run.dateTimeEnd).toISOString().slice(0, 16) : "",
        line: run.line || "",
        productCode: run.productCode || "",
        orderID: run.orderID || "",
        operator: run.operator || "",
        shift: run.shift || "A",
        lineSpeed: run.lineSpeed || "",
        webTensionIn: run.webTensionIn || "",
        webTensionOut: run.webTensionOut || "",
        nipPressure: run.nipPressure || "",
        rollTempChill: run.rollTempChill || "",
        rollTempTop: run.rollTempTop || "",
        rollTempBottom: run.rollTempBottom || "",
        humidity: run.humidity || "",
        roomTemp: run.roomTemp || "",
        coronaDyne: run.coronaDyne || "",
        uvDose: run.uvDose || "",
        coatWeight: run.coatWeight || "",
        unwindTorque: run.unwindTorque || "",
        rewindTorque: run.rewindTorque || "",
        qualityMetrics: {
          firstPassYield: run.qualityMetrics?.firstPassYield || "",
          defectRate: run.qualityMetrics?.defectRate || "",
          wastePercent: run.qualityMetrics?.wastePercent || ""
        }
      });
    }
  }, [run]);

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        lineSpeed: formData.lineSpeed ? parseFloat(formData.lineSpeed) : undefined,
        webTensionIn: formData.webTensionIn ? parseFloat(formData.webTensionIn) : undefined,
        webTensionOut: formData.webTensionOut ? parseFloat(formData.webTensionOut) : undefined,
        nipPressure: formData.nipPressure ? parseFloat(formData.nipPressure) : undefined,
        rollTempChill: formData.rollTempChill ? parseFloat(formData.rollTempChill) : undefined,
        rollTempTop: formData.rollTempTop ? parseFloat(formData.rollTempTop) : undefined,
        rollTempBottom: formData.rollTempBottom ? parseFloat(formData.rollTempBottom) : undefined,
        humidity: formData.humidity ? parseFloat(formData.humidity) : undefined,
        roomTemp: formData.roomTemp ? parseFloat(formData.roomTemp) : undefined,
        coronaDyne: formData.coronaDyne ? parseFloat(formData.coronaDyne) : undefined,
        uvDose: formData.uvDose ? parseFloat(formData.uvDose) : undefined,
        coatWeight: formData.coatWeight ? parseFloat(formData.coatWeight) : undefined,
        unwindTorque: formData.unwindTorque ? parseFloat(formData.unwindTorque) : undefined,
        rewindTorque: formData.rewindTorque ? parseFloat(formData.rewindTorque) : undefined,
        qualityMetrics: {
          firstPassYield: formData.qualityMetrics.firstPassYield ? parseFloat(formData.qualityMetrics.firstPassYield) : undefined,
          defectRate: formData.qualityMetrics.defectRate ? parseFloat(formData.qualityMetrics.defectRate) : undefined,
          wastePercent: formData.qualityMetrics.wastePercent ? parseFloat(formData.qualityMetrics.wastePercent) : undefined
        }
      };

      if (mode === "create") {
        await base44.entities.ProcessRun.create(dataToSave);
      } else if (mode === "edit" && run) {
        await base44.entities.ProcessRun.update(run.id, dataToSave);
      }

      onComplete();
    } catch (err) {
      setError(err.message || "Failed to save");
    }

    setSaving(false);
  };

  const isViewOnly = mode === "view" || !isAdmin;
  const groupedFields = PARAMETER_FIELDS.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Start Date/Time *</Label>
              <Input
                type="datetime-local"
                value={formData.dateTimeStart}
                onChange={(e) => handleChange("dateTimeStart", e.target.value)}
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Date/Time</Label>
              <Input
                type="datetime-local"
                value={formData.dateTimeEnd}
                onChange={(e) => handleChange("dateTimeEnd", e.target.value)}
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select
                value={formData.shift}
                onValueChange={(val) => handleChange("shift", val)}
                disabled={isViewOnly}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Shift A</SelectItem>
                  <SelectItem value="B">Shift B</SelectItem>
                  <SelectItem value="C">Shift C</SelectItem>
                  <SelectItem value="D">Shift D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Production Line *</Label>
              <Input
                value={formData.line}
                onChange={(e) => handleChange("line", e.target.value)}
                placeholder="e.g., Line 1"
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Product Code *</Label>
              <Input
                value={formData.productCode}
                onChange={(e) => handleChange("productCode", e.target.value)}
                placeholder="e.g., WF-TINT-5MIL"
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Order ID</Label>
              <Input
                value={formData.orderID}
                onChange={(e) => handleChange("orderID", e.target.value)}
                placeholder="Work order ID"
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Operator *</Label>
              <Input
                value={formData.operator}
                onChange={(e) => handleChange("operator", e.target.value)}
                placeholder="Operator name"
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Process Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([groupKey, fields]) => {
              const IconComponent = fields[0].icon;
              return (
              <div key={groupKey}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  {PARAMETER_GROUPS[groupKey]}
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-sm">{field.label}</Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          step="any"
                          value={formData[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          disabled={isViewOnly}
                          className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {field.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quality Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>First Pass Yield (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.qualityMetrics.firstPassYield}
                onChange={(e) => handleChange("qualityMetrics.firstPassYield", e.target.value)}
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Defect Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.qualityMetrics.defectRate}
                onChange={(e) => handleChange("qualityMetrics.defectRate", e.target.value)}
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Waste (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.qualityMetrics.wastePercent}
                onChange={(e) => handleChange("qualityMetrics.wastePercent", e.target.value)}
                disabled={isViewOnly}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defects During Run */}
      {defects.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Defects During This Run ({defects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {defects.map((defect) => (
                <div key={defect.id} className="p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{defect.defectType?.replace(/_/g, ' ')}</span>
                      <Badge className={`ml-2 ${
                        defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        defect.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {defect.severity}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(defect.dateTime || defect.created_date).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          {isViewOnly ? "Close" : "Cancel"}
        </Button>
        {!isViewOnly && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Process Run</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}