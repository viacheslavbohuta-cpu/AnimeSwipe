
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.database import engine
from app.auth.dependencies import get_current_user
from app.swipes.schemas import SwipeCreate, SwipeResponse
from app.services.anilist import get_anime_by_id


router = APIRouter(
    prefix="/api/swipes",
    tags=["Swipes"]
)


@router.post("", response_model=SwipeResponse)
async def create_swipe(
    swipe: SwipeCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]

    # Validate rating
    if swipe.action == "WATCHED" and swipe.rating is None:
        raise HTTPException(
            status_code=400,
            detail="Rating is required when marking anime as watched"
        )

    if swipe.action != "WATCHED" and swipe.rating is not None:
        raise HTTPException(
            status_code=400,
            detail="Rating is only allowed for WATCHED anime"
        )

    # Get anime from AniList
    anime_data = await get_anime_by_id(swipe.anilist_id)

    if not anime_data:
        raise HTTPException(
            status_code=404,
            detail="Anime not found on AniList"
        )

    title = anime_data["title"]
    cover = anime_data.get("coverImage") or {}

    title_romaji = (
        title.get("romaji")
        or title.get("english")
        or title.get("native")
        or "Unknown title"
    )

    try:
        with engine.begin() as connection:

            # Insert anime if it does not exist.
            # If it already exists, update its information.
            anime = connection.execute(
                text("""
                    INSERT INTO anime (
                        anilist_id,
                        title_english,
                        title_romaji,
                        title_native,
                        description,
                        poster_url,
                        episodes,
                        genres,
                        average_score,
                        season_year,
                        format
                    )
                    VALUES (
                        :anilist_id,
                        :title_english,
                        :title_romaji,
                        :title_native,
                        :description,
                        :poster_url,
                        :episodes,
                        :genres,
                        :average_score,
                        :season_year,
                        :format
                    )
                    ON CONFLICT (anilist_id)
                    DO UPDATE SET
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
                    "anilist_id": anime_data["id"],
                    "title_english": title.get("english"),
                    "title_romaji": title_romaji,
                    "title_native": title.get("native"),
                    "description": anime_data.get("description"),
                    "poster_url": (
                        cover.get("extraLarge")
                        or cover.get("large")
                    ),
                    "episodes": anime_data.get("episodes"),
                    "genres": anime_data.get("genres") or [],
                    "average_score": anime_data.get("averageScore"),
                    "season_year": anime_data.get("seasonYear"),
                    "format": anime_data.get("format")
                }
            ).mappings().first()

            anime_id = anime["id"]

            # Save swipe history
            connection.execute(
                text("""
                    INSERT INTO swipe_history (
                        user_id,
                        anime_id,
                        action
                    )
                    VALUES (
                        :user_id,
                        :anime_id,
                        :action
                    )
                """),
                {
                    "user_id": user_id,
                    "anime_id": anime_id,
                    "action": swipe.action.value
                }
            )

            # Update user's anime library
            connection.execute(
                text("""
                    INSERT INTO user_anime (
                        user_id,
                        anime_id,
                        status,
                        user_rating,
                        watched_episodes,
                        updated_at
                    )
                    VALUES (
                        :user_id,
                        :anime_id,
                        :status,
                        :rating,
                        0,
                        NOW()
                    )
                    ON CONFLICT (user_id, anime_id)
                    DO UPDATE SET
                        status = EXCLUDED.status,
                        user_rating = EXCLUDED.user_rating,
                        updated_at = NOW()
                """),
                {
                    "user_id": user_id,
                    "anime_id": anime_id,
                    "status": swipe.action.value,
                    "rating": swipe.rating
                }
            )

        return SwipeResponse(
            message="Swipe saved successfully",
            anilist_id=swipe.anilist_id,
            action=swipe.action,
            rating=swipe.rating
        )

    except HTTPException:
        raise
