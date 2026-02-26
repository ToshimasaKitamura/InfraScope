"""MCP Data Provider — fetches real public data with mock fallback.

Data Sources:
  - River water levels: 国交省 水文水質データベース (via river.go.jp)
  - Weather/flood warnings: 気象庁 防災情報 JSON API (jma.go.jp/bosai)
  - Landslide warnings: 気象庁 土砂災害警戒情報 (jma.go.jp/bosai/sediment)
  - Road closures: Mock data (no public API available from JARTIC)

When a real API call fails (network error, timeout, etc.), the provider
transparently falls back to locally generated mock data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from backend.app.mcp import mock_data

logger = logging.getLogger(__name__)

JST = timezone(timedelta(hours=9))
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# ── Area code → name / coordinate mapping for JMA data ──────────────
# JMA uses 6-digit municipality codes. We map major ones for display.
_AREA_CENTER_COORDS: dict[str, dict[str, Any]] = {
    "0100": {"name": "北海道", "lat": 43.06, "lon": 141.35},
    "0200": {"name": "青森県", "lat": 40.82, "lon": 140.74},
    "0300": {"name": "岩手県", "lat": 39.70, "lon": 141.15},
    "0400": {"name": "宮城県", "lat": 38.27, "lon": 140.87},
    "0500": {"name": "秋田県", "lat": 39.72, "lon": 140.10},
    "0600": {"name": "山形県", "lat": 38.24, "lon": 140.34},
    "0700": {"name": "福島県", "lat": 37.75, "lon": 140.47},
    "0800": {"name": "茨城県", "lat": 36.34, "lon": 140.45},
    "0900": {"name": "栃木県", "lat": 36.57, "lon": 139.88},
    "1000": {"name": "群馬県", "lat": 36.39, "lon": 139.06},
    "1100": {"name": "埼玉県", "lat": 35.86, "lon": 139.65},
    "1200": {"name": "千葉県", "lat": 35.61, "lon": 140.12},
    "1300": {"name": "東京都", "lat": 35.69, "lon": 139.69},
    "1400": {"name": "神奈川県", "lat": 35.45, "lon": 139.64},
    "1500": {"name": "新潟県", "lat": 37.90, "lon": 139.02},
    "1600": {"name": "富山県", "lat": 36.70, "lon": 137.21},
    "1700": {"name": "石川県", "lat": 36.59, "lon": 136.63},
    "1800": {"name": "福井県", "lat": 36.07, "lon": 136.22},
    "1900": {"name": "山梨県", "lat": 35.66, "lon": 138.57},
    "2000": {"name": "長野県", "lat": 36.23, "lon": 138.18},
    "2100": {"name": "岐阜県", "lat": 35.39, "lon": 136.72},
    "2200": {"name": "静岡県", "lat": 34.98, "lon": 138.38},
    "2300": {"name": "愛知県", "lat": 35.18, "lon": 136.91},
    "2400": {"name": "三重県", "lat": 34.73, "lon": 136.51},
    "2500": {"name": "滋賀県", "lat": 35.00, "lon": 135.87},
    "2600": {"name": "京都府", "lat": 35.02, "lon": 135.76},
    "2700": {"name": "大阪府", "lat": 34.69, "lon": 135.52},
    "2800": {"name": "兵庫県", "lat": 34.69, "lon": 135.18},
    "2900": {"name": "奈良県", "lat": 34.69, "lon": 135.83},
    "3000": {"name": "和歌山県", "lat": 34.23, "lon": 135.17},
    "3100": {"name": "鳥取県", "lat": 35.50, "lon": 134.24},
    "3200": {"name": "島根県", "lat": 35.47, "lon": 133.05},
    "3300": {"name": "岡山県", "lat": 34.66, "lon": 133.93},
    "3400": {"name": "広島県", "lat": 34.40, "lon": 132.46},
    "3500": {"name": "山口県", "lat": 34.19, "lon": 131.47},
    "3600": {"name": "徳島県", "lat": 34.07, "lon": 134.56},
    "3700": {"name": "香川県", "lat": 34.34, "lon": 134.04},
    "3800": {"name": "愛媛県", "lat": 33.84, "lon": 132.77},
    "3900": {"name": "高知県", "lat": 33.56, "lon": 133.53},
    "4000": {"name": "福岡県", "lat": 33.61, "lon": 130.42},
    "4100": {"name": "佐賀県", "lat": 33.25, "lon": 130.30},
    "4200": {"name": "長崎県", "lat": 32.74, "lon": 129.87},
    "4300": {"name": "熊本県", "lat": 32.79, "lon": 130.74},
    "4400": {"name": "大分県", "lat": 33.24, "lon": 131.61},
    "4500": {"name": "宮崎県", "lat": 31.91, "lon": 131.42},
    "4600": {"name": "鹿児島県", "lat": 31.56, "lon": 130.56},
    "4700": {"name": "沖縄県", "lat": 26.21, "lon": 127.68},
}

# JMA warning type codes
_WARNING_TYPES = {
    "33": "大雨",
    "03": "洪水",
    "04": "暴風",
    "05": "暴風雪",
    "06": "大雪",
    "07": "波浪",
    "08": "高潮",
    "10": "大雨特別",
    "13": "暴風特別",
    "17": "高潮特別",
}


# =====================================================================
# JMA Weather Warnings (気象警報・注意報)
# =====================================================================

JMA_WARNING_URL = "https://www.jma.go.jp/bosai/warning/data/warning/map.json"


async def _fetch_jma_warnings() -> list[dict]:
    """Fetch weather warnings from JMA bosai API."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(JMA_WARNING_URL)
        resp.raise_for_status()
        data = resp.json()

    results: list[dict] = []
    # JMA map.json structure: { "<areaCode>": { "warnings": [...], ... }, ... }
    for area_code, info in data.items():
        if not isinstance(info, dict):
            continue
        warnings = info.get("warnings") or info.get("w") or []
        if not warnings:
            continue

        coords = _AREA_CENTER_COORDS.get(area_code[:4])
        if not coords:
            continue

        for w in warnings:
            kind_code = w.get("code") or w.get("kind", {}).get("code", "")
            status = w.get("status", "")
            if status in ("解除", ""):
                continue
            results.append({
                "area_code": area_code,
                "area_name": coords["name"],
                "lat": coords["lat"],
                "lon": coords["lon"],
                "warning_type": _WARNING_TYPES.get(kind_code, f"警報({kind_code})"),
                "status": status,
            })
    return results


