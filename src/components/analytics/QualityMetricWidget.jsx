import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function QualityMetricWidget({ 
  title, 
  value, 
  subtitle, 
  trend, 
  target, 
  status = "good",
  icon: Icon 
}) {
  const statusColors = {
    good: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-500" },
    warning: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", icon: "text-yellow-500" },
    critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-500" }
  };

  const colors = statusColors[status] || statusColors.good;

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card className={`${colors.bg} border-2 ${colors.border}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-3xl font-bold ${colors.text}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            )}
            {target && (
              <p className="text-xs text-gray-500 mt-1">Target: {target}</p>
            )}
          </div>
          {Icon && (
            <Icon className={`w-10 h-10 ${colors.icon} opacity-30`} />
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            <TrendIcon className={`w-4 h-4 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"}`} />
            <span className="text-xs text-gray-600">
              {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}