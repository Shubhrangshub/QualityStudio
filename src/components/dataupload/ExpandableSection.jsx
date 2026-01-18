import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExpandableSection({ title, icon: Icon, children, defaultExpanded = true, className = "" }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-lg border ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" />}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </Button>
      {isExpanded && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}