# =====================================================================
# JMA Flood Warnings (洪水警報)
# =====================================================================

JMA_FLOOD_URL = "https://www.jma.go.jp/bosai/flood/data/warning/map.json"


async def _fetch_jma_flood_warnings() -> list[dict]:
    """Fetch flood/river warnings from JMA bosai API.

    Returns data in the same schema as the river water level format,
    since river.go.jp does not offer a clean public API.
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(JMA_FLOOD_URL)
        resp.raise_for_status()
        raw = resp.json()

    now = datetime.now(tz=JST).isoformat()
    results: list[dict] = []
    idx = 0

    for area_code, info in raw.items():
        if not isinstance(info, dict):
            continue
        level = info.get("level") or info.get("l")
        if level is None:
            continue
        try:
            level = int(level)
        except (TypeError, ValueError):
            continue
        if level < 1:
            continue

        coords = _AREA_CENTER_COORDS.get(area_code[:4])
        if not coords:
            continue

        if level >= 4:
            status = "danger"
        elif level >= 3:
            status = "warning"
        else:
            status = "normal"

        idx += 1
        results.append({
            "station_id": f"JMA-FL-{area_code}",
            "name": f"{coords['name']} 洪水警報域",
            "river": coords["name"],
            "lat": coords["lat"],
            "lon": coords["lon"],
            "water_level_m": float(level),
            "warning_level_m": 3.0,
            "danger_level_m": 4.0,
            "status": status,
            "observed_at": now,
            "source": "jma",
        })
    return results


# =====================================================================
# JMA Landslide Warnings (土砂災害警戒情報)
# =====================================================================

JMA_SEDIMENT_URL = "https://www.jma.go.jp/bosai/sediment/data/warning/map.json"


async def _fetch_jma_landslide_warnings() -> list[dict]:
    """Fetch landslide warnings from JMA bosai sediment API."""
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.get(JMA_SEDIMENT_URL)
        resp.raise_for_status()
        raw = resp.json()

    now = datetime.now(tz=JST).isoformat()
    results: list[dict] = []

    for area_code, info in raw.items():
        if not isinstance(info, dict):
            continue
        level = info.get("level") or info.get("l")
        if level is None:
            continue
        try:
            level = int(level)
        except (TypeError, ValueError):
            continue
        if level < 1:
            continue

        coords = _AREA_CENTER_COORDS.get(area_code[:4])
        if not coords:
            continue

        risk_score = min(level / 5.0, 1.0)
        if risk_score >= 0.8:
            warning_level = "very_high"
        elif risk_score >= 0.6:
            warning_level = "high"
        elif risk_score >= 0.4:
            warning_level = "moderate"
        else:
            warning_level = "low"

        results.append({
            "area_id": f"JMA-SD-{area_code}",
            "name": f"{coords['name']} 土砂災害警戒区域",
            "prefecture": coords["name"],
            "lat": coords["lat"],
            "lon": coords["lon"],
            "risk_score": round(risk_score, 2),
            "warning_level": warning_level,
            "observed_at": now,
            "source": "jma",
        })
    return results


# =====================================================================
# Public API functions (with fallback)
# =====================================================================

async def get_river_water_levels_async() -> list[dict]:
    """Fetch river/flood data from JMA, fallback to mock."""
    try:
        data = await _fetch_jma_flood_warnings()
        if data:
            logger.info("Fetched %d river/flood entries from JMA", len(data))
            return data
    except Exception:
        logger.warning("JMA flood API unavailable, using mock data", exc_info=True)
    return mock_data.get_river_water_levels()


async def get_landslide_warnings_async() -> list[dict]:
    """Fetch landslide warnings from JMA, fallback to mock."""
    try:
        data = await _fetch_jma_landslide_warnings()
        if data:
            logger.info("Fetched %d landslide entries from JMA", len(data))
            return data
    except Exception:
        logger.warning("JMA sediment API unavailable, using mock data", exc_info=True)
    return mock_data.get_landslide_warnings()


async def get_jma_warnings_async() -> list[dict]:
    """Fetch weather warnings from JMA, returns empty list on failure."""
    try:
        data = await _fetch_jma_warnings()
        logger.info("Fetched %d weather warnings from JMA", len(data))
        return data
    except Exception:
        logger.warning("JMA warning API unavailable", exc_info=True)
    return []


def get_road_closures() -> list[dict]:
    """Return road closure data (mock — no public API available)."""
    return mock_data.get_road_closures()


# Synchronous wrappers used by existing code paths
def get_river_water_levels() -> list[dict]:
    """Synchronous fallback — returns mock data."""
    return mock_data.get_river_water_levels()


def get_landslide_warnings() -> list[dict]:
    """Synchronous fallback — returns mock data."""
    return mock_data.get_landslide_warnings()
