import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { DxfWriter } from "./lib/dxf";
import { openai } from "./replit_integrations/image/client"; // reusing client from integration
import type { CalculationResult, Room, Wall } from "@shared/schema";

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

  // Blueprint Generation Endpoint
  app.post(api.generateBlueprint.path, async (req, res) => {
    const input = api.generateBlueprint.input.parse(req.body);
    const { width, depth } = input;

    // Simple deterministic layout algorithm
    // Divide the space into a grid of rooms
    const rooms: Room[] = [];
    const walls: Wall[] = [];

    // Basic 2x2 grid for simplicity, scaled to fit
    const roomW = width / 2;
    const roomH = depth / 2;

    rooms.push({ id: "1", name: "Living Room", x: 0, y: 0, width: roomW, height: roomH, type: "living" });
    rooms.push({ id: "2", name: "Kitchen", x: roomW, y: 0, width: roomW, height: roomH, type: "kitchen" });
    rooms.push({ id: "3", name: "Master Bed", x: 0, y: roomH, width: roomW, height: roomH, type: "bedroom" });
    rooms.push({ id: "4", name: "Bath/Utility", x: roomW, y: roomH, width: roomW, height: roomH, type: "bathroom" });

    // Outer walls
    walls.push({ x1: 0, y1: 0, x2: width, y2: 0 });
    walls.push({ x1: width, y1: 0, x2: width, y2: depth });
    walls.push({ x1: width, y1: depth, x2: 0, y2: depth });
    walls.push({ x1: 0, y1: depth, x2: 0, y2: 0 });

    res.json({ rooms, walls, width, depth });
  });

  // DXF Export Endpoint
  app.post(api.exportDxf.path, async (req, res) => {
    const { rooms, width, depth } = req.body;
    const dxf = new DxfWriter();

    // Draw outer boundary
    dxf.addRect(0, 0, width * 12, depth * 12, "BOUNDARY"); // Scale to inches for DXF usually

    // Draw rooms
    rooms.forEach((room: any) => {
      // Convert feet to inches for DXF standard or keep as units
      // Let's assume 1 unit = 1 foot for simplicity, or 12 inches. 
      // AutoCAD usually treats units as unitless, but Architectural = inches.
      const scale = 12; 
      dxf.addRect(room.x * scale, room.y * scale, room.width * scale, room.height * scale, "WALLS");
      dxf.addText(
        (room.x + room.width / 2) * scale, 
        (room.y + room.height / 2) * scale, 
        room.name, 
        12, 
        "TEXT"
      );
    });

    const content = dxf.end();
    
    res.json({
      dxfContent: content,
      filename: `project_blueprint_${Date.now()}.dxf`
    });
  });

  return httpServer;
}
