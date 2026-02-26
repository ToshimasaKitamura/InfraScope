"""Tests for the MCP data provider."""

from backend.app.mcp.data_provider import (
    get_landslide_warnings,
    get_river_water_levels,
    get_road_closures,
)


def test_river_water_levels_returns_list():
    data = get_river_water_levels()
    assert isinstance(data, list)
    assert len(data) > 0


def test_river_water_levels_schema():
    data = get_river_water_levels()
    for item in data:
        assert "station_id" in item
        assert "name" in item
        assert "river" in item
        assert "lat" in item
        assert "lon" in item
        assert "water_level_m" in item
        assert "status" in item
        assert item["status"] in ("normal", "warning", "danger")


def test_road_closures_returns_list():
    data = get_road_closures()
    assert isinstance(data, list)
    assert len(data) > 0


def test_road_closures_schema():
    data = get_road_closures()
    for item in data:
        assert "road_id" in item
        assert "road_name" in item
        assert "status" in item
        assert item["status"] in ("closed", "restricted")


def test_landslide_warnings_returns_list():
    data = get_landslide_warnings()
    assert isinstance(data, list)
    assert len(data) > 0


def test_landslide_warnings_schema():
    data = get_landslide_warnings()
    for item in data:
        assert "area_id" in item
        assert "name" in item
        assert "risk_score" in item
        assert 0.0 <= item["risk_score"] <= 1.0
        assert item["warning_level"] in ("low", "moderate", "high", "very_high")
