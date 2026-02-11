Project live link: 
https://6572a28d-4736-4436-850a-d0286163a808-00-2r1q9n8nizili.pike.replit.dev/

# Structura.ai - AI-Powered Construction Planning

Structura.ai is a full-stack web application for AI-powered construction planning. It generates cost estimates, timelines, material lists, worker allocation, and architectural blueprints using advanced AI analysis. It functions as a full-fledged automated AutoCAD through AI, specifically tailored for the Indian construction context.

## Features
- **4-Step Wizard Planner**: Project Details → Configuration → Results → Blueprint & AI Analysis.
- **Site Analysis**: Considers soil type, surroundings, and constraints.
- **Utility Configuration**: Electrical, plumbing, water tanks, and supply.
- **Flat Configuration**: Customizable flats per floor, bedrooms, bathrooms, balconies, etc.
- **Amenities**: Support for pools, gyms, parking, and lifts.
- **AI-Generated Blueprints**: Professional architectural layouts with corridors, stairs, and plumbing alignment.
- **3D Visualization**: Interactive wireframe rendering with wall segments and floor slabs.
- **Detailed Costing**: Material/labour/overhead breakdown in INR with Indian market rates.
- **Construction Schedule**: 9-phase timeline with week-by-week allocation.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend (API Proxy)**: Express 5, TypeScript (Port 5000)
- **Backend (Logic)**: FastAPI, Pydantic, Python (Port 8000)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI (GPT-4o-mini)
- **3D/2D Rendering**: Three.js (@react-three/fiber), Custom SVG Renderer

## Local Setup

### Prerequisites
- Node.js (v20 or higher)
- Python 3.11+
- PostgreSQL database
- OpenAI API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd structura-ai
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
   *(Note: Ensure uvicorn is installed: `pip install uvicorn`)*

4. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   ```

5. **Database Setup**:
   ```bash
   npm run db:push
   ```

6. **Run the Application**:
   You need to start both backends.

   **Terminal 1 (Python Logic):**
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

   **Terminal 2 (Frontend & Proxy):**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`.

## Project Structure
- `client/`: React frontend source code.
- `backend/`: Python FastAPI planning engines and logic.
- `server/`: Express server for authentication, storage, and API proxying.
- `shared/`: Shared TypeScript types and database schema.

## License
MIT
