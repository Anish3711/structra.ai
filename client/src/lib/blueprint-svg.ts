export interface SVGRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export interface SVGFloor {
  floor: number;
  label: string;
  rooms: SVGRoom[];
  flats?: { flat_id: string; label: string; rooms: string[] }[];
}

export interface SVGBlueprint {
  floors: SVGFloor[];
  corridors: { floor: number; y: number; height: number }[];
  terrace?: { area_sqft: number; has_railing: boolean; water_proofing: boolean };
  roof?: { type: string; area_sqft: number };
  water_tanks: { id: string; capacity_litres: number; location: string }[];
  electrical_lines: { id: string; type: string; from: string; to: string }[];
  water_lines: { id: string; from: string; to: string }[];
}

export type ComponentFilter =
  | "all"
  | "floors"
  | "flats"
  | "corridors"
  | "single_flat"
  | "parking"
  | "terrace"
  | "water_tanks"
  | "water_connections"
  | "electrical_connections";

const SCALE = 8;
const PADDING = 40;
const FLOOR_GAP = 60;
const DOOR_W = 6;
const DOOR_H = 3;
const WINDOW_W = 8;
const WINDOW_H = 2;

const ROOM_COLORS: Record<string, string> = {
  bedroom: "#dbeafe",
  living: "#dcfce7",
  kitchen: "#fef9c3",
  bathroom: "#fde68a",
  corridor: "#f1f5f9",
  staircase: "#fed7aa",
  elevator: "#bfdbfe",
  lobby: "#e9d5ff",
  dining: "#fecaca",
  balcony: "#bbf7d0",
  storage: "#e5e7eb",
  utility: "#d6d3d1",
  parking: "#e2e8f0",
  office: "#bae6fd",
  laundry: "#fde047",
  other: "#fbcfe8",
};

const ROOM_STROKE: Record<string, string> = {
  bedroom: "#3b82f6",
  living: "#22c55e",
  kitchen: "#eab308",
  bathroom: "#f59e0b",
  corridor: "#94a3b8",
  balcony: "#16a34a",
  parking: "#64748b",
};

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function drawRoom(room: SVGRoom, ox: number, oy: number): string {
  const x = ox + room.x * SCALE;
  const y = oy + room.y * SCALE;
  const w = room.width * SCALE;
  const h = room.height * SCALE;
  const fill = ROOM_COLORS[room.type] || "#f3f4f6";
  const stroke = ROOM_STROKE[room.type] || "#64748b";

  const fontSize = Math.min(w, h) > 60 ? 11 : 9;
  const label = room.name.length > 12 ? room.name.slice(0, 12) + "…" : room.name;
  const dimLabel = `${room.width.toFixed(0)}'×${room.height.toFixed(0)}'`;

  return `<g class="room" data-room-id="${escapeXml(room.id)}" data-room-type="${escapeXml(room.type)}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="1"/>
  <text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="#1e293b">${escapeXml(label)}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle" font-size="8" fill="#64748b">${dimLabel}</text>
</g>`;
}

function drawDoor(x: number, y: number, horizontal: boolean): string {
  const w = horizontal ? DOOR_W * SCALE / 4 : DOOR_H * SCALE / 4;
  const h = horizontal ? DOOR_H * SCALE / 4 : DOOR_W * SCALE / 4;
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="#92400e" stroke="#78350f" stroke-width="0.5" rx="1"/>`;
}

function drawWindow(x: number, y: number, horizontal: boolean): string {
  if (horizontal) {
    return `<line x1="${x - WINDOW_W}" y1="${y}" x2="${x + WINDOW_W}" y2="${y}" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `<line x1="${x}" y1="${y - WINDOW_W}" x2="${x}" y2="${y + WINDOW_W}" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>`;
}

function drawCorridor(corridorRoom: SVGRoom, ox: number, oy: number): string {
  const x = ox + corridorRoom.x * SCALE;
  const y = oy + corridorRoom.y * SCALE;
  const w = corridorRoom.width * SCALE;
  const h = corridorRoom.height * SCALE;

  return `<g class="corridor">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">CORRIDOR</text>
</g>`;
}

function drawDoorsForRoom(room: SVGRoom, corridorY: number, corridorH: number, ox: number, oy: number): string {
  if (room.type === "corridor") return "";
  let parts = "";
  const rx = ox + room.x * SCALE;
  const ry = oy + room.y * SCALE;
  const rw = room.width * SCALE;
  const rh = room.height * SCALE;

  const corridorTop = oy + corridorY * SCALE;
  const corridorBottom = corridorTop + corridorH * SCALE;

  if (ry + rh <= corridorTop + 2) {
    parts += drawDoor(rx + rw / 2, ry + rh, true);
  } else if (ry >= corridorBottom - 2) {
    parts += drawDoor(rx + rw / 2, ry, true);
  }
  return parts;
}

