"""InfraScope — FastAPI application entry point."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from backend.app.routers.disaster import router as disaster_router

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

app = FastAPI(
    title="InfraScope",
    description="AI-powered disaster & infrastructure visualization dashboard",
    version="0.1.0",
)

app.include_router(disaster_router)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

templates = Jinja2Templates(directory=str(FRONTEND_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """Serve the main dashboard page."""
    return templates.TemplateResponse(request, "index.html")
