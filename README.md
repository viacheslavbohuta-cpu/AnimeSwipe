# AnimeSwipe

Anime discovery and tracking application.

## Features

- Discover anime from AniList
- Swipe to mark anime as watched, not interested, want to watch, or skip
- Search the AniList catalog
- Personal library and watchlist
- Ratings and favorites
- User registration and login

## Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL
- Metadata: AniList GraphQL API
- Authentication: JWT

## Repository layout

- `frontend/` — React application
- `backend/` — FastAPI application

## Local setup (Windows PowerShell)

### 1. Backend

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and enter your local PostgreSQL credentials plus a long random `SECRET_KEY`.

Start the API:

```powershell
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`
Swagger: `http://127.0.0.1:8000/docs`

### 2. Frontend

Open another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Vite: `http://localhost:5173`

`VITE_API_URL` selects the backend URL. It is public browser configuration, not a secret.

## Environment variables

Backend (`backend/.env`):
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `SECRET_KEY`
- `CORS_ORIGINS` — comma-separated allowed frontend origins

Frontend (`frontend/.env`):
- `VITE_API_URL` — backend base URL

Never commit real `.env` files, credentials, JWT secrets, tokens, or database dumps.

## Deployment notes

GitHub stores source code; it does not host the running application. For a public deployment:
1. Provision a hosted PostgreSQL database.
2. Deploy the FastAPI backend and configure its environment variables.
3. Set `CORS_ORIGINS` to the deployed frontend origin.
4. Deploy the frontend and set `VITE_API_URL` to the deployed backend URL.
5. Test registration, login, search, swipes, library, and favorites with separate accounts.

Suggested hosting: Vercel for frontend, Render for backend, and Neon or Render PostgreSQL for the database.
