from backend.models.project import (
    ProjectInput, BlueprintData, BlueprintFloor, BlueprintRoom
)
import math
from typing import List


def generate_blueprint(input: ProjectInput) -> BlueprintData:
    area = input.area_sqft
    floors_count = input.floors
    flat_cfg = input.flat_config
    building_type = input.building_type

    side = math.sqrt(area)
    width = round(side * 1.2, 1)
    depth = round(area / width, 1)

    floors: List[BlueprintFloor] = []

    for f in range(floors_count):
        floor_label = "Ground Floor" if f == 0 else f"Floor {f}"
        rooms: List[BlueprintRoom] = []
        flats_data = []

        corridor_h = max(3, round(depth * 0.08, 1))
        corridor_y = round((depth - corridor_h) / 2, 1)

        rooms.append(BlueprintRoom(
            id=f"f{f}-corridor",
            name="Corridor",
            x=0, y=corridor_y,
            width=width, height=corridor_h,
            type="corridor",
        ))

        flats_per_floor = flat_cfg.flats_per_floor
        flat_width = round(width / flats_per_floor, 1)

        for fi in range(flats_per_floor):
            flat_x = round(fi * flat_width, 1)
            flat_rooms = _generate_flat_rooms(
                f, fi, flat_x, corridor_y, corridor_h,
                flat_width, depth, flat_cfg, building_type
            )
            rooms.extend(flat_rooms)
            flats_data.append({
                "flat_id": f"f{f}-flat{fi+1}",
                "label": f"Flat {fi+1}",
                "rooms": [r.id for r in flat_rooms],
            })

        if f == 0 and building_type in ("residential", "apartment"):
            if input.amenities.lift:
                lift_size = min(5, flat_width * 0.15)
                rooms.append(BlueprintRoom(
                    id=f"f{f}-lift",
                    name="Lift",
                    x=round(width - lift_size - 1, 1),
                    y=round(corridor_y - lift_size, 1),
                    width=round(lift_size, 1),
                    height=round(lift_size, 1),
                    type="elevator",
                ))

        floors.append(BlueprintFloor(
            floor=f,
            label=floor_label,
            rooms=rooms,
            flats=flats_data,
        ))

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
            "capacity_litres": 1000 + (input.area_sqft // 500) * 500,
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
    overview = (
        f"{floors_count}-floor {building_type} building, {round(width)}ft x {round(depth)}ft. "
        f"{flat_cfg.flats_per_floor} flats per floor, {total_rooms} total rooms across all floors. "
        f"Each flat: {flat_cfg.bedrooms} BHK with {flat_cfg.bathrooms} bathrooms, "
        f"{flat_cfg.balconies} balconies, {flat_cfg.doors} doors, {flat_cfg.windows} windows."
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
        corridors=[{"floor": f, "y": round((depth - corridor_h) / 2, 1), "height": corridor_h} for f in range(floors_count)],
        terrace=terrace,
        roof=roof,
        water_tanks=water_tanks_list,
        electrical_lines=electrical_lines,
        water_lines=water_lines,
        overview=overview,
        component_breakdown=component_breakdown,
    )


def _generate_flat_rooms(
    floor_idx, flat_idx, flat_x, corridor_y, corridor_h,
    flat_width, total_depth, flat_cfg, building_type
) -> List[BlueprintRoom]:
    rooms = []
    prefix = f"f{floor_idx}-flat{flat_idx+1}"

    top_height = corridor_y
    bottom_y = corridor_y + corridor_h
    bottom_height = total_depth - bottom_y

    num_bedrooms = flat_cfg.bedrooms
    num_bathrooms = flat_cfg.bathrooms
    num_balconies = flat_cfg.balconies

    living_w = round(flat_width * 0.45, 1)
    kitchen_w = round(flat_width * 0.25, 1)
    remaining_top = round(flat_width - living_w - kitchen_w, 1)

    rooms.append(BlueprintRoom(
        id=f"{prefix}-living", name="Living Room",
        x=flat_x, y=0, width=living_w, height=top_height, type="living"
    ))
    rooms.append(BlueprintRoom(
        id=f"{prefix}-kitchen", name="Kitchen",
        x=round(flat_x + living_w, 1), y=0, width=kitchen_w, height=top_height, type="kitchen"
    ))
    if remaining_top > 2:
        rooms.append(BlueprintRoom(
            id=f"{prefix}-dining", name="Dining",
            x=round(flat_x + living_w + kitchen_w, 1), y=0,
            width=remaining_top, height=top_height, type="dining"
        ))

    bottom_slots = num_bedrooms + num_bathrooms + num_balconies
    if bottom_slots == 0:
        bottom_slots = 1
    slot_w = round(flat_width / bottom_slots, 1)
    cx = flat_x

    for b in range(num_bedrooms):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-bed{b+1}", name=f"Bedroom {b+1}",
            x=round(cx, 1), y=bottom_y, width=slot_w, height=bottom_height, type="bedroom"
        ))
        cx += slot_w

    for b in range(num_bathrooms):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-bath{b+1}", name=f"Bathroom {b+1}",
            x=round(cx, 1), y=bottom_y, width=slot_w, height=bottom_height, type="bathroom"
        ))
        cx += slot_w

    for b in range(num_balconies):
        rooms.append(BlueprintRoom(
            id=f"{prefix}-balcony{b+1}", name=f"Balcony {b+1}",
            x=round(cx, 1), y=bottom_y, width=slot_w, height=bottom_height, type="balcony"
        ))
        cx += slot_w

    return rooms
