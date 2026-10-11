from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    app_name: str = "JobAI API"
    environment: str = "development"
    mongodb_uri: str
    mongodb_database: str = "jobai"
    frontend_origins: str = "http://localhost:3000"
    jwt_secret: str
    jwt_expire_minutes: int = 720
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    @property
    def allowed_origins(self): return [x.strip() for x in self.frontend_origins.split(",") if x.strip()]
settings = Settings()
