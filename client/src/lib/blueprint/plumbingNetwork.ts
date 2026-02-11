import type { SVGFloor, SVGRoom } from "../blueprint-svg";

interface PipeNode {
  id: string;
  x: number;
  y: number;
  type: "tank" | "riser" | "tee" | "branch" | "endpoint";
  label?: string;
}

interface PipeSegment {
  from: PipeNode;
  to: PipeNode;
  type: "main" | "riser" | "branch" | "lateral";
}

interface PlumbingNetworkData {
  nodes: PipeNode[];
  segments: PipeSegment[];
}

const PIPE_MAIN = "#4a90d9";
const PIPE_BRANCH = "#3a7ab8";
const PIPE_LATERAL = "#2d6090";
const PIPE_DRAIN = "#8b4040";
const JOINT_COLOR = "#6ab7e8";
const LABEL_COLOR = "#5a9ab5";
const ARROW_COLOR = "#4a90d9";

function findRoomsOfType(floor: SVGFloor, types: string[]): SVGRoom[] {
  return floor.rooms.filter((r) => types.includes(r.type));
}

function buildFloorNetwork(
  floor: SVGFloor,
  floorIdx: number,
  riserX: number,
  ox: number,
  oy: number,
  S: number,
  floorH: number
): { nodes: PipeNode[]; segments: PipeSegment[] } {
  const nodes: PipeNode[] = [];
  const segments: PipeSegment[] = [];

  const corridor = floor.rooms.find((r) => r.type === "corridor");
  const corridorY = corridor ? corridor.y : 0;
  const corridorH = corridor ? corridor.height : 5;
  const corridorCenterY = corridorY + corridorH / 2;

  const riserNode: PipeNode = {
    id: `f${floorIdx}-riser`,
    x: ox + riserX * S,
    y: oy + corridorCenterY * S,
    type: "riser",
    label: `F${floorIdx}`,
  };
  nodes.push(riserNode);

  const bathrooms = findRoomsOfType(floor, ["bathroom"]);
  const kitchens = findRoomsOfType(floor, ["kitchen"]);
  const wetRooms = [...bathrooms, ...kitchens];

  if (wetRooms.length === 0) return { nodes, segments };

  const sortedRooms = [...wetRooms].sort((a, b) => a.x - b.x);

  const leftMost = Math.min(riserX, ...sortedRooms.map((r) => r.x));
  const rightMost = Math.max(
    riserX,
    ...sortedRooms.map((r) => r.x + r.width)
  );

  const branchY = oy + corridorCenterY * S;
  const branchLeft: PipeNode = {
    id: `f${floorIdx}-branch-l`,
    x: ox + leftMost * S,
    y: branchY,
    type: "tee",
  };
  const branchRight: PipeNode = {
    id: `f${floorIdx}-branch-r`,
    x: ox + rightMost * S,
    y: branchY,
    type: "tee",
  };
  nodes.push(branchLeft, branchRight);

  segments.push({
    from: riserNode,
    to: branchLeft,
    type: "branch",
  });
  segments.push({
    from: riserNode,
    to: branchRight,
    type: "branch",
  });

  const flats = floor.flats || [];

  sortedRooms.forEach((room, ri) => {
    const roomCx = ox + (room.x + room.width / 2) * S;
    const roomCy = oy + (room.y + room.height / 2) * S;

    const teeOnBranch: PipeNode = {
      id: `f${floorIdx}-tee-${room.id}`,
      x: roomCx,
      y: branchY,
      type: "tee",
    };
    nodes.push(teeOnBranch);

    const endpoint: PipeNode = {
      id: `f${floorIdx}-ep-${room.id}`,
      x: roomCx,
      y: roomCy,
      type: "endpoint",
      label: room.type === "bathroom" ? "WC" : "K",
    };
    nodes.push(endpoint);

    segments.push({
      from: teeOnBranch,
      to: endpoint,
      type: "lateral",
    });
  });

  return { nodes, segments };
}

