import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, AlertCircle, Sparkles } from "lucide-react";

export default function ParameterMapper({ extractedData, onConfirm, onSkip }) {
  const [parameterRoles, setParameterRoles] = useState({});
  
  // Extract all unique column names from the data
  const allColumns = extractedData && extractedData.length > 0 
    ? Object.keys(extractedData[0])
    : [];

  // AI auto-suggestion based on parameter name
  const suggestRole = (paramName) => {
    const lower = paramName.toLowerCase();
    
    // Response variables (quality characteristics)
    if (lower.includes('defect') || lower.includes('yield') || lower.includes('quality') || 
        lower.includes('haze') || lower.includes('strength') || lower.includes('thickness') ||
        lower.includes('cpk') || lower.includes('cp') || lower.includes('ppm')) {
      return 'response';
    }
    
    // Factors (independent variables)
    if (lower.includes('speed') || lower.includes('pressure') || lower.includes('temp') ||
        lower.includes('tension') || lower.includes('humidity') || lower.includes('power') ||
        lower.includes('time') || lower.includes('rate')) {
      return 'factor';
    }
    
    // Nuisance/Noise
    if (lower.includes('operator') || lower.includes('shift') || lower.includes('date') ||
        lower.includes('id') || lower.includes('line') || lower.includes('block')) {
      return 'nuisance';
    }
    
    return 'unassigned';
  };

  // Auto-assign all parameters
  const handleAutoAssign = () => {
    const autoAssigned = {};
    allColumns.forEach(col => {
      autoAssigned[col] = suggestRole(col);
    });
    setParameterRoles(autoAssigned);
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'response': return 'bg-green-100 text-green-800';
      case 'factor': return 'bg-blue-100 text-blue-800';
      case 'nuisance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleConfirm = () => {
    onConfirm(parameterRoles);
  };

  const responseCount = Object.values(parameterRoles).filter(r => r === 'response').length;
  const factorCount = Object.values(parameterRoles).filter(r => r === 'factor').length;
  const isValid = responseCount > 0; // Need at least one response variable

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Enhanced Analysis: Parameter Mapping
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Designate which parameters are responses (quality characteristics) vs factors (process settings)
            </p>
          </div>
          <Button onClick={handleAutoAssign} variant="outline" className="border-purple-300">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Auto-Assign
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-white rounded-lg border border-purple-200">
          <p className="text-sm font-medium text-purple-900 mb-3">📊 Parameter Roles:</p>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-2 bg-green-50 rounded border border-green-200">
              <p className="font-semibold text-green-900">Response Variables</p>
              <p className="text-green-700 mt-1">Quality characteristics you want to optimize (defect rate, yield, Cpk)</p>
            </div>
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-900">Factor Variables</p>
              <p className="text-blue-700 mt-1">Process settings you control (speed, pressure, temperature)</p>
            </div>
            <div className="p-2 bg-gray-50 rounded border border-gray-200">
              <p className="font-semibold text-gray-900">Nuisance Variables</p>
              <p className="text-gray-700 mt-1">Context data (operator, date, line)</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allColumns.map((col) => (
            <div key={col} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-medium text-gray-900 min-w-[150px]">{col}</span>
                <Badge className={getRoleColor(parameterRoles[col] || 'unassigned')}>
                  {parameterRoles[col] || 'unassigned'}
                </Badge>
              </div>
              <Select 
                value={parameterRoles[col] || 'unassigned'}
                onValueChange={(value) => setParameterRoles({...parameterRoles, [col]: value})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="factor">Factor</SelectItem>
                  <SelectItem value="nuisance">Nuisance</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {!isValid && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Please assign at least one <strong>Response Variable</strong> for capability analysis
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {responseCount} responses • {factorCount} factors
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onSkip}>
              Skip Mapping
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isValid}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Confirm & Analyze
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}