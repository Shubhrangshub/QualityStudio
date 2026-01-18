import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function KPICard({ title, value, subtitle, icon: Icon, color, trend }) {
  const colorClasses = {
    orange: "bg-orange-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500"
  };

  const bgColor = colorClasses[color] || colorClasses.blue;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className={`p-2 rounded-lg ${bgColor} bg-opacity-10`}>
            <Icon className={`w-4 h-4 ${bgColor.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {trend === "up" && <TrendingUp className="w-3 h-3 text-red-500" />}
                {trend === "down" && <TrendingDown className="w-3 h-3 text-green-500" />}
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}