function drawWindowsForRoom(room: SVGRoom, buildingWidth: number, buildingDepth: number, ox: number, oy: number): string {
  if (room.type === "corridor" || room.type === "elevator" || room.type === "staircase") return "";
  let parts = "";
  const rx = ox + room.x * SCALE;
  const ry = oy + room.y * SCALE;
  const rw = room.width * SCALE;
  const rh = room.height * SCALE;

  if (room.y <= 0.5) {
    parts += drawWindow(rx + rw * 0.35, ry, true);
    if (rw > 50) parts += drawWindow(rx + rw * 0.65, ry, true);
  }
  if (room.y + room.height >= buildingDepth - 0.5) {
    parts += drawWindow(rx + rw * 0.35, ry + rh, true);
    if (rw > 50) parts += drawWindow(rx + rw * 0.65, ry + rh, true);
  }
  if (room.x <= 0.5) {
    parts += drawWindow(rx, ry + rh * 0.5, false);
  }
  if (room.x + room.width >= buildingWidth - 0.5) {
    parts += drawWindow(rx + rw, ry + rh * 0.5, false);
  }
  return parts;
}

function drawWaterTank(x: number, y: number, tank: { id: string; capacity_litres: number; location: string }): string {
  const w = 50;
  const h = 35;
  return `<g class="water-tank">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bfdbfe" stroke="#2563eb" stroke-width="1.5" rx="4"/>
  <text x="${x + w / 2}" y="${y + 12}" text-anchor="middle" font-size="8" font-weight="600" fill="#1e40af">💧 Tank</text>
  <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" font-size="7" fill="#3b82f6">${tank.capacity_litres}L</text>
  <text x="${x + w / 2}" y="${y + 31}" text-anchor="middle" font-size="7" fill="#64748b">${tank.location}</text>
</g>`;
}

function drawWaterConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.water_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox + totalW + 20;
  const pipeStartY = oy + 20;
  const pipeEndY = oy + totalH - 20;

  svg += `<line x1="${mainX}" y1="${pipeStartY}" x2="${mainX}" y2="${pipeEndY}" stroke="#2563eb" stroke-width="3" stroke-dasharray="6 3"/>`;
  svg += `<text x="${mainX + 8}" y="${pipeStartY + 10}" font-size="8" fill="#2563eb" font-weight="600">Main Supply</text>`;

  const floorCount = blueprint.floors.length;
  for (let i = 0; i < floorCount; i++) {
    const branchY = pipeStartY + (i + 0.5) * ((pipeEndY - pipeStartY) / floorCount);
    svg += `<line x1="${ox + totalW}" y1="${branchY}" x2="${mainX}" y2="${branchY}" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4 2"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="3" fill="#2563eb"/>`;
    svg += `<text x="${mainX + 8}" y="${branchY + 3}" font-size="7" fill="#64748b">→ Floor ${i}</text>`;

    const floor = blueprint.floors[i];
    const baths = floor.rooms.filter((r) => r.type === "bathroom");
    const kitchens = floor.rooms.filter((r) => r.type === "kitchen");
    [...baths, ...kitchens].forEach((room) => {
      const roomCx = ox + (room.x + room.width / 2) * SCALE;
      const roomCy = oy + i * (totalH / floorCount) + (room.y + room.height / 2) * SCALE / floorCount;
      svg += `<line x1="${roomCx}" y1="${branchY}" x2="${roomCx}" y2="${roomCy}" stroke="#93c5fd" stroke-width="1" stroke-dasharray="3 2" opacity="0.7"/>`;
    });
  }

  svg += `<line x1="${mainX}" y1="${pipeEndY}" x2="${mainX}" y2="${pipeEndY + 20}" stroke="#dc2626" stroke-width="2"/>`;
  svg += `<text x="${mainX + 8}" y="${pipeEndY + 15}" font-size="7" fill="#dc2626">→ Drainage</text>`;

  return svg;
}

function drawElectricalConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.electrical_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox - 30;
  const dbY = oy + 15;

  svg += `<rect x="${mainX - 15}" y="${dbY}" width="30" height="25" fill="#fef3c7" stroke="#d97706" stroke-width="1.5" rx="3"/>`;
  svg += `<text x="${mainX}" y="${dbY + 10}" text-anchor="middle" font-size="7" font-weight="600" fill="#92400e">⚡ DB</text>`;
  svg += `<text x="${mainX}" y="${dbY + 20}" text-anchor="middle" font-size="6" fill="#b45309">Main</text>`;

  const floorCount = blueprint.floors.length;
  for (let i = 0; i < floorCount; i++) {
    const branchY = oy + (i + 0.5) * (totalH / floorCount);
    svg += `<line x1="${mainX}" y1="${dbY + 25}" x2="${mainX}" y2="${branchY}" stroke="#d97706" stroke-width="2"/>`;
    svg += `<line x1="${mainX}" y1="${branchY}" x2="${ox}" y2="${branchY}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="3" fill="#d97706"/>`;
    svg += `<text x="${mainX - 20}" y="${branchY + 3}" font-size="7" fill="#92400e">F${i}</text>`;
  }

  return svg;
}

function drawParkingLevel(ox: number, oy: number, width: number): string {
  const w = width * SCALE;
  const h = 60;
  const slotW = 30;
  const slotH = 45;
  const slots = Math.floor(w / (slotW + 5));

  let svg = `<g class="parking">
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" rx="2"/>
  <text x="${ox + 10}" y="${oy + 14}" font-size="10" font-weight="600" fill="#334155">🅿 PARKING</text>`;

  for (let i = 0; i < Math.min(slots, 8); i++) {
    const sx = ox + 10 + i * (slotW + 5);
    const sy = oy + 20;
    svg += `<rect x="${sx}" y="${sy}" width="${slotW}" height="${slotH - 5}" fill="#f8fafc" stroke="#94a3b8" stroke-width="0.8" rx="1"/>`;
    svg += `<text x="${sx + slotW / 2}" y="${sy + slotH / 2}" text-anchor="middle" font-size="8" fill="#94a3b8">P${i + 1}</text>`;
  }
  svg += `</g>`;
  return svg;
}

function drawTerrace(ox: number, oy: number, width: number, terrace: NonNullable<SVGBlueprint["terrace"]>): string {
  const w = width * SCALE;
  const h = 50;
  let svg = `<g class="terrace">
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="#ecfdf5" stroke="#059669" stroke-width="1.5" stroke-dasharray="6 3" rx="2"/>
  <text x="${ox + w / 2}" y="${oy + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="#065f46">TERRACE</text>
  <text x="${ox + w / 2}" y="${oy + 32}" text-anchor="middle" font-size="8" fill="#047857">${terrace.area_sqft} sqft</text>
  <text x="${ox + w / 2}" y="${oy + 43}" text-anchor="middle" font-size="7" fill="#64748b">Railing: ${terrace.has_railing ? "Yes" : "No"} | WP: ${terrace.water_proofing ? "Yes" : "No"}</text>
</g>`;
  return svg;
}

function computeBuildingDims(blueprint: SVGBlueprint): { width: number; depth: number } {
  let maxW = 0;
  let maxD = 0;
  for (const floor of blueprint.floors) {
    for (const room of floor.rooms) {
      maxW = Math.max(maxW, room.x + room.width);
      maxD = Math.max(maxD, room.y + room.height);
    }
  }
  return { width: maxW || 50, depth: maxD || 40 };
}

