
import math

from sqlalchemy.dialects.postgresql import insert

from app.database import engine
from app.models import anime_table
from app.services.anilist import get_trending_anime


async def sync_catalog(limit: int = 100):

    per_page = 20
    pages_needed = math.ceil(limit / per_page)

    all_anime = []

    # Step 1: Download anime from AniList
    for page in range(1, pages_needed + 1):

        result = await get_trending_anime(page=page)

        media = result["media"]

        all_anime.extend(media)

        print(
            f"Downloaded page {page}: "
            f"{len(media)} anime"
        )

        if not result["pageInfo"]["hasNextPage"]:
            break

    # Keep only the requested number
    all_anime = all_anime[:limit]

    # Step 2: Prepare database records
    records = []

    for item in all_anime:

        title = item["title"]
        cover = item.get("coverImage") or {}

        record = {
            "anilist_id": item["id"],

            "title_english": title.get("english"),
            "title_romaji": title.get("romaji"),
            "title_native": title.get("native"),

            "description": item.get("description"),

            "poster_url": (
                cover.get("extraLarge")
                or cover.get("large")
            ),

            "episodes": item.get("episodes"),
            "genres": item.get("genres") or [],

            "average_score": item.get("averageScore"),
            "season_year": item.get("seasonYear"),
            "format": item.get("format"),
        }

        records.append(record)

    # Step 3: Save records in PostgreSQL
    if records:

        statement = insert(anime_table).values(records)

        statement = statement.on_conflict_do_update(
            index_elements=["anilist_id"],

            set_={
                "title_english": statement.excluded.title_english,
                "title_romaji": statement.excluded.title_romaji,
                "title_native": statement.excluded.title_native,
                "description": statement.excluded.description,
                "poster_url": statement.excluded.poster_url,
                "episodes": statement.excluded.episodes,
                "genres": statement.excluded.genres,
                "average_score": statement.excluded.average_score,
                "season_year": statement.excluded.season_year,
                "format": statement.excluded.format,
            }
        )

        with engine.begin() as connection:
            connection.execute(statement)

    return {
        "success": True,
        "downloaded": len(all_anime),
        "processed": len(records),
        "pages": math.ceil(len(all_anime) / per_page),
        "message": "Anime catalog synchronized successfully"
    }
