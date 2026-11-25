
import httpx

from sqlalchemy import text
from app.database import engine

ANILIST_URL = "https://graphql.anilist.co"

ANIME_FIELDS = """
id
title { romaji english native }
description(asHtml: false)
coverImage { extraLarge large }
bannerImage
episodes
genres
averageScore
popularity
averageScore
seasonYear
format
status
siteUrl
"""


async def _graphql(query: str, variables: dict):
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            ANILIST_URL,
            json={
                "query": query,
                "variables": variables
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

    if response.status_code == 429:
        raise RuntimeError(
            "AniList rate limit reached. Please wait before trying again."
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"AniList HTTP {response.status_code}: {response.text}"
        )

    payload = response.json()

    if payload.get("errors"):
        message = payload["errors"][0].get(
            "message",
            "Unknown GraphQL error"
        )
        raise RuntimeError(message)

    return payload["data"]


async def search_anime(q: str, page: int = 1):
    query = f"""
    query ($search: String!, $page: Int!) {{
        Page(page: $page, perPage: 20) {{
            pageInfo {{
                currentPage
                hasNextPage
            }}
            media(
                search: $search,
                type: ANIME,
                sort: SEARCH_MATCH
            ) {{
                {ANIME_FIELDS}
            }}
        }}
    }}
    """

    data = await _graphql(
        query,
        {
            "search": q,
            "page": page
        }
    )

    return data["Page"]


async def get_trending_anime(page: int = 1):
    query = f"""
    query ($page: Int!) {{
        Page(page: $page, perPage: 20) {{
            pageInfo {{
                currentPage
                hasNextPage
            }}
            media(
                type: ANIME,
                sort: TRENDING_DESC
            ) {{
                {ANIME_FIELDS}
            }}
        }}
    }}
    """

    data = await _graphql(query, {"page": page})

    return data["Page"]


async def get_mixed_anime(page: int = 1, user_id: int = None):
    """
    Discovery feed:
    - Sort anime by popularity, highest first.
    - Exclude anime already processed by the current user.
    - Preserve AniList pagination.
    """

    query = f"""
    query ($page: Int!) {{
        Page(page: $page, perPage: 20) {{
            pageInfo {{
                currentPage
                hasNextPage
            }}
            media(
                type: ANIME,
                sort: POPULARITY_DESC
            ) {{
                {ANIME_FIELDS}
            }}
        }}
    }}
    """

    data = await _graphql(
        query,
        {"page": page}
    )

    page_data = data["Page"]
    anime_list = page_data["media"]

    seen_ids = set()

    if user_id is not None:
        with engine.connect() as connection:
            seen_ids = set(
                connection.execute(
                    text("""
                        SELECT a.anilist_id
                        FROM user_anime ua
                        JOIN anime a ON a.id = ua.anime_id
                        WHERE ua.user_id = :user_id
                          AND ua.status IN (
                              'WATCHED',
                              'WANT_TO_WATCH',
                              'NOT_INTERESTED'
                          )
                    """),
                    {"user_id": user_id}
                ).scalars().all()
            )

    filtered_anime = [
        anime
        for anime in anime_list
        if anime["id"] not in seen_ids
    ]

    return {
        "media": filtered_anime,
        "pageInfo": page_data["pageInfo"]
    }


async def get_anime_by_id(anilist_id: int):
    query = f"""
    query ($id: Int!) {{
        Media(id: $id, type: ANIME) {{
            {ANIME_FIELDS}
        }}
    }}
    """

    data = await _graphql(
        query,
        {"id": anilist_id}
    )

    return data.get("Media")
