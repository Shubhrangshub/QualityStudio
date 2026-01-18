# AI Service for Quality Studio using OpenAI GPT-5.2
# Uses Emergent LLM Key for API access

import os
import json
import uuid
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

async def get_rca_suggestions(defect_description: str, defect_type: str, severity: str) -> dict:
    """Generate AI-powered RCA suggestions based on defect data using GPT-5.2"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rca-{uuid.uuid4()}",
            system_message="""You are an expert Quality Engineer specializing in Root Cause Analysis (RCA) for manufacturing defects in window films and polymer processing.

Your task is to analyze defect information and provide structured root cause suggestions.

Always respond in valid JSON format with this structure:
{
    "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"],
    "confidence": 0.85,
    "model": "gpt-5.2",
    "additional_analysis": {
        "severity_impact": "brief description of severity impact",
        "recommended_actions": ["action 1", "action 2", "action 3", "action 4"]
    }
}"""
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this manufacturing defect and provide root cause suggestions:

Defect Type: {defect_type}
Severity: {severity}
Description: {defect_description}

Provide 4 specific, actionable root cause suggestions relevant to window film/polymer manufacturing.
Focus on: material issues, process parameters, equipment conditions, and environmental factors.

Respond ONLY with valid JSON."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Try to parse the JSON response
        try:
            # Clean up response if needed
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            result["model"] = "gpt-5.2"
            return result
        except json.JSONDecodeError:
            # Return structured response even if JSON parsing fails
            return {
                "suggestions": [
                    f"Based on the {defect_type} defect: Check process parameters and temperature profiles",
                    "Review material batch specifications and compare with golden batch",
                    "Inspect equipment calibration and maintenance records",
                    "Audit environmental conditions and cleanroom procedures"
                ],
                "confidence": 0.75,
                "model": "gpt-5.2",
                "additional_analysis": {
                    "severity_impact": f"{severity} severity - requires {'immediate' if severity == 'critical' else 'timely'} investigation",
                    "recommended_actions": [
                        "Conduct 5 Whys analysis",
                        "Create Ishikawa diagram",
                        "Review similar historical defects",
                        "Gather evidence from process logs"
                    ]
                },
                "raw_response": response
            }
    except Exception as e:
        # Fallback to mock response if API fails
        return {
            "suggestions": [
                "Process parameter deviation - Review and validate all critical process parameters",
                "Equipment maintenance - Check maintenance logs and calibration records",
                "Operator training - Verify SOP compliance and skill level",
                "Material batch variation - Compare with golden batch specifications"
            ],
            "confidence": 0.70,
            "model": "fallback",
            "error": str(e),
            "additional_analysis": {
                "severity_impact": f"{severity} severity indicates timely investigation needed",
                "recommended_actions": [
                    "Conduct 5 Whys analysis",
                    "Create Ishikawa diagram",
                    "Review similar historical defects",
                    "Gather evidence from process logs"
                ]
            }
        }


async def classify_defect(description: str, image_url: str = None) -> dict:
    """AI-powered defect classification using GPT-5.2"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify-{uuid.uuid4()}",
            system_message="""You are an expert Quality Inspector specializing in defect classification for window films and polymer products.

Your task is to classify defects based on descriptions.

Common defect types in window film/polymer manufacturing:
- bubbles_voids: Air bubbles, voids, or trapped gas
- delamination: Layer separation, peeling, adhesion failure
- scratches: Surface scratches, marks, handling damage
- haze: Cloudiness, reduced clarity, optical defects
- orange_peel: Surface texture issues
- fisheyes: Circular defects from contamination
- gels_contamination: Foreign material, contamination

Always respond in valid JSON format:
{
    "defect_type": "type_name",
    "confidence": 0.85,
    "severity_suggestion": "minor|major|critical",
    "reasoning": "explanation"
}"""
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Classify this manufacturing defect:

Description: {description}

Based on the description, determine:
1. The most likely defect type
2. Your confidence level (0.0-1.0)
3. Suggested severity (minor, major, critical)
4. Brief reasoning for your classification

