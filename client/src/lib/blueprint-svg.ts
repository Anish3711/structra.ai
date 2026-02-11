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

const S = 7;
const PAD = 80;
const FLOOR_GAP = 90;
const WALL = 2.5;
const WALL_INNER = 1.5;

const BG = "#0a1929";
const LINE = "#c8dce8";
const LINE_DIM = "#4a6a80";
const LINE_ACCENT = "#6ab7e8";
const TXT = "#90b8d0";
const TXT_DIM = "#4a6a80";
const TXT_BRIGHT = "#d4eaf5";
const GRID_COLOR = "#0e2238";
const DIM_COLOR = "#5a9ab5";
const HATCH_COLOR = "#3a5a70";

const ROOM_COLORS: Record<string, string> = {
  bedroom: "#8ab4d0",
  living: "#8ec8b8",
  kitchen: "#a0c8d8",
  bathroom: "#7aaac0",
  corridor: "#5a8aa0",
  staircase: "#7ab0c8",
  elevator: "#6aa0c0",
  lobby: "#7aaac0",
  dining: "#80c0c8",
  balcony: "#60b8c0",
  storage: "#607880",
  utility: "#5a8898",
  parking: "#486878",
  office: "#70b8d8",
  laundry: "#70c0c8",
  other: "#7ab0c8",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function roomColor(type: string): string {
  return ROOM_COLORS[type] || LINE;
}

function dimLine(x1: number, y1: number, x2: number, y2: number, label: string, offset: number, horizontal: boolean): string {
  const extLen = 6;
  const tickLen = 3;
  let svg = "";

  if (horizontal) {
    const ey = y1 + offset;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${ey}" stroke="${DIM_COLOR}" stroke-width="0.4" opacity="0.5"/>`;
    svg += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${ey}" stroke="${DIM_COLOR}" stroke-width="0.4" opacity="0.5"/>`;
    svg += `<line x1="${x1}" y1="${ey}" x2="${x2}" y2="${ey}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<line x1="${x1}" y1="${ey - tickLen}" x2="${x1}" y2="${ey + tickLen}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<line x1="${x2}" y1="${ey - tickLen}" x2="${x2}" y2="${ey + tickLen}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<text x="${(x1 + x2) / 2}" y="${ey - 3}" text-anchor="middle" font-size="7" fill="${DIM_COLOR}" opacity="0.8">${esc(label)}</text>`;
  } else {
    const ex = x1 + offset;
    svg += `<line x1="${x1}" y1="${y1}" x2="${ex}" y2="${y1}" stroke="${DIM_COLOR}" stroke-width="0.4" opacity="0.5"/>`;
    svg += `<line x1="${x2}" y1="${y2}" x2="${ex}" y2="${y2}" stroke="${DIM_COLOR}" stroke-width="0.4" opacity="0.5"/>`;
    svg += `<line x1="${ex}" y1="${y1}" x2="${ex}" y2="${y2}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<line x1="${ex - tickLen}" y1="${y1}" x2="${ex + tickLen}" y2="${y1}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<line x1="${ex - tickLen}" y1="${y2}" x2="${ex + tickLen}" y2="${y2}" stroke="${DIM_COLOR}" stroke-width="0.5" opacity="0.7"/>`;
    svg += `<text x="${ex + 4}" y="${(y1 + y2) / 2 + 3}" font-size="7" fill="${DIM_COLOR}" opacity="0.8">${esc(label)}</text>`;
  }
  return svg;
}

function drawWallRect(x: number, y: number, w: number, h: number, color: string, thickness: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${thickness}"/>`;
}

function drawRoom(room: SVGRoom, ox: number, oy: number, isCorridorRoom: boolean): string {
  const x = ox + room.x * S;
  const y = oy + room.y * S;
  const w = room.width * S;
  const h = room.height * S;
  const col = roomColor(room.type);
  const sw = isCorridorRoom ? 0.8 : WALL_INNER;

  let hatch = "";
  if (room.type === "bathroom") {
    hatch = `<pattern id="hatch-${esc(room.id)}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="${HATCH_COLOR}" stroke-width="0.6"/>
    </pattern>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch-${esc(room.id)})" opacity="0.4"/>`;
  } else if (room.type === "kitchen") {
    hatch = `<pattern id="hatch-${esc(room.id)}" width="5" height="5" patternUnits="userSpaceOnUse">
      <circle cx="2.5" cy="2.5" r="0.8" fill="${HATCH_COLOR}" opacity="0.5"/>
    </pattern>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch-${esc(room.id)})" opacity="0.35"/>`;
  } else if (room.type === "staircase") {
    const steps = Math.floor(h / 3);
    let stairLines = "";
    for (let i = 1; i < steps; i++) {
      const sy = y + (i * h) / steps;
      stairLines += `<line x1="${x + 2}" y1="${sy}" x2="${x + w - 2}" y2="${sy}" stroke="${LINE_DIM}" stroke-width="0.5" opacity="0.5"/>`;
    }
    stairLines += `<line x1="${x + w / 2}" y1="${y + 2}" x2="${x + w / 2}" y2="${y + h - 2}" stroke="${LINE_DIM}" stroke-width="0.3" opacity="0.4"/>`;
    const arrowY = y + 4;
    stairLines += `<polygon points="${x + w / 2 - 3},${arrowY + 4} ${x + w / 2 + 3},${arrowY + 4} ${x + w / 2},${arrowY}" fill="${LINE_DIM}" opacity="0.5"/>`;
    hatch = stairLines;
  } else if (room.type === "elevator") {
    hatch = `<line x1="${x + 3}" y1="${y + 3}" x2="${x + w - 3}" y2="${y + h - 3}" stroke="${LINE_DIM}" stroke-width="0.5" opacity="0.4"/>
    <line x1="${x + w - 3}" y1="${y + 3}" x2="${x + 3}" y2="${y + h - 3}" stroke="${LINE_DIM}" stroke-width="0.5" opacity="0.4"/>
    <rect x="${x + w / 2 - 4}" y="${y + h / 2 - 5}" width="8" height="10" fill="none" stroke="${LINE_DIM}" stroke-width="0.6" opacity="0.5"/>`;
  }

  const fontSize = Math.min(w, h) > 40 ? 8 : 7;
  const label = room.name.length > 14 ? room.name.slice(0, 13) + "..." : room.name;
  const dimTxt = `${room.width.toFixed(0)}'x${room.height.toFixed(0)}'`;

  let corridorFill = "";
  if (isCorridorRoom) {
    const stepSize = 3;
    const numDots = Math.floor(w / (stepSize * 2));
    let centerLine = `<line x1="${x + 4}" y1="${y + h / 2}" x2="${x + w - 4}" y2="${y + h / 2}" stroke="${LINE_DIM}" stroke-width="0.3" stroke-dasharray="3 5" opacity="0.4"/>`;
    corridorFill = centerLine;
  }

  return `<g data-room-id="${esc(room.id)}" data-room-type="${esc(room.type)}">
  ${drawWallRect(x, y, w, h, col, sw)}
  ${hatch}
  ${corridorFill}
  <text x="${x + w / 2}" y="${y + h / 2 - 2}" text-anchor="middle" font-size="${fontSize}" fill="${TXT_BRIGHT}" opacity="0.85" font-weight="500">${esc(label)}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 8}" text-anchor="middle" font-size="6" fill="${TXT_DIM}">${dimTxt}</text>
</g>`;
}

function drawDoorArc(x: number, y: number, facing: "up" | "down" | "left" | "right"): string {
  const r = 8;
  const gap = 10;
  let svg = "";

  if (facing === "down") {
    svg += `<line x1="${x - gap / 2}" y1="${y}" x2="${x + gap / 2}" y2="${y}" stroke="${BG}" stroke-width="3"/>`;
    svg += `<line x1="${x - gap / 2}" y1="${y}" x2="${x + gap / 2}" y2="${y}" stroke="${LINE_ACCENT}" stroke-width="1"/>`;
    svg += `<path d="M ${x - gap / 2} ${y} A ${r} ${r} 0 0 1 ${x + gap / 2} ${y}" fill="none" stroke="${LINE_ACCENT}" stroke-width="0.6" stroke-dasharray="2 1.5" opacity="0.7" transform="scale(1,-1) translate(0,${-2 * y})"/>`;
  } else if (facing === "up") {
    svg += `<line x1="${x - gap / 2}" y1="${y}" x2="${x + gap / 2}" y2="${y}" stroke="${BG}" stroke-width="3"/>`;
    svg += `<line x1="${x - gap / 2}" y1="${y}" x2="${x + gap / 2}" y2="${y}" stroke="${LINE_ACCENT}" stroke-width="1"/>`;
    svg += `<path d="M ${x - gap / 2} ${y} A ${r} ${r} 0 0 1 ${x + gap / 2} ${y}" fill="none" stroke="${LINE_ACCENT}" stroke-width="0.6" stroke-dasharray="2 1.5" opacity="0.7"/>`;
  } else if (facing === "right") {
    svg += `<line x1="${x}" y1="${y - gap / 2}" x2="${x}" y2="${y + gap / 2}" stroke="${BG}" stroke-width="3"/>`;
    svg += `<line x1="${x}" y1="${y - gap / 2}" x2="${x}" y2="${y + gap / 2}" stroke="${LINE_ACCENT}" stroke-width="1"/>`;
    svg += `<path d="M ${x} ${y - gap / 2} A ${r} ${r} 0 0 1 ${x} ${y + gap / 2}" fill="none" stroke="${LINE_ACCENT}" stroke-width="0.6" stroke-dasharray="2 1.5" opacity="0.7"/>`;
  } else {
    svg += `<line x1="${x}" y1="${y - gap / 2}" x2="${x}" y2="${y + gap / 2}" stroke="${BG}" stroke-width="3"/>`;
    svg += `<line x1="${x}" y1="${y - gap / 2}" x2="${x}" y2="${y + gap / 2}" stroke="${LINE_ACCENT}" stroke-width="1"/>`;
    svg += `<path d="M ${x} ${y - gap / 2} A ${r} ${r} 0 0 0 ${x} ${y + gap / 2}" fill="none" stroke="${LINE_ACCENT}" stroke-width="0.6" stroke-dasharray="2 1.5" opacity="0.7"/>`;
  }
  return svg;
}

function drawWindowMark(x: number, y: number, horizontal: boolean): string {
  const len = 10;
  if (horizontal) {
    return `<g>
      <line x1="${x - len / 2}" y1="${y}" x2="${x + len / 2}" y2="${y}" stroke="${BG}" stroke-width="4"/>
      <line x1="${x - len / 2}" y1="${y - 1.5}" x2="${x + len / 2}" y2="${y - 1.5}" stroke="${LINE_ACCENT}" stroke-width="0.8" opacity="0.8"/>
      <line x1="${x - len / 2}" y1="${y + 1.5}" x2="${x + len / 2}" y2="${y + 1.5}" stroke="${LINE_ACCENT}" stroke-width="0.8" opacity="0.8"/>
      <line x1="${x - len / 2}" y1="${y}" x2="${x + len / 2}" y2="${y}" stroke="${LINE_ACCENT}" stroke-width="0.4" opacity="0.5"/>
    </g>`;
  }
  return `<g>
    <line x1="${x}" y1="${y - len / 2}" x2="${x}" y2="${y + len / 2}" stroke="${BG}" stroke-width="4"/>
    <line x1="${x - 1.5}" y1="${y - len / 2}" x2="${x - 1.5}" y2="${y + len / 2}" stroke="${LINE_ACCENT}" stroke-width="0.8" opacity="0.8"/>
    <line x1="${x + 1.5}" y1="${y - len / 2}" x2="${x + 1.5}" y2="${y + len / 2}" stroke="${LINE_ACCENT}" stroke-width="0.8" opacity="0.8"/>
    <line x1="${x}" y1="${y - len / 2}" x2="${x}" y2="${y + len / 2}" stroke="${LINE_ACCENT}" stroke-width="0.4" opacity="0.5"/>
  </g>`;
}

function drawDoorsForRoom(room: SVGRoom, corridorY: number, corridorH: number, ox: number, oy: number): string {
  if (room.type === "corridor" || room.type === "elevator" || room.type === "staircase") return "";
  let parts = "";
  const rx = ox + room.x * S;
  const ry = oy + room.y * S;
  const rw = room.width * S;
  const rh = room.height * S;

  const cTop = oy + corridorY * S;
  const cBot = cTop + corridorH * S;

  if (Math.abs(ry + rh - cTop) < S * 2) {
    parts += drawDoorArc(rx + rw * 0.4, ry + rh, "down");
  } else if (Math.abs(ry - cBot) < S * 2) {
    parts += drawDoorArc(rx + rw * 0.4, ry, "up");
  }
  return parts;
}

function drawWindowsForRoom(room: SVGRoom, bw: number, bd: number, ox: number, oy: number): string {
  if (room.type === "corridor" || room.type === "elevator" || room.type === "staircase") return "";
  let parts = "";
  const rx = ox + room.x * S;
  const ry = oy + room.y * S;
  const rw = room.width * S;
  const rh = room.height * S;

  if (room.y <= 0.5) {
    parts += drawWindowMark(rx + rw * 0.4, ry, true);
    if (rw > 50) parts += drawWindowMark(rx + rw * 0.7, ry, true);
  }
  if (room.y + room.height >= bd - 0.5) {
    parts += drawWindowMark(rx + rw * 0.4, ry + rh, true);
    if (rw > 50) parts += drawWindowMark(rx + rw * 0.7, ry + rh, true);
  }
  if (room.x <= 0.5) {
    parts += drawWindowMark(rx, ry + rh * 0.5, false);
  }
  if (room.x + room.width >= bw - 0.5) {
    parts += drawWindowMark(rx + rw, ry + rh * 0.5, false);
  }
  return parts;
}

function drawPlumbingShaft(ox: number, oy: number, floorH: number, shaftX: number): string {
  const sx = ox + shaftX * S;
  const sw = 3 * S;
  return `<g opacity="0.4">
    <rect x="${sx}" y="${oy}" width="${sw}" height="${floorH}" fill="none" stroke="#4a90b0" stroke-width="0.6" stroke-dasharray="3 2"/>
    <text x="${sx + sw / 2}" y="${oy + 8}" text-anchor="middle" font-size="5" fill="#4a90b0" opacity="0.7">PLMB</text>
    <line x1="${sx + sw / 2}" y1="${oy + 10}" x2="${sx + sw / 2}" y2="${oy + floorH - 2}" stroke="#4a90b0" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.5"/>
  </g>`;
}

function drawElectricalRiser(ox: number, oy: number, floorH: number, riserX: number): string {
  const rx = ox + riserX * S;
  return `<g opacity="0.4">
    <rect x="${rx - 4}" y="${oy}" width="8" height="${floorH}" fill="none" stroke="#c0a040" stroke-width="0.5" stroke-dasharray="2 3"/>
    <text x="${rx}" y="${oy + 8}" text-anchor="middle" font-size="5" fill="#c0a040" opacity="0.7">ELEC</text>
    <line x1="${rx}" y1="${oy + 10}" x2="${rx}" y2="${oy + floorH - 2}" stroke="#c0a040" stroke-width="0.4" stroke-dasharray="4 3" opacity="0.4"/>
  </g>`;
}

function drawWaterConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.water_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox + totalW + 25;
  const pipeStartY = oy + 20;
  const pipeEndY = oy + totalH - 20;

  svg += `<line x1="${mainX}" y1="${pipeStartY}" x2="${mainX}" y2="${pipeEndY}" stroke="#4a90b0" stroke-width="2" stroke-dasharray="6 3"/>`;
  svg += `<text x="${mainX + 6}" y="${pipeStartY + 8}" font-size="7" fill="#6ab0d0" font-weight="500" letter-spacing="1">SUPPLY</text>`;

  const fc = blueprint.floors.length;
  for (let i = 0; i < fc; i++) {
    const brY = pipeStartY + (i + 0.5) * ((pipeEndY - pipeStartY) / fc);
    svg += `<line x1="${ox + totalW}" y1="${brY}" x2="${mainX}" y2="${brY}" stroke="#3a7890" stroke-width="1.2" stroke-dasharray="4 2"/>`;
    svg += `<circle cx="${mainX}" cy="${brY}" r="2.5" fill="none" stroke="#6ab0d0" stroke-width="1"/>`;
    svg += `<circle cx="${mainX}" cy="${brY}" r="1" fill="#6ab0d0"/>`;
    svg += `<text x="${mainX + 6}" y="${brY + 3}" font-size="6" fill="${TXT_DIM}">F${i}</text>`;
  }
  svg += `<line x1="${mainX}" y1="${pipeEndY}" x2="${mainX}" y2="${pipeEndY + 15}" stroke="#904040" stroke-width="1.5"/>`;
  svg += `<text x="${mainX + 6}" y="${pipeEndY + 12}" font-size="6" fill="#c06060">DRAIN</text>`;

  return svg;
}

