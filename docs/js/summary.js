// InfraScope — Situation Summary Generator (client-side)

var InfraSummary = (function () {
  "use strict";

  function generate(rivers, roads, landslides) {
    var lines = [];
    lines.push("【InfraScope 状況サマリー】");
    lines.push("");

    // Rivers
    var dangerRivers = rivers.filter(function (r) { return r.status === "danger"; });
    var warningRivers = rivers.filter(function (r) { return r.status === "warning"; });
    lines.push("■ 河川水位: 観測局" + rivers.length + "箇所中、" +
               "危険" + dangerRivers.length + "箇所、警戒" + warningRivers.length + "箇所");
    dangerRivers.forEach(function (r) {
      lines.push("  - " + r.name + "（" + r.river + "）: 水位 " + r.water_level_m + "m " +
                 "（危険水位 " + r.danger_level_m + "m） ⚠ 危険");
    });
    warningRivers.forEach(function (r) {
      lines.push("  - " + r.name + "（" + r.river + "）: 水位 " + r.water_level_m + "m " +
                 "（警戒水位 " + r.warning_level_m + "m） 警戒");
    });
    lines.push("");

    // Data source
    var riverSource = (rivers.length > 0 && rivers[0].source === "jma") ? "気象庁API" : "モックデータ";
    lines.push("  ※ データソース: " + riverSource);
    lines.push("");

    // Roads
    var closed = roads.filter(function (rd) { return rd.status === "closed"; });
    var restricted = roads.filter(function (rd) { return rd.status === "restricted"; });
    lines.push("■ 道路状況: 通行止め" + closed.length + "箇所、通行規制" + restricted.length + "箇所");
    roads.forEach(function (rd) {
      var label = rd.status === "closed" ? "通行止め" : "通行規制";
      lines.push("  - " + rd.road_name + " " + rd.section + ": " + rd.cause + "による" + label);
    });
    lines.push("");

    // Landslides
    var highLs = landslides.filter(function (ls) {
      return ls.warning_level === "high" || ls.warning_level === "very_high";
    });
    lines.push("■ 土砂災害警戒: 警戒区域" + landslides.length + "箇所中、" +
               "高リスク" + highLs.length + "箇所");
    highLs.forEach(function (ls) {
      lines.push("  - " + ls.name + "（" + ls.prefecture + "）: " +
                 "リスクスコア " + ls.risk_score + "（" + ls.warning_level + "）");
    });
    lines.push("");

    // Assessment
    var totalCritical = dangerRivers.length + closed.length + highLs.length;
    var assessment;
    if (totalCritical >= 3) {
      assessment = "現在、複数の重大リスクが同時発生しています。広域的な警戒が必要です。";
    } else if (totalCritical >= 1) {
      assessment = "一部地域で注意が必要な状況です。最新情報を継続的に確認してください。";
    } else {
      assessment = "現時点で重大なリスクは検出されていません。引き続き監視を継続します。";
    }
    lines.push("■ 総合評価: " + assessment);

    return {
      summary: lines.join("\n"),
      generated_at: new Date().toISOString(),
      data_snapshot: {
        river_stations: rivers.length,
        danger_rivers: dangerRivers.length,
        warning_rivers: warningRivers.length,
        road_closures: closed.length,
        road_restrictions: restricted.length,
        landslide_high_risk_areas: highLs.length
      }
    };
  }

  return { generate: generate };
})();
