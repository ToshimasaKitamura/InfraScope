"""Risk Scoring Engine — computes location-based risk scores from multiple data sources."""

from __future__ import annotations

import math

from backend.app.mcp.data_provider import (
    get_landslide_warnings,
    get_river_water_levels,
    get_road_closures,
)

PROXIMITY_THRESHOLD_KM = 30.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in km between two points."""
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _proximity_weight(distance_km: float) -> float:
    """Return a weight between 0 and 1 based on proximity (closer = higher)."""
    if distance_km >= PROXIMITY_THRESHOLD_KM:
        return 0.0
    return 1.0 - (distance_km / PROXIMITY_THRESHOLD_KM)


def compute_risk(lat: float, lon: float) -> dict:
    """Compute an aggregated risk score for a given location."""
    rivers = get_river_water_levels()
    roads = get_road_closures()
    landslides = get_landslide_warnings()

    # --- River risk ---
    river_risk = 0.0
    river_factors: list[str] = []
    for r in rivers:
        dist = _haversine_km(lat, lon, r["lat"], r["lon"])
        w = _proximity_weight(dist)
        if w <= 0:
            continue
        if r["status"] == "danger":
            score = w * 1.0
        elif r["status"] == "warning":
            score = w * 0.6
        else:
            score = w * 0.1
        if score > river_risk:
            river_risk = score
        if r["status"] in ("danger", "warning"):
            river_factors.append(f"{r['name']}({r['river']})が{r['status']}レベル")

    # --- Road risk ---
    road_risk = 0.0
    road_factors: list[str] = []
    for rd in roads:
        dist = _haversine_km(lat, lon, rd["lat"], rd["lon"])
        w = _proximity_weight(dist)
        if w <= 0:
            continue
        score = w * (1.0 if rd["status"] == "closed" else 0.6)
        if score > road_risk:
            road_risk = score
        road_factors.append(f"{rd['road_name']} {rd['section']}が{rd['cause']}により{rd['status']}")

    # --- Landslide risk ---
    landslide_risk = 0.0
    landslide_factors: list[str] = []
    for ls in landslides:
        dist = _haversine_km(lat, lon, ls["lat"], ls["lon"])
        w = _proximity_weight(dist)
        if w <= 0:
            continue
        score = w * ls["risk_score"]
        if score > landslide_risk:
            landslide_risk = score
        if ls["warning_level"] in ("high", "very_high"):
            landslide_factors.append(f"{ls['name']}が土砂災害{ls['warning_level']}レベル")

    # --- Aggregate ---
    overall = round(river_risk * 0.4 + road_risk * 0.25 + landslide_risk * 0.35, 3)
    overall = min(overall, 1.0)

    if overall >= 0.75:
        level = "critical"
    elif overall >= 0.5:
        level = "high"
    elif overall >= 0.25:
        level = "moderate"
    else:
        level = "low"

    return {
        "lat": lat,
        "lon": lon,
        "overall_score": overall,
        "river_risk": round(river_risk, 3),
        "road_risk": round(road_risk, 3),
        "landslide_risk": round(landslide_risk, 3),
        "level": level,
        "contributing_factors": river_factors + road_factors + landslide_factors,
    }
