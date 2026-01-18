# AI Service for Quality Studio
# This provides mock AI responses for demo/preview
# Replace with real AI integration in production

def get_rca_suggestions(defect_description, defect_type, severity):
    """Generate RCA suggestions based on defect data"""
    
    suggestions = {
        "bubbles_voids": [
            "Material moisture content - Check drying process and storage conditions",
            "Temperature variation - Review heating zone calibration",
            "Pressure inconsistency - Inspect vacuum system and seals",
            "Contamination - Audit cleanroom procedures and filtration"
        ],
        "delamination": [
            "Adhesive application - Verify coating thickness and uniformity",
            "Substrate surface preparation - Review cleaning and corona treatment",
            "Curing temperature - Check oven temperature profiles",
            "Material compatibility - Test adhesive-substrate bonding"
        ],
        "scratches": [
            "Handling procedures - Review operator training and PPE usage",
            "Equipment wear - Inspect rollers and guides for damage",
            "Packaging material - Check protective film quality",
            "Transport conditions - Audit storage and shipping practices"
        ],
        "haze": [
            "Raw material quality - Test polymer clarity and additives",
            "Processing temperature - Optimize extrusion temperature profile",
            "Cooling rate - Review chill roll settings",
            "Contamination - Check filter replacement schedule"
        ]
    }
    
    default_suggestions = [
        "Process parameter deviation - Review and validate all critical process parameters",
        "Equipment maintenance - Check maintenance logs and calibration records",
        "Operator training - Verify SOP compliance and skill level",
        "Material batch variation - Compare with golden batch specifications"
    ]
    
    return {
        "suggestions": suggestions.get(defect_type, default_suggestions),
        "confidence": 0.82,
        "model": "quality-studio-ai-mock",
        "additional_analysis": {
            "severity_impact": f"{severity} severity indicates {'immediate action required' if severity == 'critical' else 'timely investigation needed'}",
            "recommended_actions": [
                "Conduct 5 Whys analysis",
                "Create Ishikawa diagram",
                "Review similar historical defects",
                "Gather evidence from process logs"
            ]
        }
    }

def classify_defect(description, image_url=None):
    """Classify defect type from description or image"""
    
    classification_rules = {
        "bubble": ("bubbles_voids", 0.9),
        "void": ("bubbles_voids", 0.88),
        "delamination": ("delamination", 0.92),
        "peel": ("delamination", 0.85),
        "scratch": ("scratches", 0.93),
        "mark": ("scratches", 0.78),
        "haze": ("haze", 0.91),
        "cloudiness": ("haze", 0.82),
        "orange peel": ("orange_peel", 0.89),
        "fisheye": ("fisheyes", 0.90),
        "gel": ("gels_contamination", 0.87),
        "contamination": ("gels_contamination", 0.85)
    }
    
    description_lower = description.lower()
    
    for keyword, (defect_type, confidence) in classification_rules.items():
        if keyword in description_lower:
            return {
                "defect_type": defect_type,
                "confidence": confidence,
                "severity_suggestion": "major" if confidence > 0.85 else "minor",
                "reasoning": f"Keyword '{keyword}' detected in description with high confidence"
            }
    
    return {
        "defect_type": "unknown",
        "confidence": 0.45,
        "severity_suggestion": "minor",
        "reasoning": "Unable to classify - manual inspection recommended"
    }

def generate_capa_actions(root_cause, defect_type):
    """Generate CAPA actions based on root cause"""
    
    capa_templates = {
        "material": {
            "corrective": [
                "Quarantine affected material batches and initiate supplier investigation",
                "Implement incoming inspection with tightened acceptance criteria",
                "Switch to approved alternative supplier if available"
            ],
            "preventive": [
                "Update material specifications with stricter tolerances",
                "Establish supplier quality agreement with performance metrics",
                "Implement periodic supplier audits (quarterly)",
                "Add material testing to pre-production checklist"
            ]
        },
        "process": {
            "corrective": [
                "Adjust process parameters to within specification limits",
                "Recalibrate equipment and verify measurement accuracy",
                "Retrain operators on critical control points"
            ],
            "preventive": [
                "Implement Statistical Process Control (SPC) on critical parameters",
                "Add automated parameter monitoring and alerts",
                "Create process parameter lockout for non-supervisors",
                "Schedule preventive maintenance based on run hours"
            ]
        },
        "equipment": {
            "corrective": [
                "Repair or replace faulty equipment components",
                "Perform comprehensive equipment validation",
                "Document all adjustments and calibrations made"
            ],
            "preventive": [
                "Update preventive maintenance schedule",
                "Install condition monitoring sensors",
                "Create spare parts inventory for critical components",
                "Implement equipment performance trending"
            ]
        }
    }
    
    # Determine category from root cause
    cause_lower = root_cause.lower()
    if any(word in cause_lower for word in ["material", "supplier", "raw"]):
        category = "material"
    elif any(word in cause_lower for word in ["equipment", "machine", "tool"]):
        category = "equipment"
    else:
        category = "process"
    
    template = capa_templates.get(category, capa_templates["process"])
    
    return {
        "corrective_actions": template["corrective"],
        "preventive_actions": template["preventive"],
        "category": category,
        "estimated_effectiveness": 0.85,
        "implementation_priority": "high",
        "suggested_owner": "Quality Engineering Team",
        "estimated_completion": "30 days"
    }

def predict_defect_trend(historical_defects):
    """Predict future defect trends based on historical data"""
    
    # Simple mock prediction
    total_defects = len(historical_defects)
    
    if total_defects < 5:
        trend = "insufficient_data"
        prediction = "Collect more data for meaningful analysis"
    elif total_defects > 20:
        trend = "increasing"
        prediction = "Defect rate trending up - immediate investigation required"
    else:
        trend = "stable"
        prediction = "Defect rate within normal variation"
    
    return {
        "trend": trend,
        "prediction": prediction,
        "confidence": 0.73,
        "recommended_actions": [
            "Continue monitoring with daily reviews",
            "Compare against historical baseline",
            "Investigate if rate exceeds 3 sigma limits"
        ]
    }

def search_knowledge_base(query, documents):
    """Search knowledge base with semantic matching"""
    
    # Mock semantic search
    query_lower = query.lower()
    
    relevant_docs = []
    for doc in documents:
        title_lower = doc.get("title", "").lower()
        content_lower = doc.get("content", "").lower()
        
        # Simple keyword matching (in real implementation, use embeddings)
        if any(word in title_lower or word in content_lower for word in query_lower.split()):
            relevant_docs.append({
                **doc,
                "relevance_score": 0.85,
                "matched_terms": [word for word in query_lower.split() if word in content_lower]
            })
    
    return {
        "results": relevant_docs[:5],  # Top 5 results
        "total_matches": len(relevant_docs),
        "search_time_ms": 45
    }

# Export all functions
__all__ = [
    'get_rca_suggestions',
    'classify_defect',
    'generate_capa_actions',
    'predict_defect_trend',
    'search_knowledge_base'
]
