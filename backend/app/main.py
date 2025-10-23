
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, stations, orders, users
from .api import order_items, deliveries, products, catalog
from .db.session import init_db, AsyncSessionLocal
from .core.config import settings

app = FastAPI(title="HSO Fuel Delivery - MVP", version="0.1.0", root_path=settings.root_path)

# CORS: permitir cualquier origen (para apps y web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(order_items.router, prefix="/api/orders", tags=["order-items"])  # nested under orders
app.include_router(deliveries.router, prefix="/api/deliveries", tags=["deliveries"])
app.include_router(products.router, prefix="/api/products", tags=["products"])  # catalog
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])  # public catalog

@app.get("/health")
async def health():
    return {"status": "ok"}

async def ensure_user(session, email: str, password: str, role: str, full_name: str, is_admin: bool = False):
    from sqlalchemy import select
    from .models.user import User
    from .core.security.passwords import get_password_hash
    res = await session.execute(select(User).where(User.email == email))
    existing = res.scalar_one_or_none()
    if not existing:
        new_user = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_admin=is_admin,
            role=role,
        )
        session.add(new_user)
        await session.commit()


@app.on_event("startup")
async def on_startup():
    await init_db()
    # Seed default accounts for testing: admin, user, driver
    async with AsyncSessionLocal() as session:
        await ensure_user(session, "admin@example.com", "12345678", "admin", "Administrador", is_admin=True)
        await ensure_user(session, "user@example.com", "12345678", "user", "Usuario Estático", is_admin=False)
        await ensure_user(session, "driver@example.com", "12345678", "driver", "Conductor", is_admin=False)