function drawElectricalConnections(blueprint: SVGBlueprint, ox: number, oy: number, totalW: number, totalH: number): string {
  let svg = "";
  const lines = blueprint.electrical_lines;
  if (!lines || lines.length === 0) return "";

  const mainX = ox - 25;
  const dbY = oy + 15;

  svg += `<rect x="${mainX - 10}" y="${dbY}" width="20" height="18" fill="${BG}" stroke="#c0a040" stroke-width="1" rx="1"/>`;
  svg += `<text x="${mainX}" y="${dbY + 8}" text-anchor="middle" font-size="6" font-weight="500" fill="#d0b050">DB</text>`;
  svg += `<text x="${mainX}" y="${dbY + 14}" text-anchor="middle" font-size="5" fill="#b09030">MAIN</text>`;

  const fc = blueprint.floors.length;
  for (let i = 0; i < fc; i++) {
    const brY = oy + (i + 0.5) * (totalH / fc);
    svg += `<line x1="${mainX}" y1="${dbY + 18}" x2="${mainX}" y2="${brY}" stroke="#c0a040" stroke-width="1.2"/>`;
    svg += `<line x1="${mainX}" y1="${brY}" x2="${ox}" y2="${brY}" stroke="#b09030" stroke-width="1" stroke-dasharray="4 3"/>`;
    svg += `<circle cx="${mainX}" cy="${brY}" r="2.5" fill="none" stroke="#d0b050" stroke-width="1"/>`;
    svg += `<text x="${mainX - 14}" y="${brY + 3}" font-size="6" fill="#b09030">F${i}</text>`;
  }
  return svg;
}

