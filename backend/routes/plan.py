from fastapi import APIRouter, HTTPException
from backend.models.project import ProjectInput, PlanResponse
from backend.services.calculation_engine import estimate_workers, calculate_costs
from backend.services.material_engine import estimate_materials
from backend.services.schedule_engine import generate_schedule
from backend.services.blueprint_engine import generate_blueprint
from backend.services.ai_engine import generate_ai_analysis

router = APIRouter()


@router.post("/api/plan", response_model=PlanResponse)
async def create_plan(input: ProjectInput):
    try:
        workers = estimate_workers(input)
        costs = calculate_costs(input)
        materials = estimate_materials(input)
        timeline = generate_schedule(input)
        schedule = timeline
        blueprint = generate_blueprint(input)
        ai_analysis = generate_ai_analysis(input, costs, workers, materials)

        return PlanResponse(
            workers=workers,
            cost_breakdown=costs,
            materials=materials,
            timeline=timeline,
            schedule=schedule,
            blueprint=blueprint,
            ai_analysis=ai_analysis,
        )
    except Exception as e:
        print(f"Plan generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
