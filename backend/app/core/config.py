from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    app_name: str = "HSO Fuel Delivery"
    environment: str = Field(default="dev")
    db_profile: str = Field(default="local", alias="DB_PROFILE")
    root_path: str = Field(default="", alias="ROOT_PATH")

    # Remote MySQL
    mysql_host: str = Field(default="127.0.0.1", alias="MYSQL_HOST")
    mysql_port: int = Field(default=3306, alias="MYSQL_PORT")
    mysql_db: str = Field(default="hso_app", alias="MYSQL_DB")
    mysql_user: str = Field(default="hso_user", alias="MYSQL_USER")
    mysql_password: str = Field(default="HSOdb2025!#", alias="MYSQL_PASSWORD")
    mysql_pool_size: int = Field(default=5, alias="MYSQL_POOL_SIZE")
    mysql_max_overflow: int = Field(default=10, alias="MYSQL_MAX_OVERFLOW")

    # Local MySQL
    local_mysql_host: str = Field(default="127.0.0.1", alias="LOCAL_MYSQL_HOST")
    local_mysql_port: int = Field(default=3306, alias="LOCAL_MYSQL_PORT")
    local_mysql_db: str = Field(default="hso_app", alias="LOCAL_MYSQL_DB")
    local_mysql_user: str = Field(default="root", alias="LOCAL_MYSQL_USER")
    local_mysql_password: str = Field(default="30200228", alias="LOCAL_MYSQL_PASSWORD")
    local_mysql_pool_size: int = Field(default=5, alias="LOCAL_MYSQL_POOL_SIZE")
    local_mysql_max_overflow: int = Field(default=10, alias="LOCAL_MYSQL_MAX_OVERFLOW")

    # JWT
    jwt_secret_key: str = Field(default="changeme-super-secret")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = 60 * 24

    # CORS
    allowed_origins: list[str] = Field(default=["*"], alias="ALLOWED_ORIGINS")

    class Config:
        env_file = ".env"

    @property
    def database_url(self) -> str:
            # Usar driver asyncmy para la app (mejor compatibilidad)
            driver = "mysql+asyncmy"
            if self.db_profile == "local":
                return (
                    f"{driver}://{self.local_mysql_user}:{self.local_mysql_password}" 
                    f"@{self.local_mysql_host}:{self.local_mysql_port}/{self.local_mysql_db}"
                )
            else:
                return (
                    f"{driver}://{self.mysql_user}:{self.mysql_password}" 
                    f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
                )

    @property
    def alembic_database_url(self) -> str:
        # Usar driver sync para Alembic
        driver = "mysql+pymysql"
        if self.db_profile == "local":
            return (
                f"{driver}://{self.local_mysql_user}:{self.local_mysql_password}" 
                f"@{self.local_mysql_host}:{self.local_mysql_port}/{self.local_mysql_db}"
            )
        else:
            return (
                f"{driver}://{self.mysql_user}:{self.mysql_password}" 
                f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
            )

settings = Settings()
