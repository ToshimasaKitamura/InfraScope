"""Tests for the risk scoring engine."""

from backend.app.services.risk_scoring import PROXIMITY_THRESHOLD_KM, _haversine_km, compute_risk


def test_haversine_same_point():
    assert _haversine_km(35.0, 139.0, 35.0, 139.0) == 0.0


def test_haversine_known_distance():
    # Tokyo (35.6762, 139.6503) -> Osaka (34.6937, 135.5023) ≈ 397 km
    d = _haversine_km(35.6762, 139.6503, 34.6937, 135.5023)
    assert 390 < d < 410


def test_compute_risk_returns_valid_structure():
    result = compute_risk(35.68, 139.69)
    assert "overall_score" in result
    assert "river_risk" in result
    assert "road_risk" in result
    assert "landslide_risk" in result
    assert "level" in result
    assert "contributing_factors" in result
    assert result["level"] in ("low", "moderate", "high", "critical")


def test_compute_risk_score_range():
    result = compute_risk(35.68, 139.69)
    assert 0.0 <= result["overall_score"] <= 1.0
    assert 0.0 <= result["river_risk"] <= 1.0
    assert 0.0 <= result["road_risk"] <= 1.0
    assert 0.0 <= result["landslide_risk"] <= 1.0


def test_compute_risk_remote_location():
    """A location far from all data points should have low risk."""
    result = compute_risk(0.0, 0.0)  # middle of the ocean
    assert result["overall_score"] == 0.0
    assert result["level"] == "low"
