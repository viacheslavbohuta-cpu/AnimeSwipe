
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.dependencies import get_current_user

from app.database import engine
from app.auth.schemas import UserRegister, UserLogin
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# =========================
# REGISTER
# =========================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserRegister):

    hashed_password = hash_password(user.password)

    try:
        with engine.begin() as connection:

            existing_user = connection.execute(
                text("""
                    SELECT username, email
                    FROM users
                    WHERE username = :username
                       OR email = :email
                """),
                {
                    "username": user.username,
                    "email": user.email
                }
            ).mappings().first()

            if existing_user:
                if existing_user["username"] == user.username:
                    raise HTTPException(
                        status_code=409,
                        detail="Username already exists"
                    )

                if existing_user["email"].lower() == user.email.lower():
                    raise HTTPException(
                        status_code=409,
                        detail="Email already registered"
                    )

            result = connection.execute(
                text("""
                    INSERT INTO users (
                        username,
                        email,
                        password_hash
                    )
                    VALUES (
                        :username,
                        :email,
                        :password_hash
                    )
                    RETURNING id, username, email
                """),
                {
                    "username": user.username,
                    "email": user.email,
                    "password_hash": hashed_password
                }
            ).mappings().one()

        return {
            "message": "Registration successful",
            "user": dict(result)
        }

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )


# =========================
# LOGIN
# =========================

@router.post("/login")
def login(user: UserLogin):

    with engine.connect() as connection:

        result = connection.execute(
            text("""
                SELECT id, username, email, password_hash
                FROM users
                WHERE email = :email
            """),
            {
                "email": user.email
            }
        ).mappings().first()

    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        result["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        user_id=result["id"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": result["id"],
            "username": result["username"],
            "email": result["email"]
        }
    }
# =========================
# CURRENT USER
# =========================

@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):
    return {
        "user": current_user
    }