function drawParkingLevel(ox: number, oy: number, width: number): string {
  const w = width * S;
  const h = 50;
  const slotW = 25;
  const slots = Math.floor(w / (slotW + 4));

  let svg = `<g>
  ${drawWallRect(ox, oy, w, h, LINE, WALL)}
  <text x="${ox + 8}" y="${oy + 12}" font-size="8" font-weight="500" fill="${TXT}" letter-spacing="2">PARKING</text>`;
  for (let i = 0; i < Math.min(slots, 10); i++) {
    const sx = ox + 8 + i * (slotW + 4);
    svg += `<rect x="${sx}" y="${oy + 18}" width="${slotW}" height="${h - 26}" fill="none" stroke="${LINE_DIM}" stroke-width="0.6"/>`;
    svg += `<text x="${sx + slotW / 2}" y="${oy + h / 2 + 6}" text-anchor="middle" font-size="6" fill="${TXT_DIM}">P${i + 1}</text>`;
  }
  svg += `</g>`;
  return svg;
}

function drawTerrace(ox: number, oy: number, width: number, terrace: NonNullable<SVGBlueprint["terrace"]>): string {
  const w = width * S;
  const h = 42;
  return `<g>
  ${drawWallRect(ox, oy, w, h, LINE, WALL)}
  <line x1="${ox}" y1="${oy}" x2="${ox + w}" y2="${oy + h}" stroke="${LINE_DIM}" stroke-width="0.3" opacity="0.2"/>
  <line x1="${ox + w}" y1="${oy}" x2="${ox}" y2="${oy + h}" stroke="${LINE_DIM}" stroke-width="0.3" opacity="0.2"/>
  <text x="${ox + w / 2}" y="${oy + 15}" text-anchor="middle" font-size="9" font-weight="500" fill="${TXT}" letter-spacing="2">TERRACE</text>
  <text x="${ox + w / 2}" y="${oy + 27}" text-anchor="middle" font-size="7" fill="${TXT_DIM}">${terrace.area_sqft} sqft</text>
  <text x="${ox + w / 2}" y="${oy + 36}" text-anchor="middle" font-size="6" fill="${TXT_DIM}">Railing: ${terrace.has_railing ? "Yes" : "No"} | WP: ${terrace.water_proofing ? "Yes" : "No"}</text>
</g>`;
}

