"""API endpoints for disaster and infrastructure data."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.mcp.data_provider import (
    get_landslide_warnings,
    get_river_water_levels,
    get_road_closures,
)
from backend.app.models.schemas import (
    LandslideWarning,
    RiskScore,
    RiverWaterLevel,
    RoadClosure,
    SituationSummary,
)
from backend.app.services.risk_scoring import compute_risk
from backend.app.services.situation_summary import generate_summary

router = APIRouter(prefix="/api", tags=["disaster"])


@router.get("/rivers", response_model=list[RiverWaterLevel])
def list_river_levels():
    """Return current river water level observations."""
    return get_river_water_levels()


@router.get("/roads", response_model=list[RoadClosure])
def list_road_closures():
    """Return current road closure / restriction information."""
    return get_road_closures()


@router.get("/landslides", response_model=list[LandslideWarning])
def list_landslide_warnings():
    """Return current landslide warning areas."""
    return get_landslide_warnings()


@router.get("/risk", response_model=RiskScore)
def get_risk_score(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
):
    """Compute a location-based risk score."""
    return compute_risk(lat, lon)


@router.get("/summary", response_model=SituationSummary)
def get_situation_summary():
    """Generate an AI-powered situation summary."""
    return generate_summary()
