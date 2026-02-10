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

export const projectInputSchema = insertProjectSchema.extend({
  width: z.number().min(10).max(500),
  depth: z.number().min(10).max(500),
  floors: z.number().min(1).max(20),
  budget: z.number().optional(),
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
export interface Room {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'other';
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BlueprintData {
  rooms: Room[];
  walls: Wall[]; // derived from rooms
  width: number; // overall width
  depth: number; // overall depth
}

// AI Analysis Types
export interface AIAnalysis {
  summary: string;
  costReasoning: string;
  timelineJustification: string;
  layoutRecommendations: string;
}
