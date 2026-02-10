import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { DxfWriter } from "./lib/dxf";
import { openai } from "./replit_integrations/image/client";
import type { CalculationResult, Room, Wall, FloorPlan, RoomType, BuildingType } from "@shared/schema";
import { ROOM_TYPES } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Calculate Endpoint
  app.post(api.calculate.path, async (req, res) => {
    try {
      const input = api.calculate.input.parse(req.body);
      
      const totalArea = input.width * input.depth * input.floors;
      const baseRate = 1500; // $1500 per sq unit (heuristic)
      const locationFactor = input.location?.toLowerCase().includes("city") ? 1.2 : 1.0;
      
      const totalCost = Math.round(totalArea * baseRate * locationFactor);
      
      // Breakdown ratios
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

      const timelineWeeks = Math.ceil(totalArea / 500) + 4; // Base + complexity

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

  // Analyze Endpoint (AI)
  app.post(api.analyze.path, async (req, res) => {
    try {
      const { project, calculations } = req.body;

      const prompt = `
        You are an expert construction planner (IBM Granite persona).
        Analyze the following project:
        - Size: ${project.width}x${project.depth} ft, ${project.floors} floors.
        - Location: ${project.location || "Generic"}.
        - Budget: ${project.budget ? '$'+project.budget : 'Not specified'}.
        - Est. Cost: $${calculations.totalCost}.
        - Timeline: ${calculations.timelineWeeks} weeks.

        Provide a structured analysis in JSON format with these fields:
        - summary: A professional executive summary (string).
        - costReasoning: Why the cost is what it is (string).
        - timelineJustification: Explanation of the timeline phases (string).
        - layoutRecommendations: Suggestions for room layout based on dimensions (string).

        IMPORTANT: Ensure all fields are strings, even if they contain multiple points.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const rawAnalysis = JSON.parse(response.choices[0].message.content || "{}");
      
      // Ensure fields are strings to match Zod schema expectations on frontend
      const analysis = {
        summary: typeof rawAnalysis.summary === 'object' ? JSON.stringify(rawAnalysis.summary) : String(rawAnalysis.summary || ""),
        costReasoning: typeof rawAnalysis.costReasoning === 'object' ? JSON.stringify(rawAnalysis.costReasoning) : String(rawAnalysis.costReasoning || ""),
        timelineJustification: typeof rawAnalysis.timelineJustification === 'object' ? JSON.stringify(rawAnalysis.timelineJustification) : String(rawAnalysis.timelineJustification || ""),
        layoutRecommendations: typeof rawAnalysis.layoutRecommendations === 'object' ? JSON.stringify(rawAnalysis.layoutRecommendations) : String(rawAnalysis.layoutRecommendations || ""),
      };

      res.json(analysis);

    } catch (error) {
      console.error(error);
      // Fallback if AI fails
      res.json({
        summary: "Project analysis based on standard heuristics.",
        costReasoning: "Costs derived from standard market rates per square foot.",
        timelineJustification: "Timeline calculated based on total built-up area and standard labor productivity.",
        layoutRecommendations: "Consider maximizing natural light and ventilation.",
      });
    }
  });

  // Blueprint Generation Endpoint (AI-powered)
  app.post(api.generateBlueprint.path, async (req, res) => {
    const input = api.generateBlueprint.input.parse(req.body);
    const { width, depth, floors: numFloors, buildingType = 'house', location, budget } = input;

    try {
      const allFloors = await generateAIBlueprint(width, depth, numFloors, buildingType as BuildingType, location || undefined, budget || undefined);
      const groundFloor = allFloors[0];
      res.json({
        rooms: groundFloor.rooms,
        walls: groundFloor.walls,
        width,
        depth,
        floors: allFloors,
      });
    } catch (error) {
      console.error("AI blueprint generation failed, using fallback:", error);
      const allFloors = generateFallbackBlueprint(width, depth, numFloors, buildingType as BuildingType);
      const groundFloor = allFloors[0];
      res.json({
        rooms: groundFloor.rooms,
        walls: groundFloor.walls,
        width,
        depth,
        floors: allFloors,
      });
    }
  });

  // DXF Export Endpoint
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

async function generateAIBlueprint(
  width: number,
  depth: number,
  numFloors: number,
  buildingType: BuildingType,
  location?: string,
  budget?: number
): Promise<FloorPlan[]> {
  const roomTypesList = ROOM_TYPES.join(', ');

  const buildingContext: Record<string, string> = {
    house: `A residential house. Ground floor: living room, kitchen, dining, bathroom, corridor. Upper floors: bedrooms, bathrooms, study/office. Include a lobby/entrance on ground floor.`,
    apartment: `A multi-unit apartment building. Each floor has multiple apartment units along a central corridor. Include elevator and staircase. Ground floor may have lobby, parking, or storage. Each unit has bedroom(s), living, kitchen, bathroom.`,
    commercial: `A commercial/office building. Ground floor: lobby, reception. Upper floors: offices, meeting rooms, utility rooms. Include elevator, staircase, corridors, and bathrooms on each floor.`,
    'mixed-use': `A mixed-use building. Ground floor: commercial/retail spaces, lobby. Upper floors: residential apartments with bedrooms, living rooms, kitchens. Include elevator, staircase, corridors.`,
  };

  const prompt = `You are an expert architect designing floor plans. Generate a detailed, realistic floor plan for a building with these specifications:

BUILDING SPECS:
- Type: ${buildingType} (${buildingContext[buildingType]})
- Dimensions: ${width} ft wide × ${depth} ft deep
- Number of floors: ${numFloors}
- Location: ${location || 'Generic'}
${budget ? `- Budget: $${budget}` : ''}

RULES (CRITICAL - follow exactly):
1. All rooms must fit within the building boundary (0,0) to (${width},${depth}). No room can extend beyond these limits.
2. Room x + room width must be <= ${width}. Room y + room height must be <= ${depth}.
3. Rooms on the same floor must NOT overlap each other.
4. Each floor must have outer boundary walls.
5. For multi-floor buildings (${numFloors} > 1): include at least one staircase on every floor AND at least one elevator on every floor. Staircases and elevators must be in the same position on all floors.
6. Include corridors connecting rooms, especially in apartments/commercial.
7. Room minimum size: 4ft × 4ft. Corridor minimum width: 3ft.
8. Use realistic proportions. Bedrooms: ~10-15ft, Bathrooms: ~5-8ft, Kitchen: ~8-12ft, Living: ~12-20ft.
9. Ground floor of apartments/commercial should have a lobby.
10. Valid room types: ${roomTypesList}

RESPOND WITH ONLY valid JSON in this exact format:
{
  "floors": [
    {
      "floor": 0,
      "label": "Ground Floor",
      "rooms": [
        { "id": "f1-room1", "name": "Living Room", "x": 0, "y": 0, "width": 15, "height": 12, "type": "living" },
        ...more rooms
      ],
      "walls": [
        { "x1": 0, "y1": 0, "x2": ${width}, "y2": 0 },
        { "x1": ${width}, "y1": 0, "x2": ${width}, "y2": ${depth} },
        { "x1": ${width}, "y1": ${depth}, "x2": 0, "y2": ${depth} },
        { "x1": 0, "y1": ${depth}, "x2": 0, "y2": 0 }
      ]
    }
  ]
}

Generate ${numFloors} floor(s). Use id format "f{floorNum}-{roomname}". Make it architecturally sound and realistic.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  const floors: FloorPlan[] = parsed.floors;

  if (!floors || !Array.isArray(floors) || floors.length === 0) {
    throw new Error("Invalid AI response: no floors");
  }

  const validatedFloors: FloorPlan[] = floors.map((floor, idx) => {
    const validRooms = floor.rooms
      .filter((room: any) => {
        const validType = ROOM_TYPES.includes(room.type as RoomType);
        const inBounds = room.x >= 0 && room.y >= 0 &&
          (room.x + room.width) <= width + 1 &&
          (room.y + room.height) <= depth + 1;
        const validSize = room.width >= 2 && room.height >= 2;
        return validType && inBounds && validSize;
      })
      .map((room: any) => ({
        id: room.id || `f${idx + 1}-room-${Math.random().toString(36).slice(2, 6)}`,
        name: room.name || room.type,
        x: Math.max(0, Math.min(room.x, width - room.width)),
        y: Math.max(0, Math.min(room.y, depth - room.height)),
        width: Math.min(room.width, width),
        height: Math.min(room.height, depth),
        type: room.type as RoomType,
      }));

    const walls: Wall[] = [
      { x1: 0, y1: 0, x2: width, y2: 0 },
      { x1: width, y1: 0, x2: width, y2: depth },
      { x1: width, y1: depth, x2: 0, y2: depth },
      { x1: 0, y1: depth, x2: 0, y2: 0 },
    ];

    return {
      floor: idx,
      label: idx === 0 ? "Ground Floor" : `Floor ${idx}`,
      rooms: validRooms,
      walls,
    };
  });

  if (validatedFloors.some(f => f.rooms.length === 0)) {
    throw new Error("AI generated floors with no valid rooms");
  }

  return validatedFloors;
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
