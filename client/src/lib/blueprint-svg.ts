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

const BP_BG = "#0a1628";
const BP_LINE = "#4a9eff";
const BP_LINE_LIGHT = "#2a6cb8";
const BP_TEXT = "#7ec8e3";
const BP_TEXT_DIM = "#3d7ab5";
const BP_ACCENT = "#00d4ff";
const BP_WHITE = "#c8e6ff";
const BP_GRID = "#0d2040";

const ROOM_LINE_COLORS: Record<string, string> = {
  bedroom: "#5ba3d9",
  living: "#4ecdc4",
  kitchen: "#7ec8e3",
  bathroom: "#64b5f6",
  corridor: "#3d7ab5",
  staircase: "#5ba3d9",
  elevator: "#42a5f5",
  lobby: "#64b5f6",
  dining: "#4dd0e1",
  balcony: "#26c6da",
  storage: "#546e7a",
  utility: "#4a7c9b",
  parking: "#37687e",
  office: "#4fc3f7",
  laundry: "#4dd0e1",
  other: "#4a9eff",
};

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function drawRoom(room: SVGRoom, ox: number, oy: number): string {
  const x = ox + room.x * SCALE;
  const y = oy + room.y * SCALE;
  const w = room.width * SCALE;
  const h = room.height * SCALE;
  const lineColor = ROOM_LINE_COLORS[room.type] || BP_LINE;

  const fontSize = Math.min(w, h) > 60 ? 11 : 9;
  const label = room.name.length > 12 ? room.name.slice(0, 12) + "…" : room.name;
  const dimLabel = `${room.width.toFixed(0)}'×${room.height.toFixed(0)}'`;

  let crosshatch = "";
  if (room.type === "bathroom" || room.type === "kitchen") {
    crosshatch = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch-${room.type === "bathroom" ? "bath" : "kitchen"})" opacity="0.3"/>`;
  }

  return `<g class="room" data-room-id="${escapeXml(room.id)}" data-room-type="${escapeXml(room.type)}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${lineColor}" stroke-width="1.2" rx="0"/>
  ${crosshatch}
  <text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="${BP_WHITE}" opacity="0.9">${escapeXml(label)}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle" font-size="8" fill="${BP_TEXT_DIM}">${dimLabel}</text>
</g>`;
}

function drawDoor(x: number, y: number, horizontal: boolean): string {
  const w = horizontal ? DOOR_W * SCALE / 4 : DOOR_H * SCALE / 4;
  const h = horizontal ? DOOR_H * SCALE / 4 : DOOR_W * SCALE / 4;
  const arcR = Math.max(w, h) * 1.2;
  if (horizontal) {
    return `<g class="door">
  <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_ACCENT}" stroke-width="1"/>
  <path d="M ${x - w / 2} ${y + h / 2} A ${arcR} ${arcR} 0 0 0 ${x + w / 2} ${y + h / 2}" fill="none" stroke="${BP_ACCENT}" stroke-width="0.7" stroke-dasharray="2 1" opacity="0.6"/>
</g>`;
  }
  return `<g class="door">
  <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_ACCENT}" stroke-width="1"/>
  <path d="M ${x + w / 2} ${y - h / 2} A ${arcR} ${arcR} 0 0 1 ${x + w / 2} ${y + h / 2}" fill="none" stroke="${BP_ACCENT}" stroke-width="0.7" stroke-dasharray="2 1" opacity="0.6"/>
</g>`;
}

function drawWindow(x: number, y: number, horizontal: boolean): string {
  if (horizontal) {
    return `<g class="window">
  <line x1="${x - WINDOW_W}" y1="${y}" x2="${x + WINDOW_W}" y2="${y}" stroke="${BP_ACCENT}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="${x - WINDOW_W + 2}" y1="${y - 1.5}" x2="${x + WINDOW_W - 2}" y2="${y - 1.5}" stroke="${BP_ACCENT}" stroke-width="0.5" opacity="0.4"/>
  <line x1="${x - WINDOW_W + 2}" y1="${y + 1.5}" x2="${x + WINDOW_W - 2}" y2="${y + 1.5}" stroke="${BP_ACCENT}" stroke-width="0.5" opacity="0.4"/>
</g>`;
  }
  return `<g class="window">
  <line x1="${x}" y1="${y - WINDOW_W}" x2="${x}" y2="${y + WINDOW_W}" stroke="${BP_ACCENT}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="${x - 1.5}" y1="${y - WINDOW_W + 2}" x2="${x - 1.5}" y2="${y + WINDOW_W - 2}" stroke="${BP_ACCENT}" stroke-width="0.5" opacity="0.4"/>
  <line x1="${x + 1.5}" y1="${y - WINDOW_W + 2}" x2="${x + 1.5}" y2="${y + WINDOW_W - 2}" stroke="${BP_ACCENT}" stroke-width="0.5" opacity="0.4"/>
</g>`;
}

