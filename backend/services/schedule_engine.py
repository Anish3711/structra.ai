from backend.models.project import ProjectInput, TimelinePhase
from typing import List
import math


PHASES = [
    {"phase": "Site Preparation", "pct": 0.08, "desc": "Site clearing, leveling, temporary structures, boundary marking"},
    {"phase": "Foundation", "pct": 0.15, "desc": "Excavation, PCC, RCC footing, anti-termite treatment, waterproofing"},
    {"phase": "Structure / RCC", "pct": 0.22, "desc": "Column casting, beam work, slab casting for each floor"},
    {"phase": "Slab Work", "pct": 0.10, "desc": "Final slab curing, shuttering removal, surface leveling"},
    {"phase": "Plumbing & Drainage", "pct": 0.08, "desc": "Internal plumbing, drainage lines, water tank connections"},
    {"phase": "Electrical Work", "pct": 0.08, "desc": "Conduit laying, wiring, DB boxes, switch boards"},
    {"phase": "Brickwork & Plastering", "pct": 0.12, "desc": "Brick walls, internal/external plastering, window frames"},
    {"phase": "Finishing", "pct": 0.12, "desc": "Flooring, tiling, painting, door/window fitting, fixtures"},
    {"phase": "Handover & Inspection", "pct": 0.05, "desc": "Final inspection, snag fixing, documentation, handover"},
]


def generate_schedule(input: ProjectInput) -> List[TimelinePhase]:
    total_weeks = input.months_to_finish * 4
    if total_weeks < 8:
        total_weeks = 8

    schedule: List[TimelinePhase] = []
    current_week = 1

    for p in PHASES:
        duration = max(1, math.ceil(total_weeks * p["pct"]))
        end_week = current_week + duration - 1

        schedule.append(TimelinePhase(
            phase=p["phase"],
            start_week=current_week,
            end_week=end_week,
            duration_weeks=duration,
            description=p["desc"],
        ))
        current_week = end_week + 1

    return schedule
