// InfraScope — Map Dashboard Application (Backend version)
// Fetches data from FastAPI backend which tries real JMA APIs with mock fallback.

(function () {
  "use strict";

  // ---------- Map setup (GSI pale tiles) ----------
  var map = L.map("map", {
    center: [35.68, 139.69],
    zoom: 7,
    zoomControl: true,
  });

  L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
    attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html'>国土地理院</a>",
    maxZoom: 18,
  }).addTo(map);

  // ---------- Data layer groups ----------
  var riverLayer = L.layerGroup().addTo(map);
  var roadLayer = L.layerGroup().addTo(map);
  var landslideLayer = L.layerGroup().addTo(map);

  // ---------- GSI Hazard Map tile overlays ----------
  var floodHazardLayer = L.tileLayer(
    "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png",
    { opacity: 0.6, maxZoom: 17, attribution: "ハザードマップポータルサイト" }
  );

  var sedimentHazardLayer = L.tileLayer(
    "https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png",
    { opacity: 0.6, maxZoom: 17, attribution: "ハザードマップポータルサイト" }
  );

  // ---------- Marker helper ----------
  function makeMarker(lat, lon, color, radius, popupHtml) {
    return L.circleMarker([lat, lon], {
      radius: radius,
      fillColor: color,
      color: "#fff",
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.8,
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

  // ---------- Data fetchers ----------
  async function fetchJson(url) {
    var resp = await fetch(url);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return resp.json();
  }

  async function loadRivers() {
    var data = await fetchJson("/api/rivers");
    riverLayer.clearLayers();
    data.forEach(function (r) {
      var source = r.source === "jma" ? "気象庁" : "モック";
      var popup =
        "<b>" + r.name + "</b><br>" +
        "河川: " + r.river + "<br>" +
        "水位: " + r.water_level_m + " m<br>" +
        "警戒水位: " + r.warning_level_m + " m<br>" +
        "危険水位: " + r.danger_level_m + " m<br>" +
        "状態: <b>" + r.status + "</b><br>" +
        "<small>出典: " + source + "</small>";
      makeMarker(r.lat, r.lon, RIVER_COLORS[r.status] || "#22c55e", 8, popup).addTo(riverLayer);
    });
  }

  async function loadRoads() {
    var data = await fetchJson("/api/roads");
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

  async function loadLandslides() {
    var data = await fetchJson("/api/landslides");
    landslideLayer.clearLayers();
    data.forEach(function (ls) {
      var source = ls.source === "jma" ? "気象庁" : "モック";
      var popup =
        "<b>" + ls.name + "</b><br>" +
        "都道府県: " + ls.prefecture + "<br>" +
        "リスクスコア: " + ls.risk_score + "<br>" +
        "警戒レベル: <b>" + ls.warning_level + "</b><br>" +
        "<small>出典: " + source + "</small>";
      makeMarker(ls.lat, ls.lon, landslideColor(ls.warning_level), 9, popup).addTo(landslideLayer);
    });
  }

  async function loadSummary() {
    var el = document.getElementById("summary-content");
    try {
      var data = await fetchJson("/api/summary");
      el.textContent = data.summary;
    } catch (e) {
      el.textContent = "サマリーの取得に失敗しました。";
    }
  }

  // ---------- Risk on map click ----------
  var riskMarker = null;

  map.on("click", async function (e) {
    var lat = e.latlng.lat.toFixed(4);
    var lon = e.latlng.lng.toFixed(4);

    var resultEl = document.getElementById("risk-result");
    resultEl.classList.remove("hidden");
    document.getElementById("risk-badge").textContent = "計算中...";
    document.getElementById("risk-badge").className = "risk-badge";
    document.getElementById("risk-details").textContent = "";

    try {
      var data = await fetchJson("/api/risk?lat=" + lat + "&lon=" + lon);

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
    } catch (err) {
      document.getElementById("risk-badge").textContent = "エラー";
      document.getElementById("risk-details").textContent = err.message;
    }
  });

  // ---------- Layer toggles ----------
  document.getElementById("layer-rivers").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(riverLayer); else map.removeLayer(riverLayer);
  });
  document.getElementById("layer-roads").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(roadLayer); else map.removeLayer(roadLayer);
  });
  document.getElementById("layer-landslides").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(landslideLayer); else map.removeLayer(landslideLayer);
  });
  document.getElementById("layer-flood-hazard").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(floodHazardLayer); else map.removeLayer(floodHazardLayer);
  });
  document.getElementById("layer-sediment-hazard").addEventListener("change", function (e) {
    if (e.target.checked) map.addLayer(sedimentHazardLayer); else map.removeLayer(sedimentHazardLayer);
  });

  // ---------- Refresh ----------
  async function refreshAll() {
    await Promise.all([loadRivers(), loadRoads(), loadLandslides(), loadSummary()]);
    document.getElementById("last-updated").textContent =
      "最終更新: " + new Date().toLocaleTimeString("ja-JP");
  }

  document.getElementById("btn-refresh").addEventListener("click", refreshAll);

  // ---------- Initial load ----------
  refreshAll();
})();
