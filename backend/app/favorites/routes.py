from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.auth.dependencies import get_current_user
from app.database import engine
from app.services.anilist import get_anime_by_id

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])


@router.get("")
def get_favorites(current_user: dict = Depends(get_current_user)):
    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT
                    a.id,
                    a.anilist_id,
                    a.title_english,
                    a.title_romaji,
                    a.title_native,
                    a.poster_url,
                    a.episodes,
                    a.genres,
                    a.average_score,
                    a.season_year,
                    a.format,
                    uf.created_at
                FROM user_favorites uf
                JOIN anime a ON a.id = uf.anime_id
                WHERE uf.user_id = :user_id
                ORDER BY uf.created_at DESC
            """),
            {"user_id": current_user["id"]}
        ).mappings().all()

    return [dict(row) for row in rows]


@router.post("/{anilist_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    anilist_id: int,
    current_user: dict = Depends(get_current_user)
):
    anime = await get_anime_by_id(anilist_id)
    if not anime:
        raise HTTPException(status_code=404, detail="Anime not found on AniList")

    title = anime.get("title") or {}
    cover = anime.get("coverImage") or {}

    with engine.begin() as connection:
        anime_row = connection.execute(
            text("""
                INSERT INTO anime (
                    anilist_id, title_english, title_romaji, title_native,
                    description, poster_url, episodes, genres, average_score,
                    season_year, format
                )
                VALUES (
                    :anilist_id, :title_english, :title_romaji, :title_native,
                    :description, :poster_url, :episodes, :genres, :average_score,
                    :season_year, :format
                )
                ON CONFLICT (anilist_id) DO UPDATE SET
                    title_english = EXCLUDED.title_english,
                    title_romaji = EXCLUDED.title_romaji,
                    title_native = EXCLUDED.title_native,
                    description = EXCLUDED.description,
                    poster_url = EXCLUDED.poster_url,
                    episodes = EXCLUDED.episodes,
                    genres = EXCLUDED.genres,
                    average_score = EXCLUDED.average_score,
                    season_year = EXCLUDED.season_year,
                    format = EXCLUDED.format
                RETURNING id
            """),
            {
                "anilist_id": anilist_id,
                "title_english": title.get("english"),
                "title_romaji": title.get("romaji") or "Unknown title",
                "title_native": title.get("native"),
                "description": anime.get("description"),
                "poster_url": cover.get("extraLarge") or cover.get("large"),
                "episodes": anime.get("episodes"),
                "genres": anime.get("genres") or [],
                "average_score": anime.get("averageScore"),
                "season_year": anime.get("seasonYear"),
                "format": anime.get("format"),
            }
        ).mappings().one()

        connection.execute(
            text("""
                INSERT INTO user_favorites (user_id, anime_id)
                VALUES (:user_id, :anime_id)
                ON CONFLICT (user_id, anime_id) DO NOTHING
            """),
            {"user_id": current_user["id"], "anime_id": anime_row["id"]}
        )

    return {"message": "Anime added to favorites", "anilist_id": anilist_id}


@router.delete("/{anilist_id}")
def remove_favorite(
    anilist_id: int,
    current_user: dict = Depends(get_current_user)
):
    with engine.begin() as connection:
        deleted = connection.execute(
            text("""
                DELETE FROM user_favorites uf
                USING anime a
                WHERE uf.anime_id = a.id
                  AND uf.user_id = :user_id
                  AND a.anilist_id = :anilist_id
                RETURNING uf.id
            """),
            {"user_id": current_user["id"], "anilist_id": anilist_id}
        ).first()

    if not deleted:
        raise HTTPException(status_code=404, detail="Anime is not in favorites")

    return {"message": "Anime removed from favorites", "anilist_id": anilist_id}
