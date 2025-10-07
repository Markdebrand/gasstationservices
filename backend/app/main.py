from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, stations, orders, users
from .db.session import init_db

app = FastAPI(title="HSO Fuel Delivery - MVP", version="0.1.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
