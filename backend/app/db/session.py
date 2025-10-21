
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from .base import Base
from ..core.config import settings

# Print temporal para depuración
print(f"[DEBUG] DB URL usada por SQLAlchemy: {settings.database_url}")

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