export function blueprintToSVG(
  blueprint: SVGBlueprint,
  filter: ComponentFilter = "all",
  selectedFloor: number = -1,
  selectedFlatIdx: number = -1
): string {
  const dims = computeBuildingDims(blueprint);
  const buildingW = dims.width;
  const buildingD = dims.depth;
  const floorH = buildingD * SCALE;

  const floorsToRender =
    selectedFloor >= 0
      ? blueprint.floors.filter((f) => f.floor === selectedFloor)
      : blueprint.floors;

  let extraRight = 0;
  let extraLeft = 0;
  let extraBottom = 0;

  if (filter === "water_connections" || filter === "all") extraRight = 80;
  if (filter === "electrical_connections" || filter === "all") extraLeft = 60;
  if (filter === "parking" || filter === "all") extraBottom += 80;
  if (filter === "terrace" || filter === "all") extraBottom += 70;
  if (filter === "water_tanks" || filter === "all") extraBottom += 50;

  const totalFloorH = floorsToRender.length * (floorH + FLOOR_GAP);
  const svgW = PADDING * 2 + buildingW * SCALE + extraRight + extraLeft;
  const svgH = PADDING * 2 + totalFloorH + extraBottom + 30;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background:#fff;font-family:'Inter',system-ui,sans-serif">`;

  svg += `<defs>
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#grid)"/>`;

  const baseOx = PADDING + extraLeft;

  floorsToRender.forEach((floor, fIdx) => {
    const oy = PADDING + fIdx * (floorH + FLOOR_GAP);
    const ox = baseOx;

    svg += `<text x="${ox - 5}" y="${oy - 8}" font-size="13" font-weight="700" fill="#1e293b">${escapeXml(floor.label)}</text>`;

    svg += `<rect x="${ox - 2}" y="${oy - 2}" width="${buildingW * SCALE + 4}" height="${floorH + 4}" fill="none" stroke="#1e293b" stroke-width="2.5" rx="2"/>`;

    const corridor = floor.rooms.find((r) => r.type === "corridor");
    const corridorY = corridor ? corridor.y : buildingD / 2 - 1.5;
    const corridorH = corridor ? corridor.height : 3;

    let roomsToRender = floor.rooms;

    if (filter === "corridors") {
      roomsToRender = floor.rooms.filter((r) => r.type === "corridor");
    } else if (filter === "flats") {
      roomsToRender = floor.rooms.filter((r) => r.type !== "corridor");
    } else if (filter === "single_flat" && floor.flats && floor.flats.length > 0) {
      const flatIdx = selectedFlatIdx >= 0 ? selectedFlatIdx : 0;
      const flat = floor.flats[flatIdx];
      if (flat) {
        const flatRoomIds = new Set(flat.rooms);
        roomsToRender = floor.rooms.filter((r) => flatRoomIds.has(r.id));
      }
    } else if (filter === "parking") {
      roomsToRender = floor.rooms.filter((r) => r.type === "parking");
    } else if (
      filter === "water_connections" ||
      filter === "electrical_connections" ||
      filter === "water_tanks" ||
      filter === "terrace"
    ) {
      roomsToRender = floor.rooms;
    }

    if (filter !== "parking" && filter !== "water_tanks" && filter !== "terrace") {
      if (corridor && (filter === "all" || filter === "corridors" || filter === "floors" || filter === "flats")) {
        svg += drawCorridor(corridor, ox, oy);
      }

      roomsToRender
        .filter((r) => r.type !== "corridor")
        .forEach((room) => {
          svg += drawRoom(room, ox, oy);
        });

      if (filter === "all" || filter === "floors" || filter === "flats" || filter === "single_flat") {
        roomsToRender.forEach((room) => {
          svg += drawDoorsForRoom(room, corridorY, corridorH, ox, oy);
          svg += drawWindowsForRoom(room, buildingW, buildingD, ox, oy);
        });
      }

      if (floor.flats && floor.flats.length > 0 && (filter === "all" || filter === "flats" || filter === "floors")) {
        floor.flats.forEach((flat) => {
          const flatRooms = floor.rooms.filter((r) => flat.rooms.includes(r.id));
          if (flatRooms.length > 0) {
            const minX = Math.min(...flatRooms.map((r) => r.x));
            const maxX = Math.max(...flatRooms.map((r) => r.x + r.width));
            svg += `<text x="${ox + (minX + (maxX - minX) / 2) * SCALE}" y="${oy + floorH + 15}" text-anchor="middle" font-size="9" font-weight="600" fill="#3b82f6">${escapeXml(flat.label)}</text>`;
          }
        });
      }
    }
  });

  let bottomY = PADDING + floorsToRender.length * (floorH + FLOOR_GAP) + 10;
  const totalH = floorsToRender.length * (floorH + FLOOR_GAP);

  if (filter === "water_connections" || filter === "all") {
    svg += drawWaterConnections(blueprint, baseOx, PADDING, buildingW * SCALE, totalH);
  }
  if (filter === "electrical_connections" || filter === "all") {
    svg += drawElectricalConnections(blueprint, baseOx, PADDING, buildingW * SCALE, totalH);
  }

  if (filter === "parking" || filter === "all") {
    svg += drawParkingLevel(baseOx, bottomY, buildingW);
    bottomY += 80;
  }
  if (filter === "terrace" || filter === "all") {
    if (blueprint.terrace) {
      svg += drawTerrace(baseOx, bottomY, buildingW, blueprint.terrace);
      bottomY += 70;
    }
  }
  if (filter === "water_tanks" || filter === "all") {
    blueprint.water_tanks.forEach((tank, i) => {
      svg += drawWaterTank(baseOx + i * 65, bottomY, tank);
    });
  }

  svg += `</svg>`;
  return svg;
}

export function exportSVGAsFile(svgString: string, filename: string = "blueprint.svg"): void {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSVGAsPNG(svgString: string, filename: string = "blueprint.png", scale: number = 2): void {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.documentElement;
  const w = parseInt(svgEl.getAttribute("width") || "800");
  const h = parseInt(svgEl.getAttribute("height") || "600");

  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, "image/png");
  };
  img.src = url;
}
