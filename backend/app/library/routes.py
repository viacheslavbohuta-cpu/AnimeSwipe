
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.database import engine
from app.auth.dependencies import get_current_user


router = APIRouter(prefix="/api/library", tags=["Library"])


class LibraryUpdate(BaseModel):
    status: Literal["WATCHED", "WANT_TO_WATCH"] | None = None
    rating: float | None = Field(default=None, ge=1, le=10)


@router.get("")
def get_library(
    status: str = Query(
        default="WATCHED",
        pattern="^(WATCHED|WANT_TO_WATCH)$"
    ),
    current_user: dict = Depends(get_current_user)
):
    with engine.connect() as connection:
        result = connection.execute(
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
                    ua.status,
                    ua.user_rating,
                    ua.watched_episodes,
                    ua.updated_at
                FROM user_anime ua
                JOIN anime a ON a.id = ua.anime_id
                WHERE ua.user_id = :user_id
                  AND ua.status = :status
                ORDER BY ua.updated_at DESC
            """),
            {
                "user_id": current_user["id"],
                "status": status
            }
        ).mappings().all()

    return [dict(row) for row in result]


# Update anime status or rating
@router.patch("/{anilist_id}")
def update_library_anime(
    anilist_id: int,
    update: LibraryUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]

    try:
        with engine.begin() as connection:

            current = connection.execute(
                text("""
                    SELECT ua.status, ua.user_rating
                    FROM user_anime ua
                    JOIN anime a ON a.id = ua.anime_id
                    WHERE ua.user_id = :user_id
                      AND a.anilist_id = :anilist_id
                """),
                {
                    "user_id": user_id,
                    "anilist_id": anilist_id
                }
            ).mappings().first()

            if not current:
                raise HTTPException(
                    status_code=404,
                    detail="Anime not found in your library"
                )

            new_status = update.status or current["status"]

            if new_status == "WATCHED":
                if "rating" in update.model_fields_set:
                    new_rating = update.rating
                else:
                    new_rating = current["user_rating"]

                if new_rating is None:
                    raise HTTPException(
                        status_code=400,
                        detail="A rating is required for watched anime"
                    )

            else:
                if update.rating is not None:
                    raise HTTPException(
                        status_code=400,
                        detail="Watchlist anime cannot have a rating"
                    )

                new_rating = None

            connection.execute(
                text("""
                    UPDATE user_anime ua
                    SET status = :status,
                        user_rating = :rating,
                        updated_at = NOW()
                    FROM anime a
                    WHERE ua.anime_id = a.id
                      AND ua.user_id = :user_id
                      AND a.anilist_id = :anilist_id
                """),
                {
                    "user_id": user_id,
                    "anilist_id": anilist_id,
                    "status": new_status,
                    "rating": new_rating
                }
            )

        return {
            "message": "Anime updated successfully",
            "anilist_id": anilist_id,
            "status": new_status,
            "rating": new_rating
        }

    except HTTPException:
        raise


# Remove anime from user's library
@router.delete("/{anilist_id}")
def remove_library_anime(
    anilist_id: int,
    current_user: dict = Depends(get_current_user)
):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM user_anime ua
                USING anime a
                WHERE ua.anime_id = a.id
                  AND ua.user_id = :user_id
                  AND a.anilist_id = :anilist_id
                RETURNING ua.id
            """),
            {
                "user_id": current_user["id"],
                "anilist_id": anilist_id
            }
        ).first()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Anime not found in your library"
            )

    return {
        "message": "Anime removed from your library",
        "anilist_id": anilist_id
    }
