import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Dict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")
    
    PROJECT_NAME: str = "CrimeGraph AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "data")
    SYNTHETIC_DIR: str = os.path.join(DATA_DIR, "synthetic")
    REPORTS_DIR: str = os.path.join(DATA_DIR, "reports")
    
    # Database Settings (PostgreSQL or SQLite fallback)
    USE_SQLITE: bool = True
    SQLITE_DB_PATH: str = os.path.join(DATA_DIR, "crimegraph.db")
    
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "crimegraph_db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    
    # Neo4j Settings (Graph Database or Local NetworkX Fallback)
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    USE_NEO4J: bool = False # Set to True when Neo4j instance is running
    
    # AI / LLM Integration (Optional)
    LLM_API_KEY: Optional[str] = None
    
    # Investigation Priority Scoring Weights (Configurable)
    WEIGHT_NETWORK_CENTRALITY: float = 0.30
    WEIGHT_CROSS_CASE: float = 0.25
    WEIGHT_COMMUNICATION_ANOMALY: float = 0.15
    WEIGHT_TRANSACTION_ANOMALY: float = 0.15
    WEIGHT_TEMPORAL_ACTIVITY: float = 0.15

    @property
    def database_url(self) -> str:
        if self.USE_SQLITE:
            os.makedirs(self.DATA_DIR, exist_ok=True)
            return f"sqlite:///{self.SQLITE_DB_PATH}"
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
