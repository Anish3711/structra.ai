import type { SVGFloor, SVGRoom } from "../blueprint-svg";

interface ElecNode {
  id: string;
  x: number;
  y: number;
  type: "meter" | "riser" | "db" | "switchboard" | "endpoint";
  label?: string;
}

interface WireSegment {
  from: ElecNode;
  to: ElecNode;
  type: "main" | "riser" | "branch" | "lateral";
}

const WIRE_MAIN = "#d4a030";
const WIRE_BRANCH = "#c09028";
const WIRE_LATERAL = "#a07820";
const PANEL_COLOR = "#e0b840";
const NODE_COLOR = "#d4a030";
const ELEC_LABEL = "#b09030";

function findAllRoomsInFlat(
  floor: SVGFloor,
  flatRoomIds: string[]
): SVGRoom[] {
  const idSet = new Set(flatRoomIds);
  return floor.rooms.filter((r) => idSet.has(r.id));
}

function buildFloorElecNetwork(
  floor: SVGFloor,
  floorIdx: number,
  riserX: number,
  ox: number,
  oy: number,
  S: number,
  floorH: number
): { nodes: ElecNode[]; segments: WireSegment[] } {
  const nodes: ElecNode[] = [];
  const segments: WireSegment[] = [];

  const corridor = floor.rooms.find((r) => r.type === "corridor");
  const corridorY = corridor ? corridor.y : 0;
  const corridorH = corridor ? corridor.height : 5;
  const corridorCenterY = corridorY + corridorH / 2;

  const dbNode: ElecNode = {
    id: `f${floorIdx}-db`,
    x: ox + riserX * S,
    y: oy + corridorCenterY * S,
    type: "db",
    label: `DB-F${floorIdx}`,
  };
  nodes.push(dbNode);

  const flats = floor.flats || [];

  if (flats.length > 0) {
    flats.forEach((flat, fi) => {
      const flatRooms = findAllRoomsInFlat(floor, flat.rooms);
      if (flatRooms.length === 0) return;

      const livingRoom =
        flatRooms.find((r) => r.type === "living") || flatRooms[0];
      const sbX = ox + (livingRoom.x + livingRoom.width * 0.8) * S;
      const sbY = oy + (livingRoom.y + livingRoom.height * 0.3) * S;

      const sbNode: ElecNode = {
        id: `f${floorIdx}-sb-${fi}`,
        x: sbX,
        y: sbY,
        type: "switchboard",
        label: `SB-${fi + 1}`,
      };
      nodes.push(sbNode);

      segments.push({ from: dbNode, to: sbNode, type: "branch" });

      flatRooms.forEach((room) => {
        if (room.type === "corridor" || room.type === "elevator" || room.type === "staircase") return;

        const epX = ox + (room.x + room.width / 2) * S;
        const epY = oy + (room.y + room.height / 2) * S;

        const epNode: ElecNode = {
          id: `f${floorIdx}-ep-${room.id}`,
          x: epX,
          y: epY,
          type: "endpoint",
          label: room.type === "bedroom" ? "L" : room.type === "kitchen" ? "P" : room.type === "bathroom" ? "E" : "L",
        };
        nodes.push(epNode);

        segments.push({ from: sbNode, to: epNode, type: "lateral" });
      });
    });
  } else {
    const habitable = floor.rooms.filter(
      (r) =>
        r.type !== "corridor" &&
        r.type !== "elevator" &&
        r.type !== "staircase"
    );
    habitable.forEach((room) => {
      const epX = ox + (room.x + room.width / 2) * S;
      const epY = oy + (room.y + room.height / 2) * S;

      const epNode: ElecNode = {
        id: `f${floorIdx}-ep-${room.id}`,
        x: epX,
        y: epY,
        type: "endpoint",
        label: "L",
      };
      nodes.push(epNode);
      segments.push({ from: dbNode, to: epNode, type: "lateral" });
    });
  }

  return { nodes, segments };
}

