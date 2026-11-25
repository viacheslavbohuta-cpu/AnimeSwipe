
from sqlalchemy import (
    MetaData,
    Table,
    Column,
    BigInteger,
    Text,
    Integer,
    Numeric,
    String,
    ARRAY,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Identity,
)

from sqlalchemy.sql import func

metadata = MetaData()


# =========================
# ANIME
# =========================

anime_table = Table(
    "anime",
    metadata,

    Column("id", BigInteger, Identity(), primary_key=True),
    Column("anilist_id", BigInteger, unique=True, nullable=False),

    Column("title_english", Text),
    Column("title_romaji", Text),
    Column("title_native", Text),

    Column("description", Text),
    Column("poster_url", Text),

    Column("episodes", Integer),
    Column("genres", ARRAY(Text)),

    Column("average_score", Numeric(4, 1)),
    Column("season_year", Integer),
    Column("format", String(30)),

    Column("created_at", DateTime, server_default=func.now()),
)


# =========================
# USERS
# =========================

users_table = Table(
    "users",
    metadata,

    Column("id", BigInteger, Identity(), primary_key=True),
    Column("username", String, nullable=False, unique=True),
    Column("email", String, nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),

    Column("created_at", DateTime, server_default=func.now()),
)


# =========================
# SWIPE HISTORY
# =========================

swipe_history_table = Table(
    "swipe_history",
    metadata,

    Column("id", BigInteger, Identity(), primary_key=True),

    Column(
        "user_id",
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    ),

    Column(
        "anime_id",
        BigInteger,
        ForeignKey("anime.id", ondelete="CASCADE"),
        nullable=False
    ),

    Column("action", String, nullable=False),

    Column("created_at", DateTime, server_default=func.now()),

    CheckConstraint(
        "action IN ('NOT_WATCHED', 'WATCHED', "
        "'NOT_INTERESTED', 'WANT_TO_WATCH')",
        name="swipe_history_action_check"
    ),
)


# =========================
# USER ANIME
# =========================

user_anime_table = Table(
    "user_anime",
    metadata,

    Column("id", BigInteger, Identity(), primary_key=True),

    Column(
        "user_id",
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    ),

    Column(
        "anime_id",
        BigInteger,
        ForeignKey("anime.id", ondelete="CASCADE"),
        nullable=False
    ),

    Column("status", String, nullable=False),

    Column("user_rating", Numeric(4, 1)),

    Column("watched_episodes", Integer, server_default="0"),

    Column("updated_at", DateTime, server_default=func.now()),

    UniqueConstraint(
        "user_id",
        "anime_id",
        name="user_anime_user_id_anime_id_key"
    ),

    CheckConstraint(
        "status IN ('NOT_WATCHED', 'WATCHED', "
        "'NOT_INTERESTED', 'WANT_TO_WATCH')",
        name="user_anime_status_check"
    ),

    CheckConstraint(
        "user_rating >= 1 AND user_rating <= 10",
        name="user_anime_user_rating_check"
    ),

    CheckConstraint(
        "watched_episodes >= 0",
        name="user_anime_watched_episodes_check"
    ),
)
