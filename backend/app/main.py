import os

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.services.anilist import (
    search_anime,
    get_trending_anime,
    get_mixed_anime
)
from app.database import test_connection
from app.services.catalog_sync import sync_catalog

from app.auth.routes import router as auth_router
from app.swipes.routes import router as swipes_router
from app.library.routes import router as library_router
from app.favorites.routes import router as favorites_router

from app.auth.dependencies import get_current_user

app = FastAPI(title="AnimeSwipe API", version="0.1.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes
app.include_router(auth_router)
app.include_router(swipes_router)
app.include_router(library_router)
app.include_router(favorites_router)

@app.get("/health")
async def health():
    return {"status": "ok", "app": "AnimeSwipe"}
@app.get("/health/db")
async def database_health():
    try:
        connected = test_connection()

        return {
            "database": "connected",
            "success": connected
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {exc}"
        )

@app.get("/api/anime/search")
async def anime_search(q: str = Query(min_length=1), page: int = 1):
    try:
        return await search_anime(q=q, page=page)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AniList request failed: {exc}")

@app.get("/api/anime/trending")
async def anime_trending(page: int = 1):
    try:
        return await get_trending_anime(page=page)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AniList request failed: {exc}")
    
@app.post("/api/anime/sync")
async def synchronize_anime():
    try:
        result = await sync_catalog(limit=100)
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Catalog synchronization failed: {exc}"
        )
    

@app.get("/api/anime/discover")
async def discover_anime(
    page: int = 1,
    current_user: dict = Depends(get_current_user)
):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than 0"
        )

    try:
        return await get_mixed_anime(
            page=page,
            user_id=current_user["id"]
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Discovery failed: {exc}"
        )