export function generateElectricalNetwork(
  floors: SVGFloor[],
  buildingWidth: number,
  buildingDepth: number,
  ox: number,
  oyStart: number,
  S: number,
  floorH: number,
  floorGap: number
): string {
  const riserX = buildingWidth * 0.85;
  const riserScreenX = ox + riserX * S;

  let svg = `<g class="electrical-network">`;

  svg += `<defs>
    <marker id="elec-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
      <path d="M 0 0 L 6 3 L 0 6 z" fill="${NODE_COLOR}" opacity="0.6"/>
    </marker>
    <style>
      @keyframes currentFlow {
        to { stroke-dashoffset: -20; }
      }
      .wire-flow {
        animation: currentFlow 0.8s linear infinite;
      }
      .wire-flow-slow {
        animation: currentFlow 1.5s linear infinite;
      }
    </style>
  </defs>`;

  const meterW = 30;
  const meterH = 36;
  const lastFloorIdx = floors.length - 1;
  const meterY = oyStart + lastFloorIdx * (floorH + floorGap) + floorH + 25;
  const meterX = riserScreenX - meterW / 2;

  svg += `<g class="main-meter">
    <rect x="${meterX}" y="${meterY}" width="${meterW}" height="${meterH}" fill="none" stroke="${WIRE_MAIN}" stroke-width="1.5" rx="2"/>
    <rect x="${meterX + 2}" y="${meterY + 2}" width="${meterW - 4}" height="${meterH - 4}" fill="${WIRE_MAIN}" opacity="0.06" rx="1"/>
    <line x1="${meterX + 4}" y1="${meterY + meterH * 0.5}" x2="${meterX + meterW - 4}" y2="${meterY + meterH * 0.5}" stroke="${WIRE_MAIN}" stroke-width="0.5" opacity="0.3"/>
    <text x="${meterX + meterW / 2}" y="${meterY + 12}" text-anchor="middle" font-size="6" font-weight="600" fill="${PANEL_COLOR}" letter-spacing="0.5">MAIN</text>
    <text x="${meterX + meterW / 2}" y="${meterY + 22}" text-anchor="middle" font-size="6" font-weight="600" fill="${PANEL_COLOR}" letter-spacing="0.5">METER</text>
    <text x="${meterX + meterW / 2}" y="${meterY + 32}" text-anchor="middle" font-size="5" fill="${ELEC_LABEL}">EB SUPPLY</text>
    <circle cx="${meterX + 6}" cy="${meterY + meterH * 0.35}" r="2" fill="none" stroke="${PANEL_COLOR}" stroke-width="0.6"/>
    <circle cx="${meterX + meterW - 6}" cy="${meterY + meterH * 0.35}" r="2" fill="none" stroke="${PANEL_COLOR}" stroke-width="0.6"/>
  </g>`;

  const riserTopY = oyStart - 5;
  const riserBottomY = meterY;

  svg += `<line x1="${riserScreenX}" y1="${riserTopY}" x2="${riserScreenX}" y2="${riserBottomY}"
    stroke="${WIRE_MAIN}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  svg += `<line x1="${riserScreenX}" y1="${riserTopY}" x2="${riserScreenX}" y2="${riserBottomY}"
    stroke="${PANEL_COLOR}" stroke-width="2" stroke-linecap="round"
    stroke-dasharray="4 8" class="wire-flow" opacity="0.4"/>`;

  svg += `<text x="${riserScreenX - 8}" y="${riserTopY + 15}" font-size="6" fill="${ELEC_LABEL}" letter-spacing="1" opacity="0.7" transform="rotate(-90, ${riserScreenX - 8}, ${riserTopY + 15})">ELEC RISER</text>`;

  floors.forEach((floor, fIdx) => {
    const oy = oyStart + fIdx * (floorH + floorGap);
    const network = buildFloorElecNetwork(
      floor,
      fIdx,
      riserX,
      ox,
      oy,
      S,
      floorH
    );

    const corridor = floor.rooms.find((r) => r.type === "corridor");
    const riserJointY = corridor
      ? oy + (corridor.y + corridor.height / 2) * S
      : oy + floorH / 2;

    svg += `<rect x="${riserScreenX - 8}" y="${riserJointY - 8}" width="16" height="16" fill="none" stroke="${PANEL_COLOR}" stroke-width="1.2" rx="1.5"/>`;
    svg += `<line x1="${riserScreenX - 4}" y1="${riserJointY}" x2="${riserScreenX + 4}" y2="${riserJointY}" stroke="${PANEL_COLOR}" stroke-width="0.8"/>`;
    svg += `<line x1="${riserScreenX}" y1="${riserJointY - 4}" x2="${riserScreenX}" y2="${riserJointY + 4}" stroke="${PANEL_COLOR}" stroke-width="0.8"/>`;

    network.segments.forEach((seg) => {
      const strokeColor =
        seg.type === "branch"
          ? WIRE_BRANCH
          : seg.type === "lateral"
          ? WIRE_LATERAL
          : WIRE_MAIN;
      const strokeW =
        seg.type === "branch" ? 1.4 : seg.type === "lateral" ? 0.8 : 2;
      const animClass =
        seg.type === "branch" ? "wire-flow" : "wire-flow-slow";

      const dx = seg.to.x - seg.from.x;
      const dy = seg.to.y - seg.from.y;

      if (Math.abs(dy) < 2) {
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.7"/>`;
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${PANEL_COLOR}" stroke-width="${strokeW}"
          stroke-dasharray="3 6" class="${animClass}" opacity="0.3"/>`;
      } else if (Math.abs(dx) < 2) {
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.7"/>`;
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${PANEL_COLOR}" stroke-width="${strokeW}"
          stroke-dasharray="3 6" class="${animClass}" opacity="0.3"/>`;
      } else {
        const midX = seg.to.x;
        const midY = seg.from.y;
        svg += `<path d="M ${seg.from.x} ${seg.from.y} L ${midX} ${midY} L ${seg.to.x} ${seg.to.y}"
          fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`;
        svg += `<path d="M ${seg.from.x} ${seg.from.y} L ${midX} ${midY} L ${seg.to.x} ${seg.to.y}"
          fill="none" stroke="${PANEL_COLOR}" stroke-width="${strokeW}"
          stroke-dasharray="3 6" class="${animClass}" opacity="0.3"/>`;

        svg += `<circle cx="${midX}" cy="${midY}" r="1.5" fill="${NODE_COLOR}" opacity="0.5"/>`;
      }
    });

    network.nodes.forEach((node) => {
      if (node.type === "db") {
        svg += `<rect x="${node.x - 7}" y="${node.y - 7}" width="14" height="14" fill="none" stroke="${PANEL_COLOR}" stroke-width="1" rx="1.5" opacity="0.8"/>`;
        svg += `<text x="${node.x}" y="${node.y + 2}" text-anchor="middle" font-size="5" fill="${PANEL_COLOR}" font-weight="600" opacity="0.9">DB</text>`;
        if (node.label) {
          svg += `<text x="${node.x}" y="${node.y + 18}" text-anchor="middle" font-size="5" fill="${ELEC_LABEL}" opacity="0.7">${node.label}</text>`;
        }
      } else if (node.type === "switchboard") {
        svg += `<rect x="${node.x - 5}" y="${node.y - 5}" width="10" height="10" fill="none" stroke="${WIRE_BRANCH}" stroke-width="0.8" rx="1" opacity="0.7"/>`;
        svg += `<line x1="${node.x - 3}" y1="${node.y}" x2="${node.x + 3}" y2="${node.y}" stroke="${WIRE_BRANCH}" stroke-width="0.5" opacity="0.6"/>`;
        if (node.label) {
          svg += `<text x="${node.x}" y="${node.y + 12}" text-anchor="middle" font-size="4.5" fill="${ELEC_LABEL}" opacity="0.7">${node.label}</text>`;
        }
      } else if (node.type === "endpoint") {
        svg += `<circle cx="${node.x}" cy="${node.y}" r="2" fill="none" stroke="${WIRE_LATERAL}" stroke-width="0.6" opacity="0.6"/>`;
        svg += `<circle cx="${node.x}" cy="${node.y}" r="0.8" fill="${PANEL_COLOR}" opacity="0.5"/>`;
      }
    });
  });

  svg += `</g>`;
  return svg;
}
