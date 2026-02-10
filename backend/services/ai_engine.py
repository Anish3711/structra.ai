import os
import json
from openai import OpenAI
from backend.models.project import (
    ProjectInput, AIAnalysis, CostBreakdown, WorkerEstimation, MaterialItem
)
from typing import List


def get_openai_client():
    base_url = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
    api_key = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
    if base_url and api_key:
        return OpenAI(api_key=api_key, base_url=base_url)
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key:
        return OpenAI(api_key=api_key)
    return None


def generate_ai_analysis(
    input: ProjectInput,
    costs: CostBreakdown,
    workers: WorkerEstimation,
    materials: List[MaterialItem],
) -> AIAnalysis:
    client = get_openai_client()
    if not client:
        return _fallback_analysis(input, costs, workers, materials)

    try:
        material_summary = ", ".join(
            f"{m.name}: {m.quantity} {m.unit} (₹{m.total_cost:,.0f})"
            for m in materials[:6]
        )

        prompt = f"""You are an expert construction planning AI assistant.
Analyze this construction project and return a JSON response.

PROJECT DETAILS:
- Building Type: {input.building_type}
- Total Area: {input.area_sqft} sqft x {input.floors} floors = {input.area_sqft * input.floors} sqft
- Timeline: {input.months_to_finish} months
- Location: {input.location}
- Soil Type: {input.site_analysis.soil_type}
- Flats per floor: {input.flat_config.flats_per_floor}
- Config: {input.flat_config.bedrooms} BHK, {input.flat_config.bathrooms} bath

COSTS:
- Material: ₹{costs.material_cost:,.0f}
- Labour: ₹{costs.labour_cost:,.0f}
- Overhead (10%): ₹{costs.overhead:,.0f}
- Contingency (8%): ₹{costs.contingency:,.0f}
- Total: ₹{costs.total_cost:,.0f}
- Cost/sqft: ₹{costs.cost_per_sqft:,.0f}

WORKERS: {workers.total_workers} total ({workers.masons} masons, {workers.helpers} helpers, {workers.carpenters} carpenters)

KEY MATERIALS: {material_summary}

Return ONLY valid JSON with these fields:
{{
  "project_summary": "2-3 paragraph executive summary",
  "risks": ["risk1", "risk2", "risk3", "risk4", "risk5"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "material_insights": "paragraph about material choices and optimization",
  "cost_optimization": "paragraph about cost saving strategies",
  "hindi_summary": "Brief project summary in Hindi (2-3 sentences)"
}}"""

        # the newest OpenAI model is "gpt-5" which was released August 7, 2025.
        # do not change this unless explicitly requested by the user
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = json.loads(response.choices[0].message.content or "{}")

        return AIAnalysis(
            project_summary=str(raw.get("project_summary", "")),
            risks=raw.get("risks", []),
            recommendations=raw.get("recommendations", []),
            material_insights=str(raw.get("material_insights", "")),
            cost_optimization=str(raw.get("cost_optimization", "")),
            hindi_summary=str(raw.get("hindi_summary", "")),
        )

    except Exception as e:
        print(f"AI Engine error: {e}")
        return _fallback_analysis(input, costs, workers, materials)


def _fallback_analysis(
    input: ProjectInput,
    costs: CostBreakdown,
    workers: WorkerEstimation,
    materials: List[MaterialItem],
) -> AIAnalysis:
    total_area = input.area_sqft * input.floors
    btype = input.building_type.value if hasattr(input.building_type, 'value') else str(input.building_type)
    return AIAnalysis(
        project_summary=(
            f"This is a {btype} project spanning {total_area:,.0f} sqft across "
            f"{input.floors} floors in {input.location}. Estimated total cost is ₹{costs.total_cost:,.0f} "
            f"(₹{costs.cost_per_sqft:,.0f}/sqft). The project requires {workers.total_workers} workers "
            f"and is planned to complete in {input.months_to_finish} months."
        ),
        risks=[
            f"Soil type ({input.site_analysis.soil_type.value if hasattr(input.site_analysis.soil_type, 'value') else input.site_analysis.soil_type}) may require additional foundation treatment",
            "Material price fluctuations can impact budget by 5-15%",
            "Monsoon season delays possible in Indian construction",
            "Labour availability during festival seasons",
            "Regulatory approval delays for multi-story structures",
        ],
        recommendations=[
            "Procure cement and steel in bulk for 10-15% savings",
            "Schedule foundation work during dry season",
            "Install rainwater harvesting for long-term savings",
            "Use fly-ash bricks for cost-effective and eco-friendly construction",
        ],
        material_insights=(
            f"Total material cost is ₹{costs.material_cost:,.0f} representing 60% of the project cost. "
            f"Key materials include cement, steel, and bricks. Consider TMT bars (Fe500D grade) for "
            f"earthquake resistance. Use M25 grade concrete for structural elements."
        ),
        cost_optimization=(
            f"Current cost is ₹{costs.cost_per_sqft:,.0f}/sqft. To optimize: "
            f"1) Negotiate bulk rates for cement and steel. "
            f"2) Use local materials where possible. "
            f"3) Optimize flat layout to reduce corridor area. "
            f"4) Consider prefab elements for repetitive floors."
        ),
        hindi_summary=(
            f"यह {input.location} में {btype} परियोजना है। "
            f"कुल क्षेत्रफल {total_area:,.0f} वर्ग फीट, कुल लागत ₹{costs.total_cost:,.0f}।"
        ),
    )
