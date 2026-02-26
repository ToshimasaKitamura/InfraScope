"""API endpoints for disaster and infrastructure data."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.mcp.data_provider import (
    get_jma_warnings_async,
    get_landslide_warnings_async,
    get_river_water_levels_async,
    get_road_closures,
)
from backend.app.models.schemas import (
    JmaWarning,
    LandslideWarning,
    RiskScore,
    RiverWaterLevel,
    RoadClosure,
    SituationSummary,
)
from backend.app.services.risk_scoring import compute_risk_async
from backend.app.services.situation_summary import generate_summary_async

router = APIRouter(prefix="/api", tags=["disaster"])


@router.get("/rivers", response_model=list[RiverWaterLevel])
async def list_river_levels():
    """Return current river water level / flood warning data.

    Data source: JMA flood warnings API (fallback: mock data).
    """
    return await get_river_water_levels_async()


@router.get("/roads", response_model=list[RoadClosure])
def list_road_closures():
    """Return current road closure / restriction information.

    Data source: Mock data (no public API available).
    """
    return get_road_closures()


@router.get("/landslides", response_model=list[LandslideWarning])
async def list_landslide_warnings():
    """Return current landslide warning areas.

    Data source: JMA sediment warnings API (fallback: mock data).
    """
    return await get_landslide_warnings_async()


@router.get("/warnings", response_model=list[JmaWarning])
async def list_jma_warnings():
    """Return current JMA weather warnings.

    Data source: JMA weather warnings API.
    """
    return await get_jma_warnings_async()


@router.get("/risk", response_model=RiskScore)
async def get_risk_score(
    lat: float = Query(..., description="Latitude", ge=-90, le=90),
    lon: float = Query(..., description="Longitude", ge=-180, le=180),
):
    """Compute a location-based risk score."""
    return await compute_risk_async(lat, lon)


@router.get("/summary", response_model=SituationSummary)
async def get_situation_summary():
    """Generate an AI-powered situation summary."""
    return await generate_summary_async()
