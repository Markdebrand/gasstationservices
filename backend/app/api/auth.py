from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.user import User
from ..core.security.passwords import verify_password, get_password_hash
from ..core.security.jwt import create_access_token
from ..schemas.user import UserCreate

router = APIRouter()

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    access_token = create_access_token(user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register")
async def register(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check exists
    exists = await session.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, full_name=payload.full_name, hashed_password=get_password_hash(payload.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return {"id": user.id, "email": user.email}