export function generatePlumbingNetwork(
  floors: SVGFloor[],
  buildingWidth: number,
  buildingDepth: number,
  ox: number,
  oyStart: number,
  S: number,
  floorH: number,
  floorGap: number
): string {
  const riserX = buildingWidth * 0.15;
  const animId = `plumb-flow-${Date.now()}`;

  let svg = `<g class="plumbing-network">`;

  svg += `<defs>
    <marker id="plumb-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 6 3 L 0 6 z" fill="${ARROW_COLOR}" opacity="0.7"/>
    </marker>
    <style>
      @keyframes waterFlow {
        to { stroke-dashoffset: -30; }
      }
      .pipe-flow {
        animation: waterFlow 2s linear infinite;
      }
      .pipe-flow-fast {
        animation: waterFlow 1.2s linear infinite;
      }
    </style>
  </defs>`;

  const tankW = 40;
  const tankH = 24;
  const tankX = ox + riserX * S - tankW / 2;
  const tankY = oyStart - 50;

  svg += `<g class="overhead-tank">
    <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" fill="none" stroke="${PIPE_MAIN}" stroke-width="1.5" rx="2"/>
    <rect x="${tankX + 2}" y="${tankY + 2}" width="${tankW - 4}" height="${tankH - 4}" fill="${PIPE_MAIN}" opacity="0.08" rx="1"/>
    <line x1="${tankX + 5}" y1="${tankY + tankH * 0.4}" x2="${tankX + tankW - 5}" y2="${tankY + tankH * 0.4}" stroke="${PIPE_MAIN}" stroke-width="0.5" opacity="0.3"/>
    <line x1="${tankX + 5}" y1="${tankY + tankH * 0.6}" x2="${tankX + tankW - 5}" y2="${tankY + tankH * 0.6}" stroke="${PIPE_MAIN}" stroke-width="0.5" opacity="0.3"/>
    <text x="${tankX + tankW / 2}" y="${tankY + 10}" text-anchor="middle" font-size="7" font-weight="600" fill="${JOINT_COLOR}" letter-spacing="1">OHT</text>
    <text x="${tankX + tankW / 2}" y="${tankY + 19}" text-anchor="middle" font-size="5" fill="${LABEL_COLOR}">OVERHEAD TANK</text>
  </g>`;

  const riserTopY = tankY + tankH;
  const lastFloorIdx = floors.length - 1;
  const riserBottomY =
    oyStart + lastFloorIdx * (floorH + floorGap) + floorH + 20;
  const riserScreenX = ox + riserX * S;

  svg += `<line x1="${riserScreenX}" y1="${riserTopY}" x2="${riserScreenX}" y2="${riserBottomY}"
    stroke="${PIPE_MAIN}" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`;

  svg += `<line x1="${riserScreenX}" y1="${riserTopY}" x2="${riserScreenX}" y2="${riserBottomY}"
    stroke="${JOINT_COLOR}" stroke-width="2.5" stroke-linecap="round"
    stroke-dasharray="8 12" class="pipe-flow" opacity="0.5"/>`;

  svg += `<text x="${riserScreenX + 8}" y="${riserTopY + 15}" font-size="6" fill="${LABEL_COLOR}" letter-spacing="1" opacity="0.7" transform="rotate(90, ${riserScreenX + 8}, ${riserTopY + 15})">SUPPLY RISER</text>`;

  const jointR = 3;
  svg += `<circle cx="${riserScreenX}" cy="${riserTopY}" r="${jointR}" fill="${PIPE_MAIN}" stroke="${JOINT_COLOR}" stroke-width="1"/>`;

  floors.forEach((floor, fIdx) => {
    const oy = oyStart + fIdx * (floorH + floorGap);
    const network = buildFloorNetwork(
      floor,
      fIdx,
      riserX,
      ox,
      oy,
      S,
      floorH
    );

    const riserJointY = oy + (floor.rooms.find((r) => r.type === "corridor")
      ? (floor.rooms.find((r) => r.type === "corridor")!.y +
          floor.rooms.find((r) => r.type === "corridor")!.height / 2) *
        S
      : floorH / 2);

    svg += `<circle cx="${riserScreenX}" cy="${riserJointY}" r="${jointR + 1}" fill="none" stroke="${JOINT_COLOR}" stroke-width="1.2"/>`;
    svg += `<circle cx="${riserScreenX}" cy="${riserJointY}" r="2" fill="${JOINT_COLOR}"/>`;

    network.segments.forEach((seg) => {
      const strokeColor =
        seg.type === "branch"
          ? PIPE_BRANCH
          : seg.type === "lateral"
          ? PIPE_LATERAL
          : PIPE_MAIN;
      const strokeW = seg.type === "branch" ? 1.8 : seg.type === "lateral" ? 1.2 : 2;

      if (seg.from.y === seg.to.y) {
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.8"/>`;
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${JOINT_COLOR}" stroke-width="${strokeW}" stroke-linecap="round"
          stroke-dasharray="6 10" class="pipe-flow" opacity="0.35"/>`;
      } else if (seg.from.x === seg.to.x) {
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.8"/>`;
        svg += `<line x1="${seg.from.x}" y1="${seg.from.y}" x2="${seg.to.x}" y2="${seg.to.y}"
          stroke="${JOINT_COLOR}" stroke-width="${strokeW}" stroke-linecap="round"
          stroke-dasharray="6 10" class="pipe-flow-fast" opacity="0.35"/>`;
      } else {
        const midY = seg.from.y;
        svg += `<path d="M ${seg.from.x} ${seg.from.y} L ${seg.to.x} ${midY} L ${seg.to.x} ${seg.to.y}"
          fill="none" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
        svg += `<path d="M ${seg.from.x} ${seg.from.y} L ${seg.to.x} ${midY} L ${seg.to.x} ${seg.to.y}"
          fill="none" stroke="${JOINT_COLOR}" stroke-width="${strokeW}" stroke-linecap="round"
          stroke-dasharray="6 10" class="pipe-flow" opacity="0.35"/>`;
      }
    });

    network.nodes.forEach((node) => {
      if (node.type === "tee") {
        svg += `<circle cx="${node.x}" cy="${node.y}" r="2.5" fill="none" stroke="${JOINT_COLOR}" stroke-width="1" opacity="0.8"/>`;
        svg += `<circle cx="${node.x}" cy="${node.y}" r="1" fill="${JOINT_COLOR}" opacity="0.8"/>`;
      } else if (node.type === "endpoint") {
        svg += `<rect x="${node.x - 5}" y="${node.y - 5}" width="10" height="10" fill="none" stroke="${PIPE_BRANCH}" stroke-width="0.8" rx="1.5" opacity="0.7"/>`;
        svg += `<circle cx="${node.x}" cy="${node.y}" r="2" fill="${JOINT_COLOR}" opacity="0.6"/>`;
        if (node.label) {
          svg += `<text x="${node.x}" y="${node.y + 12}" text-anchor="middle" font-size="5" fill="${LABEL_COLOR}" opacity="0.7">${node.label}</text>`;
        }
      }
    });
  });

  const drainY = riserBottomY;
  svg += `<line x1="${riserScreenX}" y1="${riserBottomY - 10}" x2="${riserScreenX}" y2="${drainY + 15}"
    stroke="${PIPE_DRAIN}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
  svg += `<line x1="${riserScreenX}" y1="${riserBottomY - 10}" x2="${riserScreenX}" y2="${drainY + 15}"
    stroke="#c06060" stroke-width="2" stroke-dasharray="5 8" class="pipe-flow" opacity="0.3"/>`;
  svg += `<rect x="${riserScreenX - 12}" y="${drainY + 10}" width="24" height="14" fill="none" stroke="${PIPE_DRAIN}" stroke-width="1" rx="2"/>`;
  svg += `<text x="${riserScreenX}" y="${drainY + 20}" text-anchor="middle" font-size="5" fill="#c06060" font-weight="500">DRAIN</text>`;

  svg += `<circle cx="${riserScreenX}" cy="${riserBottomY}" r="${jointR}" fill="${PIPE_DRAIN}" stroke="#c06060" stroke-width="1"/>`;

  svg += `</g>`;
  return svg;
}
