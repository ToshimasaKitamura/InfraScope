// InfraScope — Risk Scoring Engine (client-side)

var InfraRisk = (function () {
  "use strict";

  var PROXIMITY_THRESHOLD_KM = 30.0;

  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371.0;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function proximityWeight(distKm) {
    if (distKm >= PROXIMITY_THRESHOLD_KM) return 0.0;
    return 1.0 - (distKm / PROXIMITY_THRESHOLD_KM);
  }

  function computeRisk(lat, lon, rivers, roads, landslides) {
    var riverRisk = 0.0;
    var riverFactors = [];
    rivers.forEach(function (r) {
      var dist = haversineKm(lat, lon, r.lat, r.lon);
      var w = proximityWeight(dist);
      if (w <= 0) return;
      var score;
      if (r.status === "danger") score = w * 1.0;
      else if (r.status === "warning") score = w * 0.6;
      else score = w * 0.1;
      if (score > riverRisk) riverRisk = score;
      if (r.status === "danger" || r.status === "warning") {
        riverFactors.push(r.name + "(" + r.river + ")が" + r.status + "レベル");
      }
    });

    var roadRisk = 0.0;
    var roadFactors = [];
    roads.forEach(function (rd) {
      var dist = haversineKm(lat, lon, rd.lat, rd.lon);
      var w = proximityWeight(dist);
      if (w <= 0) return;
      var score = w * (rd.status === "closed" ? 1.0 : 0.6);
      if (score > roadRisk) roadRisk = score;
      roadFactors.push(rd.road_name + " " + rd.section + "が" + rd.cause + "により" + rd.status);
    });

    var landslideRisk = 0.0;
    var landslideFactors = [];
    landslides.forEach(function (ls) {
      var dist = haversineKm(lat, lon, ls.lat, ls.lon);
      var w = proximityWeight(dist);
      if (w <= 0) return;
      var score = w * ls.risk_score;
      if (score > landslideRisk) landslideRisk = score;
      if (ls.warning_level === "high" || ls.warning_level === "very_high") {
        landslideFactors.push(ls.name + "が土砂災害" + ls.warning_level + "レベル");
      }
    });

    var overall = Math.round((riverRisk * 0.4 + roadRisk * 0.25 + landslideRisk * 0.35) * 1000) / 1000;
    overall = Math.min(overall, 1.0);

    var level;
    if (overall >= 0.75) level = "critical";
    else if (overall >= 0.5) level = "high";
    else if (overall >= 0.25) level = "moderate";
    else level = "low";

    return {
      lat: lat, lon: lon,
      overall_score: overall,
      river_risk: Math.round(riverRisk * 1000) / 1000,
      road_risk: Math.round(roadRisk * 1000) / 1000,
      landslide_risk: Math.round(landslideRisk * 1000) / 1000,
      level: level,
      contributing_factors: riverFactors.concat(roadFactors).concat(landslideFactors)
    };
  }

  return { computeRisk: computeRisk };
})();
