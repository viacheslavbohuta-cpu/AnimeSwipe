
from enum import Enum
from pydantic import BaseModel, Field


class SwipeAction(str, Enum):
    NOT_WATCHED = "NOT_WATCHED"
    WATCHED = "WATCHED"
    NOT_INTERESTED = "NOT_INTERESTED"
    WANT_TO_WATCH = "WANT_TO_WATCH"


class SwipeCreate(BaseModel):
    anilist_id: int = Field(gt=0)
    action: SwipeAction
    rating: float | None = Field(
        default=None,
        ge=1,
        le=10
    )


class SwipeResponse(BaseModel):
    message: str
    anilist_id: int
    action: SwipeAction
    rating: float | None = None
