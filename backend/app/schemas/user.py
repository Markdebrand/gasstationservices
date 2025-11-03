from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    role: str = "user"
    hso_points: int = 0


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    role: str = "user"
    hso_points: int = 0


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True
