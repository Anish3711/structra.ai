from backend.models.project import ProjectInput, MaterialItem
from typing import List
import math


MATERIAL_RATES = {
    "cement": {"unit": "bags", "rate_per_sqft": 0.4, "unit_rate": 380},
    "steel": {"unit": "kg", "rate_per_sqft": 4.0, "unit_rate": 65},
    "sand": {"unit": "cu.ft", "rate_per_sqft": 1.2, "unit_rate": 55},
    "bricks": {"unit": "nos", "rate_per_sqft": 8.0, "unit_rate": 9},
    "paint": {"unit": "litres", "rate_per_sqft": 0.18, "unit_rate": 350},
    "tiles": {"unit": "sq.ft", "rate_per_sqft": 0.8, "unit_rate": 55},
    "doors": {"unit": "nos", "rate_per_unit": None, "unit_rate": 8500},
    "windows": {"unit": "nos", "rate_per_unit": None, "unit_rate": 5500},
    "wiring": {"unit": "meters", "rate_per_sqft": 1.5, "unit_rate": 28},
    "plumbing": {"unit": "meters", "rate_per_sqft": 0.6, "unit_rate": 120},
    "water_tanks": {"unit": "nos", "rate_per_unit": None, "unit_rate": 12000},
}


def estimate_materials(input: ProjectInput) -> List[MaterialItem]:
    total_area = input.area_sqft * input.floors
    flat_config = input.flat_config
    total_flats = flat_config.flats_per_floor * input.floors

    materials: List[MaterialItem] = []

    for name, spec in MATERIAL_RATES.items():
        if name == "doors":
            qty = flat_config.doors * total_flats
        elif name == "windows":
            qty = flat_config.windows * total_flats
        elif name == "water_tanks":
            qty = input.utilities.water_tanks
        else:
            qty = math.ceil(total_area * spec["rate_per_sqft"])

        unit_rate = spec["unit_rate"]
        total_cost = round(qty * unit_rate, 2)

        materials.append(MaterialItem(
            name=name.replace("_", " ").title(),
            quantity=qty,
            unit=spec["unit"],
            unit_rate=unit_rate,
            total_cost=total_cost,
        ))

    return materials
