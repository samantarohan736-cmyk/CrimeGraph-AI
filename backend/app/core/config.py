import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Dict
from sqlalchemy.engine import URL

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")
    
    PROJECT_NAME: str = "CrimeGraph AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "data")
    # Staging folder for manual bulk CSV imports (see data/import/README.md).
    # Not auto-loaded on startup - run ai-engine/ingestion/master_pipeline.py to ingest it.
    IMPORT_DIR: str = os.path.join(DATA_DIR, "import")
    # Where uploaded intelligence documents (via /api/documents/upload) are stored.
    REPORTS_DIR: str = os.path.join(DATA_DIR, "reports")

    # PostgreSQL - relational store (required, always on)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "crimegraph_db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # Neo4j - knowledge graph store (required, always on)
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # AI / LLM Integration (Optional)
    LLM_API_KEY: Optional[str] = None
    
    # Investigation Priority Scoring Weights (Configurable)
    WEIGHT_NETWORK_CENTRALITY: float = 0.30
    WEIGHT_CROSS_CASE: float = 0.25
    WEIGHT_COMMUNICATION_ANOMALY: float = 0.15
    WEIGHT_TRANSACTION_ANOMALY: float = 0.15
    WEIGHT_TEMPORAL_ACTIVITY: float = 0.15

    @property
    def database_url(self):
        return URL.create(
            drivername="postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
            )

settings = Settings()