function drawCorridor(corridorRoom: SVGRoom, ox: number, oy: number): string {
  const x = ox + corridorRoom.x * SCALE;
  const y = oy + corridorRoom.y * SCALE;
  const w = corridorRoom.width * SCALE;
  const h = corridorRoom.height * SCALE;

  return `<g class="corridor">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_LINE_LIGHT}" stroke-width="0.8" stroke-dasharray="4 2"/>
  <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${BP_LINE_LIGHT}" stroke-width="0.3" stroke-dasharray="2 4" opacity="0.5"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-size="9" fill="${BP_TEXT_DIM}" font-weight="500" letter-spacing="2">CORRIDOR</text>
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
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_LINE}" stroke-width="1.5" rx="2"/>
  <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="none" stroke="${BP_LINE}" stroke-width="0.5" rx="1" opacity="0.4"/>
  <text x="${x + w / 2}" y="${y + 12}" text-anchor="middle" font-size="8" font-weight="600" fill="${BP_ACCENT}">TANK</text>
  <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" font-size="7" fill="${BP_TEXT}">${tank.capacity_litres}L</text>
  <text x="${x + w / 2}" y="${y + 31}" text-anchor="middle" font-size="7" fill="${BP_TEXT_DIM}">${tank.location}</text>
</g>`;
}

function drawWaterConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.water_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox + totalW + 20;
  const pipeStartY = oy + 20;
  const pipeEndY = oy + totalH - 20;

  svg += `<line x1="${mainX}" y1="${pipeStartY}" x2="${mainX}" y2="${pipeEndY}" stroke="${BP_LINE}" stroke-width="3" stroke-dasharray="6 3"/>`;
  svg += `<text x="${mainX + 8}" y="${pipeStartY + 10}" font-size="8" fill="${BP_ACCENT}" font-weight="600">MAIN SUPPLY</text>`;

  const floorCount = blueprint.floors.length;
  for (let i = 0; i < floorCount; i++) {
    const branchY = pipeStartY + (i + 0.5) * ((pipeEndY - pipeStartY) / floorCount);
    svg += `<line x1="${ox + totalW}" y1="${branchY}" x2="${mainX}" y2="${branchY}" stroke="${BP_LINE_LIGHT}" stroke-width="2" stroke-dasharray="4 2"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="3" fill="none" stroke="${BP_ACCENT}" stroke-width="1.5"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="1" fill="${BP_ACCENT}"/>`;
    svg += `<text x="${mainX + 8}" y="${branchY + 3}" font-size="7" fill="${BP_TEXT_DIM}">Floor ${i}</text>`;

    const floor = blueprint.floors[i];
    const baths = floor.rooms.filter((r) => r.type === "bathroom");
    const kitchens = floor.rooms.filter((r) => r.type === "kitchen");
    [...baths, ...kitchens].forEach((room) => {
      const roomCx = ox + (room.x + room.width / 2) * SCALE;
      const roomCy = oy + i * (totalH / floorCount) + (room.y + room.height / 2) * SCALE / floorCount;
      svg += `<line x1="${roomCx}" y1="${branchY}" x2="${roomCx}" y2="${roomCy}" stroke="${BP_LINE_LIGHT}" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/>`;
    });
  }

  svg += `<line x1="${mainX}" y1="${pipeEndY}" x2="${mainX}" y2="${pipeEndY + 20}" stroke="#c0392b" stroke-width="2"/>`;
  svg += `<text x="${mainX + 8}" y="${pipeEndY + 15}" font-size="7" fill="#e74c3c">DRAINAGE</text>`;

  return svg;
}

function drawElectricalConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.electrical_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox - 30;
  const dbY = oy + 15;

  svg += `<rect x="${mainX - 15}" y="${dbY}" width="30" height="25" fill="${BP_BG}" stroke="#f39c12" stroke-width="1.5" rx="2"/>`;
  svg += `<rect x="${mainX - 13}" y="${dbY + 2}" width="26" height="21" fill="none" stroke="#f39c12" stroke-width="0.5" rx="1" opacity="0.4"/>`;
  svg += `<text x="${mainX}" y="${dbY + 10}" text-anchor="middle" font-size="7" font-weight="600" fill="#f1c40f">DB</text>`;
  svg += `<text x="${mainX}" y="${dbY + 20}" text-anchor="middle" font-size="6" fill="#e67e22">MAIN</text>`;

  const floorCount = blueprint.floors.length;
  for (let i = 0; i < floorCount; i++) {
    const branchY = oy + (i + 0.5) * (totalH / floorCount);
    svg += `<line x1="${mainX}" y1="${dbY + 25}" x2="${mainX}" y2="${branchY}" stroke="#f39c12" stroke-width="2"/>`;
    svg += `<line x1="${mainX}" y1="${branchY}" x2="${ox}" y2="${branchY}" stroke="#e67e22" stroke-width="1.5" stroke-dasharray="5 3"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="3" fill="none" stroke="#f1c40f" stroke-width="1.5"/>`;
    svg += `<circle cx="${mainX}" cy="${branchY}" r="1" fill="#f1c40f"/>`;
    svg += `<text x="${mainX - 20}" y="${branchY + 3}" font-size="7" fill="#e67e22">F${i}</text>`;
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
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_LINE}" stroke-width="1.5" rx="0"/>
  <text x="${ox + 10}" y="${oy + 14}" font-size="10" font-weight="600" fill="${BP_ACCENT}" letter-spacing="2">PARKING</text>`;

  for (let i = 0; i < Math.min(slots, 8); i++) {
    const sx = ox + 10 + i * (slotW + 5);
    const sy = oy + 20;
    svg += `<rect x="${sx}" y="${sy}" width="${slotW}" height="${slotH - 5}" fill="none" stroke="${BP_LINE_LIGHT}" stroke-width="0.8" rx="0"/>`;
    svg += `<text x="${sx + slotW / 2}" y="${sy + slotH / 2}" text-anchor="middle" font-size="8" fill="${BP_TEXT_DIM}">P${i + 1}</text>`;
  }
  svg += `</g>`;
  return svg;
}

function drawTerrace(ox: number, oy: number, width: number, terrace: NonNullable<SVGBlueprint["terrace"]>): string {
  const w = width * SCALE;
  const h = 50;
  let svg = `<g class="terrace">
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="${BP_BG}" stroke="${BP_LINE}" stroke-width="1.5" stroke-dasharray="6 3" rx="0"/>
  <line x1="${ox}" y1="${oy}" x2="${ox + w}" y2="${oy + h}" stroke="${BP_LINE_LIGHT}" stroke-width="0.3" opacity="0.3"/>
  <line x1="${ox + w}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${BP_LINE_LIGHT}" stroke-width="0.3" opacity="0.3"/>
  <text x="${ox + w / 2}" y="${oy + 18}" text-anchor="middle" font-size="11" font-weight="600" fill="${BP_ACCENT}" letter-spacing="2">TERRACE</text>
  <text x="${ox + w / 2}" y="${oy + 32}" text-anchor="middle" font-size="8" fill="${BP_TEXT}">${terrace.area_sqft} sqft</text>
  <text x="${ox + w / 2}" y="${oy + 43}" text-anchor="middle" font-size="7" fill="${BP_TEXT_DIM}">Railing: ${terrace.has_railing ? "Yes" : "No"} | WP: ${terrace.water_proofing ? "Yes" : "No"}</text>
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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background:${BP_BG};font-family:'Inter',system-ui,sans-serif">`;

  svg += `<defs>
  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${BP_GRID}" stroke-width="0.5"/>
  </pattern>
  <pattern id="hatch-bath" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" stroke="${BP_LINE_LIGHT}" stroke-width="0.5"/>
  </pattern>
  <pattern id="hatch-kitchen" width="8" height="8" patternUnits="userSpaceOnUse">
    <circle cx="4" cy="4" r="1" fill="${BP_LINE_LIGHT}" opacity="0.5"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#grid)"/>`;

  const baseOx = PADDING + extraLeft;

  floorsToRender.forEach((floor, fIdx) => {
    const oy = PADDING + fIdx * (floorH + FLOOR_GAP);
    const ox = baseOx;

    svg += `<text x="${ox - 5}" y="${oy - 8}" font-size="13" font-weight="700" fill="${BP_ACCENT}" letter-spacing="1">${escapeXml(floor.label)}</text>`;

    svg += `<rect x="${ox - 2}" y="${oy - 2}" width="${buildingW * SCALE + 4}" height="${floorH + 4}" fill="none" stroke="${BP_LINE}" stroke-width="2" rx="0"/>`;

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
            svg += `<text x="${ox + (minX + (maxX - minX) / 2) * SCALE}" y="${oy + floorH + 15}" text-anchor="middle" font-size="9" font-weight="600" fill="${BP_ACCENT}">${escapeXml(flat.label)}</text>`;
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
    ctx.fillStyle = BP_BG;
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
