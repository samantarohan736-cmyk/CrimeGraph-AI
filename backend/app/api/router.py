from fastapi import APIRouter
from backend.app.api.routes import (
    dashboard, cases, persons, graph, analytics, alerts,
    timeline, documents, evidence, investigation, search
)

api_router = APIRouter()

api_router.include_router(dashboard.router)
api_router.include_router(cases.router)
api_router.include_router(persons.router)
api_router.include_router(graph.router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(timeline.router)
api_router.include_router(documents.router)
api_router.include_router(evidence.router)
api_router.include_router(investigation.router)
api_router.include_router(search.router)


