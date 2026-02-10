import os
import json
import math
from typing import List, Optional
from openai import OpenAI
from backend.models.project import (
    ProjectInput, BlueprintData, BlueprintFloor, BlueprintRoom
)


def get_ai_client():
    base_url = os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL")
    api_key = os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY")
    if not base_url or not api_key:
        return None
    return OpenAI(api_key=api_key, base_url=base_url)


def generate_blueprint(input: ProjectInput) -> BlueprintData:
    client = get_ai_client()
    if client:
        try:
            result = _ai_generate_blueprint(client, input)
            if result and _validate_blueprint(result):
                return result
            print("AI blueprint validation failed, using procedural fallback")
        except Exception as e:
            print(f"AI blueprint generation error: {e}")

    return _procedural_fallback(input)


def _ai_generate_blueprint(client: OpenAI, input: ProjectInput) -> Optional[BlueprintData]:
    area = input.area_sqft
    floors_count = input.floors
    flat_cfg = input.flat_config
    building_type = input.building_type

    area_per_floor = area
    side = math.sqrt(area_per_floor)
    approx_width = round(side * 1.3, 1)
    approx_depth = round(area_per_floor / approx_width, 1)

    prompt = f"""You are an expert architect designing a realistic {building_type} building floor plan.

PROJECT SPECS:
- Building type: {building_type}
- Total area per floor: {area_per_floor} sqft
- Approximate building footprint: {approx_width}ft wide x {approx_depth}ft deep
- Number of floors: {floors_count}
- Flats per floor: {flat_cfg.flats_per_floor}
- Each flat: {flat_cfg.bedrooms} bedrooms, {flat_cfg.bathrooms} bathrooms, {flat_cfg.balconies} balconies
- Has lift/elevator: {input.amenities.lift}
- Has parking: {input.amenities.parking}

ARCHITECTURAL RULES (MUST FOLLOW):
1. The corridor MUST be along one edge (left side or entry side), NOT through the middle of the floor splitting rooms
2. The elevator/lift MUST be in a common area near the corridor entrance, NOT inside any flat
3. Staircase MUST be near the corridor/lift area, in common space
4. Room sizes MUST be proportional and realistic:
   - Living room: largest room (150-250 sqft)
   - Bedrooms: medium (120-180 sqft each)
   - Kitchen: medium-small (80-120 sqft)
   - Bathrooms: small (35-60 sqft each)
   - Balconies: small (30-60 sqft each)
   - Corridor: narrow passage (width 4-5ft)
5. Rooms in a flat should be ADJACENT and connected logically (not in a single row)
6. Flats should be side by side, separated by walls
7. Bathrooms should be NEAR bedrooms
8. Kitchen should be NEAR the dining/living area
9. All rooms must fit within the building footprint (0 to {approx_width}ft wide, 0 to {approx_depth}ft deep)
10. No room overlaps - rooms must tile properly with no gaps in the flat area

COORDINATE SYSTEM:
- x=0 is left edge, x={approx_width} is right edge
- y=0 is top edge, y={approx_depth} is bottom edge
- Each room has x, y (top-left corner), width, height

Return ONLY valid JSON with this exact structure:
{{
  "building_width": {approx_width},
  "building_depth": {approx_depth},
  "floors": [
    {{
      "floor": 0,
      "label": "Ground Floor",
      "rooms": [
        {{"id": "f0-corridor", "name": "Corridor", "x": 0, "y": 0, "width": 4, "height": {approx_depth}, "type": "corridor"}},
        {{"id": "f0-lift", "name": "Lift", "x": 0, "y": 0, "width": 5, "height": 5, "type": "elevator"}},
        {{"id": "f0-stairs", "name": "Staircase", "x": 0, "y": 5, "width": 5, "height": 6, "type": "staircase"}},
        {{"id": "f0-flat1-living", "name": "Living Room", "x": 4, "y": 0, "width": 16, "height": 12, "type": "living"}},
        ...more rooms for each flat
      ],
      "flats": [
        {{"flat_id": "f0-flat1", "label": "Flat 1", "rooms": ["f0-flat1-living", "f0-flat1-bed1", ...]}},
        {{"flat_id": "f0-flat2", "label": "Flat 2", "rooms": ["f0-flat2-living", ...]}}
      ]
    }}
  ]
}}

IMPORTANT: Generate all {floors_count} floors. Each floor should have the same layout structure but different floor numbers (f0, f1, f2...).
Make the layout look like a REAL architectural floor plan - varied room sizes, logical adjacency, L-shaped arrangements where appropriate.
Corridor and common areas (lift, staircase) are NOT part of any flat.
Room IDs must be unique across all floors."""

    # the newest OpenAI model is "gpt-5" which was released August 7, 2025.
    # do not change this unless explicitly requested by the user
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    raw = json.loads(response.choices[0].message.content or "{}")

    if "floors" not in raw:
        return None

    building_w = raw.get("building_width", approx_width)
    building_d = raw.get("building_depth", approx_depth)

    floors: List[BlueprintFloor] = []
    for floor_data in raw["floors"]:
        rooms = []
        for room_data in floor_data.get("rooms", []):
            rooms.append(BlueprintRoom(
                id=str(room_data["id"]),
                name=str(room_data["name"]),
                x=float(room_data["x"]),
                y=float(room_data["y"]),
                width=max(2, float(room_data["width"])),
                height=max(2, float(room_data["height"])),
                type=str(room_data.get("type", "other")),
            ))

        flats = floor_data.get("flats", [])

        floors.append(BlueprintFloor(
            floor=int(floor_data["floor"]),
            label=str(floor_data["label"]),
            rooms=rooms,
            flats=flats,
        ))

    corridor_h = 4
    corridors = []
    for floor in floors:
        corr = next((r for r in floor.rooms if r.type == "corridor"), None)
        if corr:
            corridors.append({"floor": floor.floor, "y": corr.y, "height": corr.height})
            corridor_h = corr.height

    terrace = {
        "area_sqft": round(building_w * building_d, 1),
        "has_railing": True,
        "water_proofing": True,
    }

    roof = {
        "type": "RCC flat roof" if floors_count > 1 else "Sloped roof",
        "area_sqft": round(building_w * building_d, 1),
    }

    water_tanks_list = []
    for i in range(input.utilities.water_tanks):
        water_tanks_list.append({
            "id": f"tank-{i+1}",
            "capacity_litres": 1000 + (int(input.area_sqft) // 500) * 500,
            "location": "terrace" if i % 2 == 0 else "underground",
        })

    electrical_lines = [
        {"id": "main-supply", "type": "3-phase", "from": "meter", "to": "DB"},
        {"id": "lighting", "type": "single-phase", "from": "DB", "to": "all-rooms"},
        {"id": "power", "type": "3-phase", "from": "DB", "to": "heavy-appliances"},
    ]

    water_lines = [
        {"id": "main-inlet", "from": input.utilities.water_supply, "to": "overhead-tank"},
        {"id": "distribution", "from": "overhead-tank", "to": "all-flats"},
        {"id": "drainage", "from": "all-flats", "to": "septic/sewer"},
    ]

    total_rooms = sum(len(fl.rooms) for fl in floors)
    btype = building_type.value if hasattr(building_type, 'value') else str(building_type)
    overview = (
        f"AI-designed {floors_count}-floor {btype} building, {round(building_w)}ft x {round(building_d)}ft. "
        f"{flat_cfg.flats_per_floor} flats per floor, {total_rooms} total rooms across all floors. "
        f"Each flat: {flat_cfg.bedrooms} BHK with {flat_cfg.bathrooms} bathrooms."
    )

    component_breakdown = [
        {"component": "Floors", "count": floors_count},
        {"component": "Flats per floor", "count": flat_cfg.flats_per_floor},
        {"component": "Total flats", "count": flat_cfg.flats_per_floor * floors_count},
        {"component": "Bedrooms per flat", "count": flat_cfg.bedrooms},
        {"component": "Bathrooms per flat", "count": flat_cfg.bathrooms},
        {"component": "Balconies per flat", "count": flat_cfg.balconies},
        {"component": "Total rooms", "count": total_rooms},
        {"component": "Water tanks", "count": input.utilities.water_tanks},
    ]

    return BlueprintData(
        floors=floors,
        corridors=corridors,
        terrace=terrace,
        roof=roof,
        water_tanks=water_tanks_list,
        electrical_lines=electrical_lines,
        water_lines=water_lines,
        overview=overview,
        component_breakdown=component_breakdown,
    )


def _validate_blueprint(bp: BlueprintData) -> bool:
    if not bp.floors:
        return False
    for floor in bp.floors:
        if not floor.rooms or len(floor.rooms) < 3:
            return False
        for room in floor.rooms:
            if room.width <= 0 or room.height <= 0:
                return False
            if room.x < -1 or room.y < -1:
                return False
    return True


def _procedural_fallback(input: ProjectInput) -> BlueprintData:
    area = input.area_sqft
    floors_count = input.floors
    flat_cfg = input.flat_config
    building_type = input.building_type

    side = math.sqrt(area)
    width = round(side * 1.3, 1)
    depth = round(area / width, 1)

    floors: List[BlueprintFloor] = []

    for f in range(floors_count):
        floor_label = "Ground Floor" if f == 0 else f"Floor {f}"
        rooms: List[BlueprintRoom] = []
        flats_data = []

        corridor_w = 4.5
        rooms.append(BlueprintRoom(
            id=f"f{f}-corridor",
            name="Corridor",
            x=0, y=0,
            width=corridor_w, height=depth,
            type="corridor",
        ))

        if input.amenities.lift:
            lift_size = 5
            rooms.append(BlueprintRoom(
                id=f"f{f}-lift",
                name="Lift",
                x=0, y=0,
                width=lift_size, height=lift_size,
                type="elevator",
            ))
            rooms.append(BlueprintRoom(
                id=f"f{f}-stairs",
                name="Staircase",
                x=0, y=lift_size,
                width=lift_size, height=6,
                type="staircase",
            ))
        else:
            rooms.append(BlueprintRoom(
                id=f"f{f}-stairs",
                name="Staircase",
                x=0, y=0,
                width=corridor_w, height=6,
                type="staircase",
            ))

        flats_per_floor = flat_cfg.flats_per_floor
        usable_width = width - corridor_w
        flat_depth_each = depth / flats_per_floor

        for fi in range(flats_per_floor):
            flat_y = round(fi * flat_depth_each, 1)
            flat_rooms = _generate_realistic_flat(
                f, fi, corridor_w, flat_y,
                usable_width, flat_depth_each, flat_cfg
            )
            rooms.extend(flat_rooms)
            flats_data.append({
                "flat_id": f"f{f}-flat{fi+1}",
                "label": f"Flat {fi+1}",
                "rooms": [r.id for r in flat_rooms],
            })

        floors.append(BlueprintFloor(
            floor=f,
            label=floor_label,
            rooms=rooms,
            flats=flats_data,
        ))

    corridor_h = 4.5
    terrace = {
        "area_sqft": round(width * depth, 1),
        "has_railing": True,
        "water_proofing": True,
    }
    roof = {
        "type": "RCC flat roof" if floors_count > 1 else "Sloped roof",
        "area_sqft": round(width * depth, 1),
    }

    water_tanks_list = []
    for i in range(input.utilities.water_tanks):
        water_tanks_list.append({
            "id": f"tank-{i+1}",
            "capacity_litres": 1000 + (int(input.area_sqft) // 500) * 500,
            "location": "terrace" if i % 2 == 0 else "underground",
        })

    electrical_lines = [
        {"id": "main-supply", "type": "3-phase", "from": "meter", "to": "DB"},
        {"id": "lighting", "type": "single-phase", "from": "DB", "to": "all-rooms"},
        {"id": "power", "type": "3-phase", "from": "DB", "to": "heavy-appliances"},
    ]
    water_lines = [
        {"id": "main-inlet", "from": input.utilities.water_supply, "to": "overhead-tank"},
        {"id": "distribution", "from": "overhead-tank", "to": "all-flats"},
        {"id": "drainage", "from": "all-flats", "to": "septic/sewer"},
    ]

    total_rooms = sum(len(fl.rooms) for fl in floors)
    btype = building_type.value if hasattr(building_type, 'value') else str(building_type)
    overview = (
        f"{floors_count}-floor {btype} building, {round(width)}ft x {round(depth)}ft. "
        f"{flat_cfg.flats_per_floor} flats per floor, {total_rooms} total rooms across all floors."
    )
    component_breakdown = [
        {"component": "Floors", "count": floors_count},
        {"component": "Flats per floor", "count": flat_cfg.flats_per_floor},
        {"component": "Total flats", "count": flat_cfg.flats_per_floor * floors_count},
        {"component": "Bedrooms per flat", "count": flat_cfg.bedrooms},
        {"component": "Bathrooms per flat", "count": flat_cfg.bathrooms},
        {"component": "Total rooms", "count": total_rooms},
        {"component": "Water tanks", "count": input.utilities.water_tanks},
    ]

    return BlueprintData(
        floors=floors,
        corridors=[{"floor": f, "y": 0, "height": corridor_h} for f in range(floors_count)],
        terrace=terrace,
        roof=roof,
        water_tanks=water_tanks_list,
        electrical_lines=electrical_lines,
        water_lines=water_lines,
        overview=overview,
        component_breakdown=component_breakdown,
    )


def _generate_realistic_flat(
    floor_idx, flat_idx, start_x, start_y,
    flat_width, flat_depth, flat_cfg
) -> List[BlueprintRoom]:
    rooms = []
    prefix = f"f{floor_idx}-flat{flat_idx+1}"
    x0 = start_x
    y0 = start_y

    living_w = round(flat_width * 0.5, 1)
    living_h = round(flat_depth * 0.45, 1)
    rooms.append(BlueprintRoom(
        id=f"{prefix}-living", name="Living Room",
        x=x0, y=y0, width=living_w, height=living_h, type="living"
    ))

    kitchen_w = round(flat_width - living_w, 1)
    kitchen_h = round(flat_depth * 0.3, 1)
    rooms.append(BlueprintRoom(
        id=f"{prefix}-kitchen", name="Kitchen",
        x=round(x0 + living_w, 1), y=y0, width=kitchen_w, height=kitchen_h, type="kitchen"
    ))

    dining_w = kitchen_w
    dining_h = round(flat_depth * 0.15, 1)
    if dining_h > 3:
        rooms.append(BlueprintRoom(
            id=f"{prefix}-dining", name="Dining",
            x=round(x0 + living_w, 1), y=round(y0 + kitchen_h, 1),
            width=dining_w, height=dining_h, type="dining"
        ))

    bed_y = round(y0 + living_h, 1)
    bed_h = round(flat_depth - living_h, 1)
    num_beds = flat_cfg.bedrooms
    num_baths = flat_cfg.bathrooms
    num_balconies = flat_cfg.balconies

    bed_w = round(flat_width * 0.35, 1)
    bath_w = round(flat_width * 0.15, 1)
    balcony_w = round(flat_width * 0.12, 1)

    total_needed = num_beds * bed_w + num_baths * bath_w + num_balconies * balcony_w
    if total_needed > flat_width and total_needed > 0:
        scale = flat_width / total_needed
        bed_w = round(bed_w * scale, 1)
        bath_w = round(bath_w * scale, 1)
        balcony_w = round(balcony_w * scale, 1)

    cx = x0
    for b in range(num_beds):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-bed{b+1}", name=f"Bedroom {b+1}",
            x=round(cx, 1), y=bed_y, width=bed_w, height=bed_h, type="bedroom"
        ))

        if b < num_baths:
            rooms.append(BlueprintRoom(
                id=f"{prefix}-bath{b+1}", name=f"Bath {b+1}",
                x=round(cx + bed_w, 1), y=bed_y,
                width=bath_w, height=round(bed_h * 0.6, 1), type="bathroom"
            ))
            if b < num_balconies:
                rooms.append(BlueprintRoom(
                    id=f"{prefix}-balcony{b+1}", name=f"Balcony {b+1}",
                    x=round(cx + bed_w, 1), y=round(bed_y + bed_h * 0.6, 1),
                    width=bath_w, height=round(bed_h * 0.4, 1), type="balcony"
                ))
            cx += bed_w + bath_w
        else:
            cx += bed_w

    remaining_baths = max(0, num_baths - num_beds)
    for b in range(remaining_baths):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-bath{num_beds + b + 1}", name=f"Bath {num_beds + b + 1}",
            x=round(cx, 1), y=bed_y,
            width=bath_w, height=round(bed_h * 0.5, 1), type="bathroom"
        ))
        cx += bath_w

    remaining_balconies = max(0, num_balconies - num_beds)
    for b in range(remaining_balconies):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-balcony{num_beds + b + 1}", name=f"Balcony",
            x=round(cx, 1), y=bed_y,
            width=balcony_w, height=round(bed_h * 0.4, 1), type="balcony"
        ))
        cx += balcony_w

    return rooms
