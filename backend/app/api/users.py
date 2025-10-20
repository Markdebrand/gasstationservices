from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.session import get_session
from ..models.user import User
from ..schemas.user import UserCreate, UserRead
from .deps.auth import get_current_admin, get_current_user
from ..core.security.passwords import get_password_hash

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)):
    return current_user


from fastapi import Query

@router.get("/", response_model=list[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    email: str | None = Query(None)
):
    stmt = select(User)
    if email:
        stmt = stmt.where(User.email.ilike(f"%{email}%"))
    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    users = result.scalars().all()
    return users

@router.post("/", response_model=UserRead)
async def create_user(user_in: UserCreate, session: AsyncSession = Depends(get_session), _: User = Depends(get_current_admin)):
    exists = await session.execute(select(User).where(User.email == user_in.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or "user",
        is_admin=True if user_in.role == "admin" else False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
