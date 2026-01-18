import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, CheckCircle2, Loader2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { key: 'man', label: 'Man (People)', color: 'bg-blue-100 text-blue-800' },
  { key: 'machine', label: 'Machine (Equipment)', color: 'bg-green-100 text-green-800' },
  { key: 'material', label: 'Material', color: 'bg-purple-100 text-purple-800' },
  { key: 'method', label: 'Method (Process)', color: 'bg-orange-100 text-orange-800' },
  { key: 'environment', label: 'Environment', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'measurement', label: 'Measurement', color: 'bg-pink-100 text-pink-800' }
];

export default function IshikawaDiagram({ rca, onUpdate }) {
  const [ishikawa, setIshikawa] = useState(rca?.ishikawa || {
    man: [],
    machine: [],
    material: [],
    method: [],
    environment: [],
    measurement: []
  });
  const [newItems, setNewItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with rca prop when it changes
  useEffect(() => {
    if (rca?.ishikawa) {
      setIshikawa(rca.ishikawa);
    }
  }, [rca?.id]);

  const addCause = (category) => {
    const value = newItems[category]?.trim();
    if (!value) return;

    setIshikawa({
      ...ishikawa,
      [category]: [...(ishikawa[category] || []), value]
    });
    setNewItems({ ...newItems, [category]: '' });
  };

  const removeCause = (category, index) => {
    setIshikawa({
      ...ishikawa,
      [category]: (ishikawa[category] || []).filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      await onUpdate({ ishikawa });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    
    setSaving(false);
  };

  const handleExport = () => {
    let content = 'ISHIKAWA (FISHBONE) DIAGRAM\n\n';
    CATEGORIES.forEach(({ key, label }) => {
      const causes = ishikawa[key] || [];
      if (causes.length > 0) {
        content += `${label}:\n`;
        causes.forEach((cause, idx) => {
          content += `  ${idx + 1}. ${cause}\n`;
        });
        content += '\n';
      }
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ishikawa-Diagram-${rca?.id?.slice(0, 8) || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ishikawa (Fishbone) Diagram</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Categorize potential causes</p>
          </div>
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ishikawa diagram saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {CATEGORIES.map(({ key, label, color }) => (
          <div key={key} className="p-4 border rounded-lg bg-gray-50">
            <Badge className={`${color} mb-3`}>{label}</Badge>
            
            <div className="space-y-2 mb-3">
              {(ishikawa[key] || []).map((cause, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm">{cause}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCause(key, idx)}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newItems[key] || ''}
                onChange={(e) => setNewItems({ ...newItems, [key]: e.target.value })}
                placeholder={`Add ${label.toLowerCase()} cause...`}
                onKeyPress={(e) => e.key === 'Enter' && addCause(key)}
              />
              <Button onClick={() => addCause(key)} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button 
          onClick={handleSave} 
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Ishikawa Analysis
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}