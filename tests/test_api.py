"""Tests for the FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_index_page():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "InfraScope" in resp.text


def test_api_rivers():
    resp = client.get("/api/rivers")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_api_roads():
    resp = client.get("/api/roads")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_api_landslides():
    resp = client.get("/api/landslides")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_api_risk():
    resp = client.get("/api/risk", params={"lat": 35.68, "lon": 139.69})
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_score" in data
    assert "level" in data


def test_api_risk_validation():
    resp = client.get("/api/risk", params={"lat": 200, "lon": 139.69})
    assert resp.status_code == 422


def test_api_summary():
    resp = client.get("/api/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "generated_at" in data
