from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.user import User
from ..core.security.passwords import verify_password, get_password_hash
from ..core.security.jwt import create_access_token
from ..schemas.user import UserCreate, UserRead
from .deps.auth import get_current_user, require_role

router = APIRouter()

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    access_token = create_access_token(user.id, extra={"role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/register", response_model=UserRead)
async def register(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check exists
    exists = await session.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role or "user",
        is_admin=True if payload.role == "admin" else False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/whoami")
async def whoami(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role, "is_admin": current_user.is_admin}

@router.get("/only/admin")
async def only_admin(_: User = Depends(require_role("admin"))):
    return {"ok": True, "role": "admin"}

@router.get("/only/driver")
async def only_driver(_: User = Depends(require_role("driver"))):
    return {"ok": True, "role": "driver"}

@router.get("/only/user")
async def only_user(_: User = Depends(require_role("user"))):
    return {"ok": True, "role": "user"}