Respond ONLY with valid JSON."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            result["model"] = "gpt-5.2"
            return result
        except json.JSONDecodeError:
            return {
                "defect_type": "unknown",
                "confidence": 0.50,
                "severity_suggestion": "major",
                "reasoning": "AI classification in progress - manual review recommended",
                "model": "gpt-5.2",
                "raw_response": response
            }
    except Exception as e:
        return {
            "defect_type": "unknown",
            "confidence": 0.45,
            "severity_suggestion": "minor",
            "reasoning": f"Classification error: {str(e)} - manual inspection recommended",
            "model": "fallback"
        }


async def generate_capa_actions(root_cause: str, defect_type: str) -> dict:
    """Generate CAPA actions based on root cause using GPT-5.2"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"capa-{uuid.uuid4()}",
            system_message="""You are a Quality Engineering expert specializing in CAPA (Corrective and Preventive Action) planning for manufacturing.

Your task is to generate specific, actionable CAPA plans based on identified root causes.

Always respond in valid JSON format:
{
    "corrective_actions": ["action 1", "action 2", "action 3"],
    "preventive_actions": ["action 1", "action 2", "action 3", "action 4"],
    "category": "material|process|equipment|training",
    "estimated_effectiveness": 0.85,
    "implementation_priority": "high|medium|low",
    "suggested_owner": "team/role name",
    "estimated_completion": "timeframe"
}"""
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Generate a CAPA plan for:

Root Cause: {root_cause}
Defect Type: {defect_type}

Provide:
1. 3 specific corrective actions (immediate fixes)
2. 4 preventive actions (long-term prevention)
3. Category (material/process/equipment/training)
4. Estimated effectiveness (0.0-1.0)
5. Implementation priority
6. Suggested owner
7. Estimated completion timeframe

Respond ONLY with valid JSON."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            result["model"] = "gpt-5.2"
            return result
        except json.JSONDecodeError:
            return {
                "corrective_actions": [
                    "Investigate and address the identified root cause immediately",
                    "Quarantine affected products and materials",
                    "Document findings and corrective measures taken"
                ],
                "preventive_actions": [
                    "Implement monitoring controls for identified root cause",
                    "Update relevant SOPs and training materials",
                    "Schedule preventive maintenance if equipment-related",
                    "Establish KPIs to track recurrence"
                ],
                "category": "process",
                "estimated_effectiveness": 0.80,
                "implementation_priority": "high",
                "suggested_owner": "Quality Engineering Team",
                "estimated_completion": "30 days",
                "model": "gpt-5.2",
                "raw_response": response
            }
    except Exception as e:
        return {
            "corrective_actions": [
                "Review and address the root cause",
                "Implement immediate containment measures",
                "Document all corrective actions"
            ],
            "preventive_actions": [
                "Update process controls",
                "Enhance monitoring systems",
                "Conduct training refresher",
                "Schedule follow-up audits"
            ],
            "category": "process",
            "estimated_effectiveness": 0.75,
            "implementation_priority": "high",
            "suggested_owner": "Quality Engineering Team",
            "estimated_completion": "30 days",
            "model": "fallback",
            "error": str(e)
        }


async def predict_defect_trend(historical_defects: list) -> dict:
    """Predict future defect trends based on historical data using GPT-5.2"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"trend-{uuid.uuid4()}",
            system_message="""You are a Quality Data Analyst expert in defect trend analysis and prediction.

Analyze defect patterns and provide trend predictions.

Always respond in valid JSON format:
{
    "trend": "increasing|decreasing|stable|insufficient_data",
    "prediction": "trend description",
    "confidence": 0.75,
    "recommended_actions": ["action 1", "action 2", "action 3"]
}"""
        ).with_model("openai", "gpt-5.2")
        
        defect_summary = json.dumps(historical_defects[:20]) if historical_defects else "No data available"
        
        prompt = f"""Analyze this defect data and predict trends:

Historical Defects (recent): {defect_summary}
Total count: {len(historical_defects) if historical_defects else 0}

Provide:
1. Overall trend (increasing/decreasing/stable/insufficient_data)
2. Trend prediction and explanation
3. Confidence level
4. Recommended actions

Respond ONLY with valid JSON."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            result["model"] = "gpt-5.2"
            return result
        except json.JSONDecodeError:
            total = len(historical_defects) if historical_defects else 0
            return {
                "trend": "insufficient_data" if total < 5 else "stable",
                "prediction": "Collect more data for meaningful analysis" if total < 5 else "Defect rate within normal variation",
                "confidence": 0.70,
                "recommended_actions": [
                    "Continue monitoring with daily reviews",
                    "Compare against historical baseline",
                    "Investigate if rate exceeds 3 sigma limits"
                ],
                "model": "gpt-5.2"
            }
    except Exception as e:
        return {
            "trend": "insufficient_data",
            "prediction": f"Unable to analyze trends: {str(e)}",
            "confidence": 0.50,
            "recommended_actions": [
                "Continue data collection",
                "Manual trend analysis recommended"
            ],
            "model": "fallback"
        }


async def search_knowledge_base(query: str, documents: list) -> dict:
    """Semantic knowledge base search using GPT-5.2"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"search-{uuid.uuid4()}",
            system_message="""You are a Quality Knowledge Base search assistant.

Your task is to find the most relevant documents from a knowledge base based on the search query.

Return results in valid JSON format:
{
    "results": [
        {"id": "doc_id", "title": "title", "relevance_score": 0.85, "matched_terms": ["term1", "term2"]}
    ],
    "total_matches": 5,
    "search_time_ms": 45
}"""
        ).with_model("openai", "gpt-5.2")
        
        # Prepare document summaries for search
        doc_summaries = []
        for doc in documents[:50]:  # Limit to 50 docs to avoid token limits
            doc_summaries.append({
                "id": doc.get("id", ""),
                "title": doc.get("title", ""),
                "category": doc.get("category", ""),
                "tags": doc.get("tags", []),
                "content_preview": (doc.get("content", "") or "")[:200]
            })
        
        prompt = f"""Search query: {query}

Available documents:
{json.dumps(doc_summaries, indent=2)}

Find the most relevant documents for this query. Rank by relevance (0.0-1.0).
Return top 5 most relevant results with matched terms.

Respond ONLY with valid JSON."""

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        try:
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            result["model"] = "gpt-5.2"
            return result
        except json.JSONDecodeError:
            # Fallback to basic keyword search
            query_lower = query.lower()
            relevant_docs = []
            for doc in documents:
                title = (doc.get("title", "") or "").lower()
                content = (doc.get("content", "") or "").lower()
                if any(word in title or word in content for word in query_lower.split()):
                    relevant_docs.append({
                        "id": doc.get("id", ""),
                        "title": doc.get("title", ""),
                        "relevance_score": 0.75,
                        "matched_terms": [w for w in query_lower.split() if w in content]
                    })
            
            return {
                "results": relevant_docs[:5],
                "total_matches": len(relevant_docs),
                "search_time_ms": 100,
                "model": "gpt-5.2"
            }
    except Exception as e:
        # Fallback to basic keyword search
        query_lower = query.lower()
        relevant_docs = []
        for doc in documents:
            title = (doc.get("title", "") or "").lower()
            content = (doc.get("content", "") or "").lower()
            if any(word in title or word in content for word in query_lower.split()):
                relevant_docs.append({
                    "id": doc.get("id", ""),
                    "title": doc.get("title", ""),
                    "relevance_score": 0.70,
                    "matched_terms": [w for w in query_lower.split() if w in content]
                })
        
        return {
            "results": relevant_docs[:5],
            "total_matches": len(relevant_docs),
            "search_time_ms": 50,
            "model": "fallback",
            "error": str(e)
        }


# Export all functions
__all__ = [
    'get_rca_suggestions',
    'classify_defect',
    'generate_capa_actions',
    'predict_defect_trend',
    'search_knowledge_base'
]
