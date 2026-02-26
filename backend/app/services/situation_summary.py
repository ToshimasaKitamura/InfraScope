"""LLM-based Situation Summary generator.

In production this would call an LLM (e.g. Claude) via API.
For the mock implementation we generate a structured natural-language summary
from the current data snapshot.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.app.mcp.data_provider import (
    get_landslide_warnings,
    get_river_water_levels,
    get_road_closures,
)

JST = timezone(timedelta(hours=9))


def generate_summary() -> dict:
    """Generate an AI-style situation summary from the current data snapshot."""
    rivers = get_river_water_levels()
    roads = get_road_closures()
    landslides = get_landslide_warnings()

    # --- Build summary text ---
    lines: list[str] = []
    lines.append("【InfraScope 状況サマリー】")
    lines.append("")

    # Rivers
    danger_rivers = [r for r in rivers if r["status"] == "danger"]
    warning_rivers = [r for r in rivers if r["status"] == "warning"]
    lines.append(f"■ 河川水位: 観測局{len(rivers)}箇所中、"
                 f"危険{len(danger_rivers)}箇所、警戒{len(warning_rivers)}箇所")
    for r in danger_rivers:
        lines.append(f"  - {r['name']}（{r['river']}）: 水位 {r['water_level_m']}m "
                     f"（危険水位 {r['danger_level_m']}m） ⚠ 危険")
    for r in warning_rivers:
        lines.append(f"  - {r['name']}（{r['river']}）: 水位 {r['water_level_m']}m "
                     f"（警戒水位 {r['warning_level_m']}m） 警戒")
    lines.append("")

    # Roads
    closed = [rd for rd in roads if rd["status"] == "closed"]
    restricted = [rd for rd in roads if rd["status"] == "restricted"]
    lines.append(f"■ 道路状況: 通行止め{len(closed)}箇所、通行規制{len(restricted)}箇所")
    for rd in roads:
        label = "通行止め" if rd["status"] == "closed" else "通行規制"
        lines.append(f"  - {rd['road_name']} {rd['section']}: {rd['cause']}による{label}")
    lines.append("")

    # Landslides
    high_ls = [ls for ls in landslides if ls["warning_level"] in ("high", "very_high")]
    lines.append(f"■ 土砂災害警戒: 警戒区域{len(landslides)}箇所中、"
                 f"高リスク{len(high_ls)}箇所")
    for ls in high_ls:
        lines.append(f"  - {ls['name']}（{ls['prefecture']}）: "
                     f"リスクスコア {ls['risk_score']}（{ls['warning_level']}）")
    lines.append("")

    # Overall assessment
    total_critical = len(danger_rivers) + len(closed) + len(high_ls)
    if total_critical >= 3:
        assessment = "現在、複数の重大リスクが同時発生しています。広域的な警戒が必要です。"
    elif total_critical >= 1:
        assessment = "一部地域で注意が必要な状況です。最新情報を継続的に確認してください。"
    else:
        assessment = "現時点で重大なリスクは検出されていません。引き続き監視を継続します。"
    lines.append(f"■ 総合評価: {assessment}")

    now = datetime.now(tz=JST)

    return {
        "summary": "\n".join(lines),
        "generated_at": now.isoformat(),
        "data_snapshot": {
            "river_stations": len(rivers),
            "danger_rivers": len(danger_rivers),
            "warning_rivers": len(warning_rivers),
            "road_closures": len(closed),
            "road_restrictions": len(restricted),
            "landslide_high_risk_areas": len(high_ls),
        },
    }
