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
    approx_width = round(side * 1.4, 1)
    approx_depth = round(area_per_floor / approx_width, 1)

    corridor_width = 5
    core_width = 8
    core_depth = 10
    flats_per_side = max(1, flat_cfg.flats_per_floor // 2)
    remaining = flat_cfg.flats_per_floor - flats_per_side * 2
    if remaining > 0:
        flats_per_side_left = flats_per_side + remaining
        flats_per_side_right = flats_per_side
    else:
        flats_per_side_left = flats_per_side
        flats_per_side_right = flats_per_side

    prompt = f"""You are an expert architect designing a realistic {building_type.value} building floor plan.

PROJECT SPECS:
- Building type: {building_type.value}
- Total area per floor: {area_per_floor} sqft
- Building footprint: {approx_width}ft wide x {approx_depth}ft deep
- Number of floors: {floors_count}
- Flats per floor: {flat_cfg.flats_per_floor}
- Each flat: {flat_cfg.bedrooms} bedrooms, {flat_cfg.bathrooms} bathrooms, {flat_cfg.balconies} balconies
- Has lift: {input.amenities.lift}
- Has parking: {input.amenities.parking}

MANDATORY ARCHITECTURAL RULES:
1. CORRIDOR MUST be in the CENTER of the building running horizontally (along x-axis).
   - Corridor: x=0, y={round(approx_depth/2 - corridor_width/2, 1)}, width={approx_width}, height={corridor_width}
   - This splits the building into TOP half and BOTTOM half.

2. FLATS on BOTH SIDES of corridor:
   - {flats_per_side_left} flats ABOVE the corridor (y from 0 to {round(approx_depth/2 - corridor_width/2, 1)})
   - {flats_per_side_right} flats BELOW the corridor (y from {round(approx_depth/2 + corridor_width/2, 1)} to {approx_depth})

3. STAIRS + LIFT CORE near center of building:
   - Staircase and elevator placed at center-left of corridor area
   - Core width ~{core_width}ft, depth ~{core_depth}ft
   - Staircase and elevator are NOT inside any flat

4. PLUMBING SHAFT: One vertical shaft per side, bathrooms MUST be adjacent to shaft
5. DOORS face the corridor (on the wall touching corridor)
6. WINDOWS only on outer walls (top edge y=0, bottom edge y={approx_depth}, left x=0, right x={approx_width})
7. Room sizes must be realistic:
   - Living: 150-250 sqft
   - Bedroom: 120-180 sqft
   - Kitchen: 80-130 sqft
   - Bathroom: 35-60 sqft
   - Balcony: 30-60 sqft
8. Rooms MUST tile properly with NO gaps and NO overlaps within each flat area
9. Bathrooms clustered together near plumbing shaft

COORDINATE SYSTEM:
- x=0 left edge, x={approx_width} right edge
- y=0 top edge, y={approx_depth} bottom edge
- Each room: x, y (top-left), width, height

Return ONLY valid JSON:
{{
  "building_width": {approx_width},
  "building_depth": {approx_depth},
  "floors": [
    {{
      "floor": 0,
      "label": "Ground Floor",
      "rooms": [
        {{"id": "f0-corridor", "name": "Corridor", "x": 0, "y": {round(approx_depth/2 - corridor_width/2, 1)}, "width": {approx_width}, "height": {corridor_width}, "type": "corridor"}},
        {{"id": "f0-lift", "name": "Lift", "x": ..., "y": ..., "width": 5, "height": 5, "type": "elevator"}},
        {{"id": "f0-stairs", "name": "Staircase", "x": ..., "y": ..., "width": 6, "height": 8, "type": "staircase"}},
        ...rooms for flats above corridor...
        ...rooms for flats below corridor...
      ],
      "flats": [
        {{"flat_id": "f0-flat1", "label": "Flat 1", "rooms": ["f0-flat1-living", ...]}},
        ...
      ]
    }}
  ]
}}

Generate all {floors_count} floors with same layout structure. Room IDs must be unique across floors (f0, f1, f2...).
Corridor and core areas (lift, staircase) are NOT part of any flat."""

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

    corridors = []
    for floor in floors:
        corr = next((r for r in floor.rooms if r.type == "corridor"), None)
        if corr:
            corridors.append({"floor": floor.floor, "y": corr.y, "height": corr.height})

    return _build_blueprint_data(input, floors, corridors, building_w, building_d, "AI-designed")


def _validate_blueprint(bp: BlueprintData) -> bool:
    if not bp.floors:
        return False
    for floor in bp.floors:
        if not floor.rooms or len(floor.rooms) < 3:
            return False
        has_corridor = any(r.type == "corridor" for r in floor.rooms)
        if not has_corridor:
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

    side = math.sqrt(area)
    width = round(side * 1.4, 1)
    depth = round(area / width, 1)

    width = max(width, 40)
    depth = max(depth, 30)

    corridor_h = 5.0
    corridor_y = round(depth / 2 - corridor_h / 2, 1)

    core_w = 8.0
    core_d = corridor_h
    core_x = round(width / 2 - core_w / 2, 1)

    top_depth = corridor_y
    bottom_depth = round(depth - corridor_y - corridor_h, 1)

    flats_per_floor = flat_cfg.flats_per_floor
    flats_top = max(1, flats_per_floor // 2)
    flats_bottom = flats_per_floor - flats_top

    if flats_bottom == 0:
        flats_bottom = 1
        flats_top = max(1, flats_per_floor - 1)

    floors: List[BlueprintFloor] = []

    for f in range(floors_count):
        floor_label = "Ground Floor" if f == 0 else f"Floor {f}"
        rooms: List[BlueprintRoom] = []
        flats_data = []

        rooms.append(BlueprintRoom(
            id=f"f{f}-corridor",
            name="Corridor",
            x=0, y=corridor_y,
            width=width, height=corridor_h,
            type="corridor",
        ))

        if input.amenities.lift:
            lift_w = 4.0
            lift_h = 4.0
            rooms.append(BlueprintRoom(
                id=f"f{f}-lift",
                name="Lift",
                x=core_x, y=corridor_y + 0.5,
                width=lift_w, height=lift_h,
                type="elevator",
            ))
            rooms.append(BlueprintRoom(
                id=f"f{f}-stairs",
                name="Staircase",
                x=round(core_x + lift_w, 1), y=corridor_y + 0.5,
                width=round(core_w - lift_w, 1), height=corridor_h - 1,
                type="staircase",
            ))
        else:
            rooms.append(BlueprintRoom(
                id=f"f{f}-stairs",
                name="Staircase",
                x=core_x, y=corridor_y + 0.5,
                width=core_w, height=corridor_h - 1,
                type="staircase",
            ))

        shaft_top_x = round(width * 0.15, 1)
        shaft_bottom_x = round(width * 0.15, 1)

        top_flat_width = width / flats_top
        for fi in range(flats_top):
            flat_x = round(fi * top_flat_width, 1)
            fw = round(top_flat_width, 1)
            if fi == flats_top - 1:
                fw = round(width - flat_x, 1)

            shaft_x_in_flat = shaft_top_x - flat_x if fi == 0 else None

            flat_rooms = _generate_center_corridor_flat(
                f, fi, flat_x, 0, fw, top_depth, flat_cfg,
                side="top", shaft_local_x=shaft_x_in_flat
            )
            rooms.extend(flat_rooms)
            flats_data.append({
                "flat_id": f"f{f}-flat{fi+1}",
                "label": f"Flat {fi+1}",
                "rooms": [r.id for r in flat_rooms],
            })

        for fi in range(flats_bottom):
            flat_idx = flats_top + fi
            bottom_y = round(corridor_y + corridor_h, 1)
            flat_x = round(fi * (width / flats_bottom), 1)
            fw = round(width / flats_bottom, 1)
            if fi == flats_bottom - 1:
                fw = round(width - flat_x, 1)

            shaft_x_in_flat = shaft_bottom_x - flat_x if fi == 0 else None

            flat_rooms = _generate_center_corridor_flat(
                f, flat_idx, flat_x, bottom_y, fw, bottom_depth, flat_cfg,
                side="bottom", shaft_local_x=shaft_x_in_flat
            )
            rooms.extend(flat_rooms)
            flats_data.append({
                "flat_id": f"f{f}-flat{flat_idx+1}",
                "label": f"Flat {flat_idx+1}",
                "rooms": [r.id for r in flat_rooms],
            })

        floors.append(BlueprintFloor(
            floor=f,
            label=floor_label,
            rooms=rooms,
            flats=flats_data,
        ))

    corridors = [{"floor": f, "y": corridor_y, "height": corridor_h} for f in range(floors_count)]
    return _build_blueprint_data(input, floors, corridors, width, depth, "Procedural")


def _generate_center_corridor_flat(
    floor_idx, flat_idx, start_x, start_y,
    flat_width, flat_depth, flat_cfg,
    side="top", shaft_local_x=None
) -> List[BlueprintRoom]:
    rooms = []
    prefix = f"f{floor_idx}-flat{flat_idx+1}"
    x0 = start_x
    y0 = start_y

    num_beds = flat_cfg.bedrooms
    num_baths = flat_cfg.bathrooms
    num_balconies = flat_cfg.balconies

    bath_w = round(min(flat_width * 0.18, 7), 1)
    bath_h = round(min(flat_depth * 0.35, 6), 1)
    balcony_h = round(min(flat_depth * 0.15, 4), 1)

    plumbing_zone_x = x0
    if shaft_local_x is not None:
        plumbing_zone_x = round(start_x + shaft_local_x, 1)
    else:
        plumbing_zone_x = round(x0 + flat_width * 0.12, 1)

    if side == "top":
        bath_y = round(y0 + flat_depth - bath_h, 1)
    else:
        bath_y = y0

    bx = plumbing_zone_x
    for b in range(num_baths):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-bath{b+1}", name=f"Bath {b+1}",
            x=round(bx, 1), y=bath_y,
            width=bath_w, height=bath_h, type="bathroom"
        ))
        bx = round(bx + bath_w, 1)

    total_bath_w = num_baths * bath_w
    remaining_w = flat_width - total_bath_w

    living_w = round(remaining_w * 0.55, 1)
    kitchen_w = round(remaining_w * 0.45, 1)

    if kitchen_w < 6:
        kitchen_w = round(remaining_w * 0.5, 1)
        living_w = round(remaining_w - kitchen_w, 1)

    if side == "top":
        living_h = round(flat_depth * 0.5, 1)
        kitchen_h = round(flat_depth * 0.35, 1)

        rooms.append(BlueprintRoom(
            id=f"{prefix}-living", name="Living Room",
            x=round(x0 + total_bath_w, 1) if plumbing_zone_x == x0 else x0,
            y=y0,
            width=living_w, height=living_h, type="living"
        ))

        kitchen_x = round(x0 + total_bath_w + living_w, 1) if plumbing_zone_x == x0 else round(x0 + living_w, 1)
        rooms.append(BlueprintRoom(
            id=f"{prefix}-kitchen", name="Kitchen",
            x=kitchen_x, y=y0,
            width=kitchen_w, height=kitchen_h, type="kitchen"
        ))

        bed_y = round(y0 + living_h, 1)
        bed_available_h = round(flat_depth - living_h, 1)
        bed_available_w = round(flat_width - total_bath_w, 1)

        bed_area_x = round(x0 + total_bath_w, 1) if plumbing_zone_x == x0 else x0

        if num_beds > 0:
            bed_w = round(bed_available_w / num_beds, 1)
            for b in range(num_beds):
                bx_pos = round(bed_area_x + b * bed_w, 1)
                actual_w = bed_w
                if b == num_beds - 1:
                    actual_w = round(x0 + flat_width - bx_pos, 1)
                rooms.append(BlueprintRoom(
                    id=f"{prefix}-bed{b+1}", name=f"Bedroom {b+1}",
                    x=bx_pos, y=bed_y,
                    width=actual_w, height=bed_available_h, type="bedroom"
                ))
    else:
        living_h = round(flat_depth * 0.5, 1)
        kitchen_h = round(flat_depth * 0.35, 1)

        bed_available_h = round(flat_depth - bath_h, 1)
        bed_area_y = round(y0 + bath_h, 1)

        living_y = bed_area_y
        kitchen_y = bed_area_y

        rooms.append(BlueprintRoom(
            id=f"{prefix}-living", name="Living Room",
            x=round(x0 + total_bath_w, 1) if plumbing_zone_x == x0 else x0,
            y=round(y0 + flat_depth - living_h, 1),
            width=living_w, height=living_h, type="living"
        ))

        kitchen_x = round(x0 + total_bath_w + living_w, 1) if plumbing_zone_x == x0 else round(x0 + living_w, 1)
        rooms.append(BlueprintRoom(
            id=f"{prefix}-kitchen", name="Kitchen",
            x=kitchen_x,
            y=round(y0 + flat_depth - kitchen_h, 1),
            width=kitchen_w, height=kitchen_h, type="kitchen"
        ))

        bed_available_w = round(flat_width - total_bath_w, 1)
        bed_area_x = round(x0 + total_bath_w, 1) if plumbing_zone_x == x0 else x0
        bed_h = round(flat_depth - max(living_h, kitchen_h), 1)

        if num_beds > 0 and bed_h > 3:
            bed_w = round(bed_available_w / num_beds, 1)
            for b in range(num_beds):
                bx_pos = round(bed_area_x + b * bed_w, 1)
                actual_w = bed_w
                if b == num_beds - 1:
                    actual_w = round(x0 + flat_width - bx_pos, 1)
                rooms.append(BlueprintRoom(
                    id=f"{prefix}-bed{b+1}", name=f"Bedroom {b+1}",
                    x=bx_pos, y=bed_area_y,
                    width=actual_w, height=bed_h, type="bedroom"
                ))

    if num_balconies > 0:
        balcony_w = round(flat_width / num_balconies, 1)
        for b in range(num_balconies):
            bx_pos = round(x0 + b * balcony_w, 1)
            if side == "top":
                by_pos = y0
                rooms.append(BlueprintRoom(
                    id=f"{prefix}-balcony{b+1}", name=f"Balcony {b+1}",
                    x=bx_pos, y=round(by_pos - balcony_h, 1) if by_pos > balcony_h else by_pos,
                    width=balcony_w, height=balcony_h, type="balcony"
                ))
            else:
                rooms.append(BlueprintRoom(
                    id=f"{prefix}-balcony{b+1}", name=f"Balcony {b+1}",
                    x=bx_pos, y=round(y0 + flat_depth, 1),
                    width=balcony_w, height=balcony_h, type="balcony"
                ))

    return rooms


def _build_blueprint_data(input, floors, corridors, width, depth, design_label):
    floors_count = input.floors
    flat_cfg = input.flat_config
    building_type = input.building_type

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
        f"{design_label} {floors_count}-floor {btype} building, {round(width)}ft x {round(depth)}ft. "
        f"Center corridor with flats on both sides. "
        f"{flat_cfg.flats_per_floor} flats per floor, {total_rooms} total rooms. "
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