function drawWaterTank(x: number, y: number, tank: { id: string; capacity_litres: number; location: string }): string {
  const w = 45;
  const h = 30;
  return `<g>
  ${drawWallRect(x, y, w, h, LINE, 1.2)}
  <rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="none" stroke="${LINE_DIM}" stroke-width="0.4" rx="1"/>
  <text x="${x + w / 2}" y="${y + 10}" text-anchor="middle" font-size="7" font-weight="500" fill="${TXT}">TANK</text>
  <text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" font-size="6" fill="${TXT_DIM}">${tank.capacity_litres}L</text>
  <text x="${x + w / 2}" y="${y + 27}" text-anchor="middle" font-size="5" fill="${TXT_DIM}">${tank.location}</text>
</g>`;
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
  const bW = dims.width;
  const bD = dims.depth;
  const floorH = bD * S;

  const floorsToRender =
    selectedFloor >= 0
      ? blueprint.floors.filter((f) => f.floor === selectedFloor)
      : blueprint.floors;

  let extraR = 0, extraL = 0, extraB = 0;
  if (filter === "water_connections" || filter === "all") extraR = 70;
  if (filter === "electrical_connections" || filter === "all") extraL = 50;
  if (filter === "parking" || filter === "all") extraB += 70;
  if (filter === "terrace" || filter === "all") extraB += 55;
  if (filter === "water_tanks" || filter === "all") extraB += 45;

  const totalFloorH = floorsToRender.length * (floorH + FLOOR_GAP);
  const svgW = PAD * 2 + bW * S + extraR + extraL;
  const svgH = PAD * 2 + totalFloorH + extraB + 40;
  const baseOx = PAD + extraL;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background:${BG};font-family:'Courier New',monospace">`;

  svg += `<defs>
  <pattern id="bp-grid" width="14" height="14" patternUnits="userSpaceOnUse">
    <path d="M 14 0 L 0 0 0 14" fill="none" stroke="${GRID_COLOR}" stroke-width="0.5"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="url(#bp-grid)"/>`;

  svg += `<text x="${svgW / 2}" y="${22}" text-anchor="middle" font-size="11" font-weight="700" fill="${TXT}" letter-spacing="3" opacity="0.6">ARCHITECTURAL FLOOR PLAN</text>`;
  svg += `<line x1="${PAD}" y1="${28}" x2="${svgW - PAD}" y2="${28}" stroke="${LINE_DIM}" stroke-width="0.5" opacity="0.3"/>`;

  floorsToRender.forEach((floor, fIdx) => {
    const oy = PAD + 20 + fIdx * (floorH + FLOOR_GAP);
    const ox = baseOx;

    svg += `<text x="${ox - 5}" y="${oy - 12}" font-size="10" font-weight="700" fill="${TXT}" letter-spacing="2">${esc(floor.label.toUpperCase())}</text>`;
    svg += `<line x1="${ox - 5}" y1="${oy - 8}" x2="${ox + 60}" y2="${oy - 8}" stroke="${LINE_DIM}" stroke-width="0.5" opacity="0.4"/>`;

    svg += drawWallRect(ox - 1, oy - 1, bW * S + 2, floorH + 2, LINE, WALL);

    const corridor = floor.rooms.find((r) => r.type === "corridor");
    const corridorY = corridor ? corridor.y : bD / 2 - 2.5;
    const corridorH = corridor ? corridor.height : 5;

    let roomsToRender = floor.rooms;
    if (filter === "corridors") {
      roomsToRender = floor.rooms.filter((r) => r.type === "corridor");
    } else if (filter === "flats") {
      roomsToRender = floor.rooms.filter((r) => r.type !== "corridor");
    } else if (filter === "single_flat" && floor.flats && floor.flats.length > 0) {
      const flatIdx = selectedFlatIdx >= 0 ? selectedFlatIdx : 0;
      const flat = floor.flats[flatIdx];
      if (flat) {
        const ids = new Set(flat.rooms);
        roomsToRender = floor.rooms.filter((r) => ids.has(r.id));
      }
    } else if (filter === "parking") {
      roomsToRender = floor.rooms.filter((r) => r.type === "parking");
    }

    if (filter !== "parking" && filter !== "water_tanks" && filter !== "terrace") {
      roomsToRender.forEach((room) => {
        svg += drawRoom(room, ox, oy, room.type === "corridor");
      });

      if (filter === "all" || filter === "floors" || filter === "flats" || filter === "single_flat") {
        roomsToRender.forEach((room) => {
          svg += drawDoorsForRoom(room, corridorY, corridorH, ox, oy);
          svg += drawWindowsForRoom(room, bW, bD, ox, oy);
        });
      }

      const shaftX = bW * 0.15;
      if (filter === "all" || filter === "water_connections") {
        svg += drawPlumbingShaft(ox, oy, floorH, shaftX);
      }
      if (filter === "all" || filter === "electrical_connections") {
        svg += drawElectricalRiser(ox, oy, floorH, bW * 0.85);
      }

      if (floor.flats && floor.flats.length > 0 && (filter === "all" || filter === "flats" || filter === "floors")) {
        floor.flats.forEach((flat) => {
          const flatRooms = floor.rooms.filter((r) => flat.rooms.includes(r.id));
          if (flatRooms.length > 0) {
            const minX = Math.min(...flatRooms.map((r) => r.x));
            const maxX = Math.max(...flatRooms.map((r) => r.x + r.width));
            const minY = Math.min(...flatRooms.map((r) => r.y));
            const maxY = Math.max(...flatRooms.map((r) => r.y + r.height));
            const fx = ox + minX * S;
            const fy = oy + minY * S;
            const fw = (maxX - minX) * S;
            const fh = (maxY - minY) * S;
            svg += `<rect x="${fx - 1}" y="${fy - 1}" width="${fw + 2}" height="${fh + 2}" fill="none" stroke="${LINE_ACCENT}" stroke-width="0.6" stroke-dasharray="4 3" opacity="0.35"/>`;
            svg += `<text x="${fx + fw / 2}" y="${fy - 3}" text-anchor="middle" font-size="7" font-weight="600" fill="${LINE_ACCENT}" opacity="0.6">${esc(flat.label)}</text>`;
          }
        });
      }

      svg += dimLine(ox, oy + floorH + 2, ox + bW * S, oy + floorH + 2, `${bW.toFixed(0)}'`, 15, true);
      svg += dimLine(ox + bW * S + 2, oy, ox + bW * S + 2, oy + floorH, `${bD.toFixed(0)}'`, 20, false);
    }
  });

  let bottomY = PAD + 20 + floorsToRender.length * (floorH + FLOOR_GAP) + 10;
  const totalH = floorsToRender.length * (floorH + FLOOR_GAP);

  if (filter === "water_connections" || filter === "all") {
    svg += drawWaterConnections(blueprint, baseOx, PAD + 20, bW * S, totalH);
  }
  if (filter === "electrical_connections" || filter === "all") {
    svg += drawElectricalConnections(blueprint, baseOx, PAD + 20, bW * S, totalH);
  }
  if (filter === "parking" || filter === "all") {
    svg += drawParkingLevel(baseOx, bottomY, bW);
    bottomY += 70;
  }
  if (filter === "terrace" || filter === "all") {
    if (blueprint.terrace) {
      svg += drawTerrace(baseOx, bottomY, bW, blueprint.terrace);
      bottomY += 55;
    }
  }
  if (filter === "water_tanks" || filter === "all") {
    blueprint.water_tanks.forEach((tank, i) => {
      svg += drawWaterTank(baseOx + i * 55, bottomY, tank);
    });
  }

  svg += `<text x="${svgW / 2}" y="${svgH - 8}" text-anchor="middle" font-size="6" fill="${TXT_DIM}" letter-spacing="1" opacity="0.5">STRUCTURA.AI - ARCHITECTURAL BLUEPRINT</text>`;

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
    ctx.fillStyle = BG;
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
