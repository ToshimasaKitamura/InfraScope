"""Tests for the situation summary generator."""

from backend.app.services.situation_summary import generate_summary


def test_summary_returns_valid_structure():
    result = generate_summary()
    assert "summary" in result
    assert "generated_at" in result
    assert "data_snapshot" in result


def test_summary_contains_sections():
    result = generate_summary()
    summary = result["summary"]
    assert "状況サマリー" in summary
    assert "河川水位" in summary
    assert "道路状況" in summary
    assert "土砂災害警戒" in summary
    assert "総合評価" in summary


def test_data_snapshot_keys():
    result = generate_summary()
    snap = result["data_snapshot"]
    assert "river_stations" in snap
    assert "danger_rivers" in snap
    assert "warning_rivers" in snap
    assert "road_closures" in snap
    assert "road_restrictions" in snap
    assert "landslide_high_risk_areas" in snap
