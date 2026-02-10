# Structura.ai - AI-Powered Construction Planning

## Overview
Structura.ai is a full-stack web application for AI-powered construction planning. It generates cost estimates, timelines, and architectural blueprints using advanced AI analysis. Functions as a full-fledged automated AutoCAD through AI.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL (Neon-backed via Replit) + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.1 for analysis and blueprint generation, gpt-image-1 for images)
- **3D**: Three.js via @react-three/fiber + @react-three/drei
- **2D**: react-konva for blueprint editing

## Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui based)
│   │   │   └── ui/       # building-3d-viewer, blueprint-editor, select, etc.
│   │   ├── pages/        # Page components (planner.tsx is main)
│   │   ├── hooks/        # Custom hooks (use-construction.ts)
│   │   └── lib/          # Utilities
│   └── index.html
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes + AI blueprint generation + fallback generator
│   ├── db.ts         # Database connection
│   ├── storage.ts    # Data access layer
│   ├── lib/          # Utilities (DXF writer)
│   └── replit_integrations/  # AI integration clients
├── shared/           # Shared types and schemas
│   ├── schema.ts     # Drizzle DB schema + Room/FloorPlan/BuildingType types
│   └── routes.ts     # API route definitions + ProjectInput type
└── package.json
```

## Key Features
- Building type selector (House, Apartment, Commercial, Mixed-Use)
- Construction cost estimation based on dimensions, floors, and location
- AI-powered project analysis (cost reasoning, timeline justification, layout recommendations)
- AI-powered blueprint generation with realistic multi-floor layouts
  - Corridors, elevators, staircases, lobbies
  - 16 room types: bedroom, living, kitchen, bathroom, corridor, staircase, elevator, lobby, dining, balcony, storage, utility, parking, office, laundry, other
  - Fallback heuristic generator if AI fails
- 3D building visualization with Three.js
  - Floor-by-floor view, auto-rotation, room color coding
  - Animated elevator shafts, staircase connectors
  - All/single floor view toggle
- 2D blueprint editor with customization tools
  - Add/delete/resize/rename rooms
  - Change room types
  - Floor selector for multi-floor editing
  - Drag-and-drop room positioning
- DXF file export for CAD software

## Running
- `npm run dev` - Start development server on port 5000
- `npm run db:push` - Push database schema changes

## Recent Changes
- 2026-02-10: Major overhaul - AI-powered blueprint generation using GPT-5.1 with building type context
- 2026-02-10: Added building type selector (House/Apartment/Commercial/Mixed-Use)
- 2026-02-10: Enhanced 2D editor with add/delete/resize/rename rooms, floor selector, room type changer
- 2026-02-10: Added elevator shafts, 16 room types, improved 3D viewer with new colors
- 2026-02-10: Added 3D building viewer with Three.js (@react-three/fiber + drei)
- 2026-02-10: Initial setup in Replit - installed dependencies, configured database, set up OpenAI integration
