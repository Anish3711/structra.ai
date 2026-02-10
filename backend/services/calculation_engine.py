from backend.models.project import (
    ProjectInput, WorkerEstimation, CostBreakdown, SoilType
)
import math


def estimate_workers(input: ProjectInput) -> WorkerEstimation:
    total_area = input.area_sqft * input.floors
    months = input.months_to_finish

    base_masons = max(2, math.ceil(total_area / 400))
    base_helpers = max(3, math.ceil(total_area / 200))
    base_carpenters = max(1, math.ceil(total_area / 800))
    base_steel = max(1, math.ceil(total_area / 1000))
    base_plumbers = max(1, math.ceil(total_area / 1500))
    base_electricians = max(1, math.ceil(total_area / 1200))
    base_painters = max(1, math.ceil(total_area / 2000))

    speed_factor = max(0.8, 18 / max(months, 1))
    if speed_factor > 1.5:
        speed_factor = min(speed_factor, 2.5)

    masons = math.ceil(base_masons * speed_factor)
    helpers = math.ceil(base_helpers * speed_factor)
    carpenters = math.ceil(base_carpenters * speed_factor)
    steel_workers = math.ceil(base_steel * speed_factor)
    plumbers = math.ceil(base_plumbers * speed_factor)
    electricians = math.ceil(base_electricians * speed_factor)
    painters = math.ceil(base_painters * speed_factor)

    total = masons + helpers + carpenters + steel_workers + plumbers + electricians + painters

    return WorkerEstimation(
        masons=masons,
        helpers=helpers,
        carpenters=carpenters,
        steel_workers=steel_workers,
        plumbers=plumbers,
        electricians=electricians,
        painters=painters,
        total_workers=total,
    )


def calculate_costs(input: ProjectInput) -> CostBreakdown:
    total_area = input.area_sqft * input.floors

    base_rate = 1800.0

    soil_multiplier = {
        SoilType.CLAY: 1.08,
        SoilType.SANDY: 1.05,
        SoilType.ROCKY: 1.15,
        SoilType.LOAMY: 1.0,
        SoilType.BLACK_COTTON: 1.12,
        SoilType.LATERITE: 1.03,
    }.get(input.site_analysis.soil_type, 1.0)

    floor_multiplier = 1.0 + (input.floors - 1) * 0.05

    amenity_add = 0.0
    if input.building_type in ("residential", "apartment"):
        if input.amenities.pool:
            amenity_add += total_area * 80
        if input.amenities.gym:
            amenity_add += total_area * 30
        if input.amenities.lift:
            amenity_add += input.floors * 250000
        if input.amenities.parking:
            amenity_add += total_area * 25

    raw_cost = total_area * base_rate * soil_multiplier * floor_multiplier + amenity_add

    material_cost = round(raw_cost * 0.60, 2)
    labour_cost = round(raw_cost * 0.22, 2)
    overhead = round(raw_cost * 0.10, 2)
    contingency = round(raw_cost * 0.08, 2)
    total_cost = round(material_cost + labour_cost + overhead + contingency, 2)
    cost_per_sqft = round(total_cost / total_area, 2) if total_area > 0 else 0

    return CostBreakdown(
        material_cost=material_cost,
        labour_cost=labour_cost,
        overhead=overhead,
        contingency=contingency,
        total_cost=total_cost,
        cost_per_sqft=cost_per_sqft,
    )
