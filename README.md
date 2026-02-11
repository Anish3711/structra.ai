# Structura.ai - AI-Powered Document Analysis & Visualization

Structura.ai is an intelligent platform designed to bridge the gap between complex document structures and actionable insights. It leverages AI to analyze, visualize, and extract meaningful data from various document formats, providing users with a streamlined workflow for information management.

## Features
- **Intelligent Document Parsing**: Automatically extract structure and content from PDFs and other documents.
- **AI-Driven Insights**: Use advanced LLMs to summarize, analyze, and query your documents.
- **Interactive Visualizations**: View your document data through intuitive charts and structural diagrams.
- **Secure Storage**: Built-in authentication and secure document handling.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Framer Motion
- **3D/Visualization**: React Three Fiber, Three.js, Konva
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI

## Local Setup

### Prerequisites
- Node.js (v20 or higher)
- PostgreSQL database
- OpenAI API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd structura-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   SESSION_SECRET=your_random_session_secret
   ```

4. **Database Setup**:
   Push the schema to your database:
   ```bash
   npm run db:push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`.

## Scripts
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Runs the production build.
- `npm run check`: Runs TypeScript type checking.
- `npm run db:push`: Syncs the database schema with Drizzle.

## License
MIT
