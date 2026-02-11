# Structura.ai - AI-Powered Construction Planning

## Overview
Structura.ai is a full-stack web application for AI-powered construction planning. It generates cost estimates, timelines, material lists, worker allocation, and architectural blueprints using advanced AI analysis. Functions as a full-fledged automated AutoCAD through AI.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend (Express)**: Express 5 + TypeScript (serves frontend, proxies /api/plan to Python)
- **Backend (Python)**: FastAPI + Pydantic (runs on port 8000, handles all planning logic)
- **Database**: PostgreSQL (Neon-backed via Replit) + Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-4o-mini for blueprint generation and analysis, with procedural fallback)
- **3D**: Three.js via @react-three/fiber + @react-three/drei (wireframe architectural rendering)
- **2D**: Custom SVG renderer for architectural blueprints (blueprint-svg.ts)

## Architecture
- Express (port 5000) serves the Vite React frontend and proxies `/api/plan` to Python FastAPI
- FastAPI (port 8000) handles all construction planning with 6 engines:
  - **calculation_engine**: Worker estimation and cost breakdown (with soil/amenity multipliers)
  - **material_engine**: 11 material types with Indian rates (cement, steel, sand, bricks, etc.)
  - **schedule_engine**: 9 construction phases with percentage-based week allocation
  - **blueprint_engine**: AI-generated floor layouts via GPT-4o-mini with architectural rules + procedural fallback
  - **ai_engine**: OpenAI GPT-4o-mini with JSON mode + fallback if API fails (uses Replit AI Integrations)
  - **formatters**: INR formatting utilities

## Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui based)
│   │   ├── pages/        # Page components (planner.tsx is main 4-step wizard)
│   │   ├── hooks/        # Custom hooks
│   │   └── lib/          # Utilities
│   └── index.html
├── backend/          # Python FastAPI backend
│   ├── main.py       # FastAPI app entry point
│   ├── routes/       # API routes (/api/plan endpoint)
│   ├── models/       # Pydantic models (ProjectInput, PlanResponse, etc.)
│   ├── services/     # Business logic engines
│   └── utils/        # INR formatting utilities
├── server/           # Express backend (proxy + existing routes)
│   ├── index.ts      # Server entry point (port 5000)
│   ├── routes.ts     # API routes + /api/plan proxy to Python
│   ├── db.ts         # Database connection
│   ├── storage.ts    # Data access layer
│   └── lib/          # Utilities (DXF writer)
├── shared/           # Shared types and schemas
│   ├── schema.ts     # DB schema + Room/FloorPlan types
│   └── routes.ts     # API route definitions
└── package.json
```

## Key Features
- 4-step wizard planner: Project Details → Configuration → Results → Blueprint & AI
- Site analysis with soil type, surroundings, constraints
- Utilities configuration: electrical, plumbing, water tanks, water supply
- Flat configuration: flats per floor, bedrooms, bathrooms, balconies, doors, windows
- Amenities: pool, gym, parking, lift (for residential/apartment types)
- Unified /api/plan endpoint returns: workers, costs, materials, schedule, blueprint, AI analysis
- Cost breakdown with material/labour/overhead/contingency in INR
- 11 material types with Indian market rates
- 9-phase construction schedule with week-by-week timeline
- AI-generated floor plans with architectural rules (CENTER corridor, flats on BOTH sides, stairs/lift core near center, plumbing shaft alignment)
- Multi-floor blueprint with corridors, water tanks, electrical/water lines, terrace, roof
- AI analysis: project summary, risks, recommendations, material insights, cost optimization, Hindi summary
- Building type selector (House, Apartment, Commercial, Mixed-Use, Residential)
- 3D wireframe building visualization with wall segments, exterior envelope, animated elevator, staircases
- 2D SVG architectural blueprint with corridors, doors, windows, room labels
- 3D/2D toggle view with component filtering panel
- Interactive blueprint editor: add/remove/edit rooms with live preview in both 3D and 2D views
- Component isolation: floors, flats, corridors, single flat, parking, terrace, water tanks, water flow, electrical
- SVG and PNG download for all blueprint views

## Workflows
- **Python Backend**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`
- **Start application**: `npx tsx server/index.ts` (Express on port 5000)

## Recent Changes
- 2026-02-11: Rewrote blueprint engine with CENTER corridor layout - flats on BOTH sides, stairs/lift core near center, plumbing shaft alignment, enhanced AI validation
- 2026-02-11: Rewrote SVG renderer for professional AutoCAD-style engineering drawings (thin white lines, dark background, wall thickness, engineering hatching, dimension lines, monospace font)
- 2026-02-10: Added interactive blueprint editor (add/remove/edit rooms with Customize button)
- 2026-02-10: Rewrote 3D viewer with wireframe walls, exterior envelope, animated elevator shaft, floor slabs
- 2026-02-10: Integrated OpenAI via Replit AI Integrations for AI-generated floor layouts
- 2026-02-10: Blueprint engine uses GPT-4o-mini with architectural rules and procedural fallback
- 2026-02-10: Fixed enum display in overview/analysis text (using .value)
- 2026-02-10: Added 3D/2D blueprint viewer with component filtering, toggle, and download
- 2026-02-10: Created modular SVG renderer (blueprint-svg.ts) with architectural floor plans
- 2026-02-10: Added BlueprintViewer component with 10 component filter categories
- 2026-02-10: Rewrote Step 4 to show visual 3D/2D blueprints instead of text-only
- 2026-02-10: Added Python FastAPI backend with 6 engines replacing Express calculation logic
- 2026-02-10: Rewrote planner.tsx as 4-step wizard with site analysis, flat config, amenities
- 2026-02-10: Added /api/plan proxy from Express to Python FastAPI
- 2026-02-10: Material rates hardcoded for Indian context (cement ₹380/bag, steel ₹65/kg, etc.)

## User Preferences
- Indian context (INR currency, Indian construction standards)
- Extend existing code, do not recreate from scratch
