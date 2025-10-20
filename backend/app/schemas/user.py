from pydantic import BaseModel, EmailStr
from typing import Optional, Literal


Role = Literal["user", "admin", "driver"]


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    role: Role = "user"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    role: Role = "user"


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True
