# 🏀 NBA Player Stat Tracker

A full-stack application for searching, visualizing, and caching NBA player box scores and advanced metrics for the 2025–26 season. Built with a **React** frontend and a **Python/Flask** backend integrated with **AWS DynamoDB** and **`nba_api`**.
---

## Project Structure

```text
nba-stats-tracker/
├── backend/
│   ├── app.py                # Main Flask API route handler
│   ├── db.py                 # DynamoDB connection and cache helpers
│   ├── data_fetching.py      # NBA API data fetching & calculations
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Dashboard UI component & search handler
│   │   └── main.jsx          # React app entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration setup
└── README.md
```

---

### 1. Backend Setup (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the Flask server:
   ```bash
   python app.py
   ```

---

### 2. Frontend Setup (React)

1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Flow Architecture

```text
┌─────────────────┐       GET /api/stats/<player>       ┌─────────────────┐
│  React Frontend ├────────────────────────────────────►│  Flask Backend  │
└────────┬────────┘                                     └────────┬────────┘
         │                                                       │
         │                                                       ▼
         │                                             ┌───────────────────┐
         │                                             │ DynamoDB Cache?   │
         │                                             └─────────┬─────────┘
         │                                                       │
         │                             ┌─────────────────────────┴────────────────────────┐
         │                             │                                                  │
         │                     [ Cache Hit ]                                       [ Cache Miss ]
         │                             │                                                  │
         │                             ▼                                                  ▼
         │                Return Cached Games from DynamoDB                         Fetch from nba_api
         │                             │                                                  │
         │                             │                                        Compute TS% & Shooting Splits
         │                             │                                                  │
         │                             │                                        Write to DynamoDB
         │                             │                                                  │
         │◄────────────────────────────┴──────────────────────────────────────────────────┘
```

---
