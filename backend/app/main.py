
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, stations, orders, users
from .db.session import init_db
from .core.config import settings

app = FastAPI(title="HSO Fuel Delivery - MVP", version="0.1.0", root_path=settings.root_path)

# CORS for local dev

# CORS según entorno
if settings.environment == "prod":
    allowed_origins = settings.allowed_origins
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.on_event("startup")
async def on_startup():
    await init_db()
    # Crear usuario estático si no existe
    from .db.session import AsyncSessionLocal
    from .models.user import User
    from .core.security.passwords import get_password_hash
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "user"))
        user = result.scalar_one_or_none()
        if not user:
            new_user = User(
                email="user",
                full_name="Usuario Estático",
                hashed_password=get_password_hash("12345678"),
                is_active=True,
                is_admin=False,
                role="user"
            )
            session.add(new_user)
            await session.commit()
