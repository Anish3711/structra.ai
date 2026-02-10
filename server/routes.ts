import type { Express } from "express";
import { createServer, type Server } from "http";
import { api } from "@shared/routes";
import { DxfWriter } from "./lib/dxf";
import type { CalculationResult, Room, Wall, FloorPlan, RoomType, BuildingType } from "@shared/schema";
import { ROOM_TYPES } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/plan", async (req, res) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        const text = await response.text();
        res.status(response.status).json({ error: text });
        return;
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Python backend proxy error:", error);
      res.status(502).json({ error: "Backend service unavailable" });
    }
  });

  app.post(api.calculate.path, async (req, res) => {
    try {
      const input = api.calculate.input.parse(req.body);

      const totalArea = input.width * input.depth * input.floors;
      const baseRate = 1500;
      const locationFactor = input.location?.toLowerCase().includes("city") ? 1.2 : 1.0;

      const totalCost = Math.round(totalArea * baseRate * locationFactor);

      const materialsCost = Math.round(totalCost * 0.65);
      const laborCost = Math.round(totalCost * 0.35);

      const materials = {
        cement: Math.round(materialsCost * 0.16),
        steel: Math.round(materialsCost * 0.12),
        bricks: Math.round(materialsCost * 0.10),
        sand: Math.round(materialsCost * 0.08),
        aggregate: Math.round(materialsCost * 0.06),
        finishings: Math.round(materialsCost * 0.48),
      };

      const labor = {
        masons: Math.ceil(totalArea / 500),
        helpers: Math.ceil(totalArea / 250),
        carpenters: Math.ceil(totalArea / 1000),
        steelWorkers: Math.ceil(totalArea / 1000),
      };

      const timelineWeeks = Math.ceil(totalArea / 500) + 4;

      const result: CalculationResult = {
        totalCost,
        materialsCost,
        laborCost,
        timelineWeeks,
        materials,
        labor,
        costPerSqFt: Math.round(totalCost / totalArea),
      };

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Calculation failed" });
    }
  });

  app.post(api.analyze.path, async (req, res) => {
    try {
      res.json({
        summary: "Project analysis based on standard heuristics.",
        costReasoning: "Costs derived from standard market rates per square foot.",
        timelineJustification: "Timeline calculated based on total built-up area and standard labor productivity.",
        layoutRecommendations: "Consider maximizing natural light and ventilation.",
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Analysis failed" });
    }
  });

  app.post(api.generateBlueprint.path, async (req, res) => {
    const input = api.generateBlueprint.input.parse(req.body);
    const { width, depth, floors: numFloors, buildingType = 'house' } = input;
    const allFloors = generateFallbackBlueprint(width, depth, numFloors, buildingType as BuildingType);
    const groundFloor = allFloors[0];
    res.json({
      rooms: groundFloor.rooms,
      walls: groundFloor.walls,
      width,
      depth,
      floors: allFloors,
    });
  });

  app.post(api.exportDxf.path, async (req, res) => {
    const { rooms, width, depth, floors } = req.body;
    const dxf = new DxfWriter();
    const scale = 12;

    const floorsToExport = floors && Array.isArray(floors) && floors.length > 0 ? floors : [{ floor: 0, label: "Ground Floor", rooms, walls: [] }];

    floorsToExport.forEach((floor: any, floorIdx: number) => {
      const yOffset = floorIdx * (depth + 10) * scale;

      dxf.addRect(0, yOffset, width * scale, depth * scale, "BOUNDARY");
      dxf.addText(
        (width / 2) * scale,
        yOffset - 2 * scale,
        floor.label || `Floor ${floorIdx}`,
        18,
        "TEXT"
      );

      (floor.rooms || rooms).forEach((room: any) => {
        dxf.addRect(
          room.x * scale,
          yOffset + room.y * scale,
          room.width * scale,
          room.height * scale,
          "WALLS"
        );
        dxf.addText(
          (room.x + room.width / 2) * scale,
          yOffset + (room.y + room.height / 2) * scale,
          room.name,
          12,
          "TEXT"
        );
      });
    });

    const content = dxf.end();

    res.json({
      dxfContent: content,
      filename: `project_blueprint_${Date.now()}.dxf`
    });
  });

  return httpServer;
}

function generateFallbackBlueprint(
  width: number,
  depth: number,
  numFloors: number,
  buildingType: BuildingType
): FloorPlan[] {
  const allFloors: FloorPlan[] = [];
  const corridorWidth = Math.max(3, Math.min(4, depth * 0.12));
  const staircaseSize = Math.max(4, Math.min(6, Math.min(width, depth) * 0.2));
  const elevatorSize = Math.max(4, Math.min(5, Math.min(width, depth) * 0.15));
  const hasVerticalTransport = numFloors > 1;

  for (let f = 0; f < numFloors; f++) {
    const floorRooms: Room[] = [];
    const prefix = `f${f + 1}`;

    const walls: Wall[] = [
      { x1: 0, y1: 0, x2: width, y2: 0 },
      { x1: width, y1: 0, x2: width, y2: depth },
      { x1: width, y1: depth, x2: 0, y2: depth },
      { x1: 0, y1: depth, x2: 0, y2: 0 },
    ];

    const corridorY = (depth - corridorWidth) / 2;
    floorRooms.push({
      id: `${prefix}-corridor`,
      name: "Corridor",
      x: 0, y: corridorY,
      width: width,
      height: corridorWidth,
      type: "corridor",
    });

    let rightReserved = 0;

    if (hasVerticalTransport) {
      floorRooms.push({
        id: `${prefix}-stairs`,
        name: "Staircase",
        x: width - staircaseSize,
        y: depth - staircaseSize,
        width: staircaseSize,
        height: staircaseSize,
        type: "staircase",
      });
      floorRooms.push({
        id: `${prefix}-elevator`,
        name: "Elevator",
        x: width - staircaseSize - elevatorSize,
        y: depth - elevatorSize,
        width: elevatorSize,
        height: elevatorSize,
        type: "elevator",
      });
      rightReserved = staircaseSize + elevatorSize;
    }

    const topHeight = corridorY;
    const bottomY = corridorY + corridorWidth;
    const bottomHeight = depth - bottomY;
    const usableWidth = width - rightReserved;

    if (buildingType === 'apartment' || buildingType === 'mixed-use') {
      if (f === 0) {
        const lobbyW = usableWidth * 0.4;
        floorRooms.push(
          { id: `${prefix}-lobby`, name: "Lobby", x: 0, y: 0, width: lobbyW, height: topHeight, type: "lobby" },
          { id: `${prefix}-storage`, name: "Storage", x: lobbyW, y: 0, width: usableWidth - lobbyW, height: topHeight, type: "storage" },
          { id: `${prefix}-parking`, name: "Parking", x: 0, y: bottomY, width: usableWidth * 0.6, height: bottomHeight, type: "parking" },
          { id: `${prefix}-utility`, name: "Utility Room", x: usableWidth * 0.6, y: bottomY, width: usableWidth * 0.4, height: bottomHeight, type: "utility" }
        );
      } else {
        const unitW = usableWidth / 2;
        floorRooms.push(
          { id: `${prefix}-living1`, name: `Unit ${f}A - Living`, x: 0, y: 0, width: unitW * 0.6, height: topHeight, type: "living" },
          { id: `${prefix}-kitchen1`, name: `Unit ${f}A - Kitchen`, x: unitW * 0.6, y: 0, width: unitW * 0.4, height: topHeight, type: "kitchen" },
          { id: `${prefix}-bed1`, name: `Unit ${f}A - Bedroom`, x: 0, y: bottomY, width: unitW * 0.6, height: bottomHeight, type: "bedroom" },
          { id: `${prefix}-bath1`, name: `Unit ${f}A - Bath`, x: unitW * 0.6, y: bottomY, width: unitW * 0.4, height: bottomHeight, type: "bathroom" },
          { id: `${prefix}-living2`, name: `Unit ${f}B - Living`, x: unitW, y: 0, width: unitW * 0.6, height: topHeight, type: "living" },
          { id: `${prefix}-kitchen2`, name: `Unit ${f}B - Kitchen`, x: unitW + unitW * 0.6, y: 0, width: unitW * 0.4, height: topHeight, type: "kitchen" },
          { id: `${prefix}-bed2`, name: `Unit ${f}B - Bedroom`, x: unitW, y: bottomY, width: unitW * 0.6, height: bottomHeight, type: "bedroom" },
          { id: `${prefix}-bath2`, name: `Unit ${f}B - Bath`, x: unitW + unitW * 0.6, y: bottomY, width: unitW * 0.4, height: bottomHeight, type: "bathroom" }
        );
      }
    } else if (buildingType === 'commercial') {
      if (f === 0) {
        floorRooms.push(
          { id: `${prefix}-lobby`, name: "Lobby", x: 0, y: 0, width: usableWidth * 0.5, height: topHeight, type: "lobby" },
          { id: `${prefix}-reception`, name: "Reception", x: usableWidth * 0.5, y: 0, width: usableWidth * 0.5, height: topHeight, type: "other" },
          { id: `${prefix}-office1`, name: "Office 1", x: 0, y: bottomY, width: usableWidth * 0.5, height: bottomHeight, type: "office" },
          { id: `${prefix}-bath`, name: "Restroom", x: usableWidth * 0.5, y: bottomY, width: usableWidth * 0.5, height: bottomHeight, type: "bathroom" }
        );
      } else {
        const roomW = usableWidth / 3;
        floorRooms.push(
          { id: `${prefix}-office1`, name: `Office ${f * 3 - 2}`, x: 0, y: 0, width: roomW, height: topHeight, type: "office" },
          { id: `${prefix}-office2`, name: `Office ${f * 3 - 1}`, x: roomW, y: 0, width: roomW, height: topHeight, type: "office" },
          { id: `${prefix}-office3`, name: `Office ${f * 3}`, x: roomW * 2, y: 0, width: roomW, height: topHeight, type: "office" },
          { id: `${prefix}-bath`, name: `Restroom`, x: 0, y: bottomY, width: usableWidth * 0.3, height: bottomHeight, type: "bathroom" },
          { id: `${prefix}-utility`, name: "Utility", x: usableWidth * 0.3, y: bottomY, width: usableWidth * 0.3, height: bottomHeight, type: "utility" },
          { id: `${prefix}-other`, name: "Meeting Room", x: usableWidth * 0.6, y: bottomY, width: usableWidth * 0.4, height: bottomHeight, type: "other" }
        );
      }
    } else {
      if (f === 0) {
        const livingW = usableWidth * 0.45;
        const kitchenW = usableWidth * 0.25;
        const diningW = usableWidth - livingW - kitchenW;
        floorRooms.push(
          { id: `${prefix}-living`, name: "Living Room", x: 0, y: 0, width: livingW, height: topHeight, type: "living" },
          { id: `${prefix}-dining`, name: "Dining Room", x: livingW, y: 0, width: diningW, height: topHeight, type: "dining" },
          { id: `${prefix}-kitchen`, name: "Kitchen", x: livingW + diningW, y: 0, width: kitchenW, height: topHeight, type: "kitchen" },
          { id: `${prefix}-master`, name: "Master Bedroom", x: 0, y: bottomY, width: usableWidth * 0.4, height: bottomHeight, type: "bedroom" },
          { id: `${prefix}-bath`, name: "Bathroom", x: usableWidth * 0.4, y: bottomY, width: usableWidth * 0.25, height: bottomHeight, type: "bathroom" },
          { id: `${prefix}-laundry`, name: "Laundry", x: usableWidth * 0.65, y: bottomY, width: usableWidth * 0.35, height: bottomHeight, type: "laundry" }
        );
      } else {
        const roomW = usableWidth / 2;
        floorRooms.push(
          { id: `${prefix}-bed1`, name: `Bedroom ${f * 2}`, x: 0, y: 0, width: roomW, height: topHeight, type: "bedroom" },
          { id: `${prefix}-bed2`, name: `Bedroom ${f * 2 + 1}`, x: roomW, y: 0, width: roomW, height: topHeight, type: "bedroom" },
          { id: `${prefix}-bath`, name: `Bathroom`, x: 0, y: bottomY, width: usableWidth * 0.35, height: bottomHeight, type: "bathroom" },
          { id: `${prefix}-office`, name: f === numFloors - 1 ? "Study" : "Guest Room", x: usableWidth * 0.35, y: bottomY, width: usableWidth * 0.35, height: bottomHeight, type: f === numFloors - 1 ? "office" : "bedroom" },
          { id: `${prefix}-balcony`, name: "Balcony", x: usableWidth * 0.7, y: bottomY, width: usableWidth * 0.3, height: bottomHeight, type: "balcony" }
        );
      }
    }

    allFloors.push({ floor: f, label: f === 0 ? "Ground Floor" : `Floor ${f}`, rooms: floorRooms, walls });
  }

  return allFloors;
}
