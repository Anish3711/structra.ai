import { z } from 'zod';
import { projectInputSchema } from './schema';

export const api = {
  calculate: {
    method: 'POST' as const,
    path: '/api/calculate' as const,
    input: projectInputSchema,
    responses: {
      200: z.object({
        totalCost: z.number(),
        materialsCost: z.number(),
        laborCost: z.number(),
        timelineWeeks: z.number(),
        materials: z.object({
          cement: z.number(),
          steel: z.number(),
          bricks: z.number(),
          sand: z.number(),
          aggregate: z.number(),
          finishings: z.number(),
        }),
        labor: z.object({
          masons: z.number(),
          helpers: z.number(),
          carpenters: z.number(),
          steelWorkers: z.number(),
        }),
        costPerSqFt: z.number(),
      }),
    },
  },
  analyze: {
    method: 'POST' as const,
    path: '/api/analyze' as const,
    input: z.object({
      project: projectInputSchema,
      calculations: z.any(), // Using any for brevity, matches CalculationResult
    }),
    responses: {
      200: z.object({
        summary: z.string(),
        costReasoning: z.string(),
        timelineJustification: z.string(),
        layoutRecommendations: z.string(),
      }),
    },
  },
  generateBlueprint: {
    method: 'POST' as const,
    path: '/api/blueprint/generate' as const,
    input: projectInputSchema,
    responses: {
      200: z.object({
        rooms: z.array(z.object({
          id: z.string(),
          name: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          type: z.enum(['bedroom', 'living', 'kitchen', 'bathroom', 'other']),
        })),
        walls: z.array(z.object({
          x1: z.number(),
          y1: z.number(),
          x2: z.number(),
          y2: z.number(),
        })),
        width: z.number(),
        depth: z.number(),
      }),
    },
  },
  exportDxf: {
    method: 'POST' as const,
    path: '/api/export/dxf' as const,
    input: z.object({
      rooms: z.array(z.any()),
      width: z.number(),
      depth: z.number(),
    }),
    responses: {
      200: z.object({
        dxfContent: z.string(),
        filename: z.string(),
      }),
    },
  },
};
