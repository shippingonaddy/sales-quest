# Sales Quest App

A standalone, runnable version of the Sales Quest application.

## Ports

- **Frontend (Vite)**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API endpoint**: http://localhost:3001/api/sales-quest
- **Health check**: http://localhost:3001/health

The Vite dev server proxies `/api/*` requests to the backend automatically.

## 📁 Project Structure

```
sales-quest-app/
├── src/
│   ├── pages/
│   │   └── SalesQuest.tsx      # Main application page
│   ├── components/              # React components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility functions
│   ├── types/                   # TypeScript types
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── server/
│   └── api/
│       └── sales-quest.ts       # API route handler
├── public/                      # Static assets
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
└── index.html                  # HTML entry point
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /home/workspace/sales-quest-app
bun install
```

### 2. Set up Environment Variables

```bash
cp .env.example .env
# Edit .env with your Clerk credentials
```

### 3. Run the Development Server

```bash
# This starts both the API server and the Vite dev server
bun run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/sales-quest
- **Health Check**: http://localhost:3001/health

### 4. Build for Production

```bash
bun run build
```

### 5. Start Production Server

```bash
bun run start
```

## 🔧 Features

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Hono.js API server with file-based storage
- **Authentication**: Clerk JWT verification
- **Data Persistence**: JSON file storage with automatic archiving
- **Streak Tracking**: Work-day aware streak calculation
- **Import/Export**: JSON backup and restore functionality

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales-quest` | Get current month's data |
| GET | `/api/sales-quest?month=YYYY-MM` | Get specific month's data |
| GET | `/api/sales-quest?action=list_months` | List available months |
| POST | `/api/sales-quest` | Save/update current month's data |
| GET | `/health` | Health check |

## 📝 Notes

- Data is stored in `/home/workspace/sales-quest-data/<user-id>/`
- Each user gets their own subdirectory
- Current month data is in `current.json`
- Archived months are in `archive/YYYY-MM.json`
- Local mode is available when Clerk is not configured

## 🛠️ Development

### Running Individual Services

```bash
# API server only
bun run dev:server

# Client dev server only (Vite)
bun run dev:client
```

### Technology Stack

- **Runtime**: Bun
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Hono.js, Zod validation
- **Auth**: Clerk
- **Icons**: Lucide React
