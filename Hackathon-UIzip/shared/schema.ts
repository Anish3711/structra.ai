import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  width: integer("width").notNull(), // in feet
  depth: integer("depth").notNull(), // in feet
  floors: integer("floors").notNull().default(1),
  budget: integer("budget"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calculations = pgTable("calculations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  totalCost: integer("total_cost").notNull(),
  materialsCost: integer("materials_cost").notNull(),
  laborCost: integer("labor_cost").notNull(),
  timelineWeeks: integer("timeline_weeks").notNull(),
  breakdown: jsonb("breakdown").notNull(), // detailed JSON
});

// Input schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true 
});

export const BUILDING_TYPES = ['house', 'apartment', 'commercial', 'mixed-use'] as const;
export type BuildingType = typeof BUILDING_TYPES[number];

export const projectInputSchema = insertProjectSchema.extend({
  width: z.number().min(10).max(500),
  depth: z.number().min(10).max(500),
  floors: z.number().min(1).max(20),
  budget: z.number().optional(),
  buildingType: z.enum(BUILDING_TYPES).optional().default('house'),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof projectInputSchema>;

// Calculation Types
export interface MaterialBreakdown {
  cement: number;
  steel: number;
  bricks: number;
  sand: number;
  aggregate: number;
  finishings: number;
}

export interface LaborBreakdown {
  masons: number;
  helpers: number;
  carpenters: number;
  steelWorkers: number;
}

export interface CalculationResult {
  totalCost: number;
  materialsCost: number;
  laborCost: number;
  timelineWeeks: number;
  materials: MaterialBreakdown;
  labor: LaborBreakdown;
  costPerSqFt: number;
}

// Blueprint Types
export const ROOM_TYPES = [
  'bedroom', 'living', 'kitchen', 'bathroom', 'other',
  'corridor', 'staircase', 'elevator', 'lobby', 'dining',
  'balcony', 'storage', 'utility', 'parking', 'office', 'laundry',
] as const;

export type RoomType = typeof ROOM_TYPES[number];

export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: RoomType;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FloorPlan {
  floor: number;
  label: string;
  rooms: Room[];
  walls: Wall[];
}

export interface BlueprintData {
  rooms: Room[];
  walls: Wall[];
  width: number;
  depth: number;
  floors?: FloorPlan[];
}

// AI Analysis Types
export interface AIAnalysis {
  summary: string;
  costReasoning: string;
  timelineJustification: string;
  layoutRecommendations: string;
}
