import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure root paths are in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
AI_ENGINE_DIR = os.path.join(BASE_DIR, "ai-engine")
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.core.graph_store import graph_store
from backend.app.core.neo4j_client import neo4j_client
from backend.app.api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure Postgres schema exists, ensure Neo4j constraints/indexes exist,
    # then rebuild the in-memory graph analytics mirror from Neo4j.
    # The app starts with whatever is already in Postgres/Neo4j - no auto-seeding.
    # To bulk-load data, run: python ai-engine/ingestion/master_pipeline.py
    print("[Startup] Initializing CrimeGraph AI Backend...")
    Base.metadata.create_all(bind=engine)

    try:
        neo4j_client.apply_constraints()
    except Exception as e:
        print(f"[Startup] Warning: could not apply Neo4j constraints (is Neo4j running?): {e}")

    graph_store.load_from_neo4j()

    print("[Startup] CrimeGraph AI Backend Ready.")
    yield
    neo4j_client.close()
    print("[Shutdown] Shutting down CrimeGraph AI Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Explainable Criminal Network Intelligence & Investigation Assistant",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "docs_url": "/docs",
        "disclaimer": "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."
    }

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "database": "postgresql",
        "graph_database": "neo4j",
        "neo4j_connected": neo4j_client.verify_connectivity(),
        "graph_nodes": graph_store.graph.number_of_nodes(),
        "graph_edges": graph_store.graph.number_of_edges()
    }

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Error] Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
