"""Pydantic models for API request / response schemas."""

from __future__ import annotations

from pydantic import BaseModel


class RiverWaterLevel(BaseModel):
    station_id: str
    name: str
    river: str
    lat: float
    lon: float
    water_level_m: float
    warning_level_m: float
    danger_level_m: float
    status: str  # normal | warning | danger
    observed_at: str


class RoadClosure(BaseModel):
    road_id: str
    road_name: str
    section: str
    lat: float
    lon: float
    cause: str
    status: str  # closed | restricted
    since: str
    updated_at: str


class LandslideWarning(BaseModel):
    area_id: str
    name: str
    prefecture: str
    lat: float
    lon: float
    risk_score: float
    warning_level: str  # low | moderate | high | very_high
    observed_at: str


class RiskScore(BaseModel):
    lat: float
    lon: float
    overall_score: float
    river_risk: float
    road_risk: float
    landslide_risk: float
    level: str  # low | moderate | high | critical
    contributing_factors: list[str]


class SituationSummary(BaseModel):
    summary: str
    generated_at: str
    data_snapshot: dict
