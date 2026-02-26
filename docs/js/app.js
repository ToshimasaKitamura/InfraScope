// InfraScope — Static Map Dashboard Application
// All data is generated client-side (no backend required).

(function () {
  "use strict";

  // ---------- Map setup ----------
  var map = L.map("map", {
    center: [35.68, 139.69],
    zoom: 7,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);

  // ---------- Layer groups ----------
  var riverLayer = L.layerGroup().addTo(map);
  var roadLayer = L.layerGroup().addTo(map);
  var landslideLayer = L.layerGroup().addTo(map);

  // ---------- Cached data for risk computation ----------
  var cachedRivers = [];
  var cachedRoads = [];
  var cachedLandslides = [];

  // ---------- Helper ----------
  function makeMarker(lat, lon, color, radius, popupHtml) {
    return L.circleMarker([lat, lon], {
      radius: radius,
      fillColor: color,
      color: "#fff",
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.8
    }).bindPopup(popupHtml);
  }

  var RIVER_COLORS = { normal: "#22c55e", warning: "#f59e0b", danger: "#ef4444" };
  var ROAD_COLORS = { closed: "#dc2626", restricted: "#fb923c" };

  function landslideColor(level) {
    if (level === "very_high") return "#7c3aed";
    if (level === "high") return "#a855f7";
    if (level === "moderate") return "#c084fc";
    return "#e9d5ff";
  }

  // ---------- Rendering ----------
  function renderRivers(data) {
    riverLayer.clearLayers();
    data.forEach(function (r) {
      var popup =
        "<b>" + r.name + "</b><br>" +
        "河川: " + r.river + "<br>" +
        "水位: " + r.water_level_m + " m<br>" +
        "警戒水位: " + r.warning_level_m + " m<br>" +
        "危険水位: " + r.danger_level_m + " m<br>" +
        "状態: <b>" + r.status + "</b>";
      makeMarker(r.lat, r.lon, RIVER_COLORS[r.status] || "#22c55e", 8, popup).addTo(riverLayer);
    });
  }

  function renderRoads(data) {
    roadLayer.clearLayers();
    data.forEach(function (rd) {
      var statusLabel = rd.status === "closed" ? "通行止め" : "通行規制";
      var popup =
        "<b>" + rd.road_name + "</b><br>" +
        "区間: " + rd.section + "<br>" +
        "原因: " + rd.cause + "<br>" +
        "状態: <b>" + statusLabel + "</b>";
      makeMarker(rd.lat, rd.lon, ROAD_COLORS[rd.status] || "#fb923c", 7, popup).addTo(roadLayer);
    });
  }

  function renderLandslides(data) {
    landslideLayer.clearLayers();
    data.forEach(function (ls) {
      var popup =
        "<b>" + ls.name + "</b><br>" +
        "都道府県: " + ls.prefecture + "<br>" +
        "リスクスコア: " + ls.risk_score + "<br>" +
        "警戒レベル: <b>" + ls.warning_level + "</b>";
      makeMarker(ls.lat, ls.lon, landslideColor(ls.warning_level), 9, popup).addTo(landslideLayer);
    });
  }

  function renderSummary(rivers, roads, landslides) {
    var el = document.getElementById("summary-content");
    var result = InfraSummary.generate(rivers, roads, landslides);
    el.textContent = result.summary;
  }

  // ---------- Risk on map click ----------
  var riskMarker = null;

  map.on("click", function (e) {
    var lat = parseFloat(e.latlng.lat.toFixed(4));
    var lon = parseFloat(e.latlng.lng.toFixed(4));

    var resultEl = document.getElementById("risk-result");
    resultEl.classList.remove("hidden");
    document.getElementById("risk-badge").textContent = "計算中...";
    document.getElementById("risk-badge").className = "risk-badge";
    document.getElementById("risk-details").textContent = "";

    var data = InfraRisk.computeRisk(lat, lon, cachedRivers, cachedRoads, cachedLandslides);

    var badge = document.getElementById("risk-badge");
    badge.textContent = data.level.toUpperCase() + " (" + data.overall_score + ")";
    badge.className = "risk-badge " + data.level;

    var details =
      "河川リスク: " + data.river_risk + "\n" +
      "道路リスク: " + data.road_risk + "\n" +
      "土砂リスク: " + data.landslide_risk + "\n";
    if (data.contributing_factors.length > 0) {
      details += "\n要因:\n" + data.contributing_factors.map(function (f) { return "• " + f; }).join("\n");
    }
    document.getElementById("risk-details").textContent = details;

    if (riskMarker) map.removeLayer(riskMarker);
    riskMarker = L.marker([lat, lon]).addTo(map)
      .bindPopup("<b>リスクスコア</b><br>" + data.level.toUpperCase() + ": " + data.overall_score)
      .openPopup();
  });

  // ---------- Layer toggles ----------
  document.getElementById("layer-rivers").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(riverLayer);
    else map.removeLayer(riverLayer);
  });
  document.getElementById("layer-roads").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(roadLayer);
    else map.removeLayer(roadLayer);
  });
  document.getElementById("layer-landslides").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(landslideLayer);
    else map.removeLayer(landslideLayer);
  });

  // ---------- Refresh ----------
  function refreshAll() {
    cachedRivers = InfraData.getRiverWaterLevels();
    cachedRoads = InfraData.getRoadClosures();
    cachedLandslides = InfraData.getLandslideWarnings();

    renderRivers(cachedRivers);
    renderRoads(cachedRoads);
    renderLandslides(cachedLandslides);
    renderSummary(cachedRivers, cachedRoads, cachedLandslides);

    document.getElementById("last-updated").textContent =
      "最終更新: " + new Date().toLocaleTimeString("ja-JP");
  }

  document.getElementById("btn-refresh").addEventListener("click", refreshAll);

  // ---------- Initial load ----------
  refreshAll();
})();
