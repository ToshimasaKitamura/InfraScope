"""Mock MCP data provider simulating MLIT (Ministry of Land, Infrastructure, Transport and Tourism) data feeds."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))


def _jst_now() -> datetime:
    return datetime.now(tz=JST)


# ---------------------------------------------------------------------------
# River water level data
# ---------------------------------------------------------------------------

_RIVER_STATIONS = [
    {"station_id": "R001", "name": "荒川 岩淵水門", "river": "荒川", "lat": 35.7830, "lon": 139.7280, "warning_level": 4.0, "danger_level": 7.0},
    {"station_id": "R002", "name": "多摩川 田園調布", "river": "多摩川", "lat": 35.5900, "lon": 139.6680, "warning_level": 5.0, "danger_level": 8.5},
    {"station_id": "R003", "name": "利根川 栗橋", "river": "利根川", "lat": 36.1310, "lon": 139.7020, "warning_level": 6.0, "danger_level": 9.0},
    {"station_id": "R004", "name": "江戸川 野田", "river": "江戸川", "lat": 35.9560, "lon": 139.8740, "warning_level": 4.5, "danger_level": 7.5},
    {"station_id": "R005", "name": "鶴見川 亀の甲橋", "river": "鶴見川", "lat": 35.5100, "lon": 139.6440, "warning_level": 3.5, "danger_level": 5.5},
    {"station_id": "R006", "name": "淀川 枚方", "river": "淀川", "lat": 34.8140, "lon": 135.6530, "warning_level": 5.5, "danger_level": 8.0},
    {"station_id": "R007", "name": "信濃川 大河津", "river": "信濃川", "lat": 37.6400, "lon": 138.8200, "warning_level": 6.5, "danger_level": 10.0},
    {"station_id": "R008", "name": "筑後川 瀬ノ下", "river": "筑後川", "lat": 33.2800, "lon": 130.5200, "warning_level": 5.0, "danger_level": 8.0},
]


def get_river_water_levels() -> list[dict]:
    """Return simulated real-time river water level readings."""
    now = _jst_now()
    results = []
    for st in _RIVER_STATIONS:
        base = st["warning_level"] * random.uniform(0.3, 1.15)
        level = round(base, 2)
        if level >= st["danger_level"]:
            status = "danger"
        elif level >= st["warning_level"]:
            status = "warning"
        else:
            status = "normal"
        results.append({
            "station_id": st["station_id"],
            "name": st["name"],
            "river": st["river"],
            "lat": st["lat"],
            "lon": st["lon"],
            "water_level_m": level,
            "warning_level_m": st["warning_level"],
            "danger_level_m": st["danger_level"],
            "status": status,
            "observed_at": now.isoformat(),
        })
    return results


# ---------------------------------------------------------------------------
# Road closure data
# ---------------------------------------------------------------------------

_ROAD_CLOSURES = [
    {"road_id": "RD001", "road_name": "国道16号", "section": "八王子〜相模原", "lat": 35.6320, "lon": 139.3380, "cause": "土砂崩れ"},
    {"road_id": "RD002", "road_name": "国道246号", "section": "厚木〜秦野", "lat": 35.3960, "lon": 139.2770, "cause": "冠水"},
    {"road_id": "RD003", "road_name": "首都高速5号線", "section": "板橋〜戸田", "lat": 35.7920, "lon": 139.6810, "cause": "路面凍結"},
    {"road_id": "RD004", "road_name": "国道1号", "section": "箱根峠付近", "lat": 35.2000, "lon": 139.0200, "cause": "土砂崩れ"},
    {"road_id": "RD005", "road_name": "名神高速", "section": "関ヶ原〜米原", "lat": 35.3700, "lon": 136.4600, "cause": "積雪"},
]


def get_road_closures() -> list[dict]:
    """Return simulated road closure information."""
    now = _jst_now()
    active = random.sample(_ROAD_CLOSURES, k=random.randint(1, len(_ROAD_CLOSURES)))
    results = []
    for rd in active:
        results.append({
            **rd,
            "status": random.choice(["closed", "restricted"]),
            "since": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
            "updated_at": now.isoformat(),
        })
    return results


# ---------------------------------------------------------------------------
# Landslide warning areas
# ---------------------------------------------------------------------------

_LANDSLIDE_AREAS = [
    {"area_id": "LS001", "name": "箱根町強羅地区", "prefecture": "神奈川県", "lat": 35.2470, "lon": 139.0590, "base_risk": 0.7},
    {"area_id": "LS002", "name": "伊豆大島北部", "prefecture": "東京都", "lat": 34.7840, "lon": 139.3530, "base_risk": 0.6},
    {"area_id": "LS003", "name": "奥多摩町日原地区", "prefecture": "東京都", "lat": 35.8530, "lon": 139.0200, "base_risk": 0.5},
    {"area_id": "LS004", "name": "広島市安佐北区", "prefecture": "広島県", "lat": 34.5100, "lon": 132.4800, "base_risk": 0.8},
    {"area_id": "LS005", "name": "熊本県南阿蘇村", "prefecture": "熊本県", "lat": 32.8800, "lon": 131.0500, "base_risk": 0.75},
    {"area_id": "LS006", "name": "奈良県十津川村", "prefecture": "奈良県", "lat": 34.0600, "lon": 135.7200, "base_risk": 0.65},
]


def get_landslide_warnings() -> list[dict]:
    """Return simulated landslide warning area data."""
    now = _jst_now()
    results = []
    for area in _LANDSLIDE_AREAS:
        risk = round(area["base_risk"] * random.uniform(0.5, 1.4), 2)
        risk = min(risk, 1.0)
        if risk >= 0.8:
            level = "very_high"
        elif risk >= 0.6:
            level = "high"
        elif risk >= 0.4:
            level = "moderate"
        else:
            level = "low"
        results.append({
            "area_id": area["area_id"],
            "name": area["name"],
            "prefecture": area["prefecture"],
            "lat": area["lat"],
            "lon": area["lon"],
            "risk_score": risk,
            "warning_level": level,
            "observed_at": now.isoformat(),
        })
    return results
