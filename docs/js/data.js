// InfraScope — Mock MCP Data Provider (client-side)
// Simulates MLIT public data feeds entirely in the browser.

var InfraData = (function () {
  "use strict";

  // ---------- River stations ----------
  var RIVER_STATIONS = [
    { station_id: "R001", name: "荒川 岩淵水門",   river: "荒川",   lat: 35.7830, lon: 139.7280, warning_level: 4.0, danger_level: 7.0 },
    { station_id: "R002", name: "多摩川 田園調布",  river: "多摩川",  lat: 35.5900, lon: 139.6680, warning_level: 5.0, danger_level: 8.5 },
    { station_id: "R003", name: "利根川 栗橋",     river: "利根川",  lat: 36.1310, lon: 139.7020, warning_level: 6.0, danger_level: 9.0 },
    { station_id: "R004", name: "江戸川 野田",     river: "江戸川",  lat: 35.9560, lon: 139.8740, warning_level: 4.5, danger_level: 7.5 },
    { station_id: "R005", name: "鶴見川 亀の甲橋",  river: "鶴見川",  lat: 35.5100, lon: 139.6440, warning_level: 3.5, danger_level: 5.5 },
    { station_id: "R006", name: "淀川 枚方",      river: "淀川",   lat: 34.8140, lon: 135.6530, warning_level: 5.5, danger_level: 8.0 },
    { station_id: "R007", name: "信濃川 大河津",   river: "信濃川",  lat: 37.6400, lon: 138.8200, warning_level: 6.5, danger_level: 10.0 },
    { station_id: "R008", name: "筑後川 瀬ノ下",   river: "筑後川",  lat: 33.2800, lon: 130.5200, warning_level: 5.0, danger_level: 8.0 }
  ];

  // ---------- Road closures ----------
  var ROAD_CLOSURES = [
    { road_id: "RD001", road_name: "国道16号",    section: "八王子〜相模原", lat: 35.6320, lon: 139.3380, cause: "土砂崩れ" },
    { road_id: "RD002", road_name: "国道246号",   section: "厚木〜秦野",   lat: 35.3960, lon: 139.2770, cause: "冠水" },
    { road_id: "RD003", road_name: "首都高速5号線", section: "板橋〜戸田",   lat: 35.7920, lon: 139.6810, cause: "路面凍結" },
    { road_id: "RD004", road_name: "国道1号",     section: "箱根峠付近",   lat: 35.2000, lon: 139.0200, cause: "土砂崩れ" },
    { road_id: "RD005", road_name: "名神高速",    section: "関ヶ原〜米原",  lat: 35.3700, lon: 136.4600, cause: "積雪" }
  ];

  // ---------- Landslide areas ----------
  var LANDSLIDE_AREAS = [
    { area_id: "LS001", name: "箱根町強羅地区",  prefecture: "神奈川県", lat: 35.2470, lon: 139.0590, base_risk: 0.7 },
    { area_id: "LS002", name: "伊豆大島北部",   prefecture: "東京都",  lat: 34.7840, lon: 139.3530, base_risk: 0.6 },
    { area_id: "LS003", name: "奥多摩町日原地区", prefecture: "東京都",  lat: 35.8530, lon: 139.0200, base_risk: 0.5 },
    { area_id: "LS004", name: "広島市安佐北区",  prefecture: "広島県",  lat: 34.5100, lon: 132.4800, base_risk: 0.8 },
    { area_id: "LS005", name: "熊本県南阿蘇村",  prefecture: "熊本県",  lat: 32.8800, lon: 131.0500, base_risk: 0.75 },
    { area_id: "LS006", name: "奈良県十津川村",  prefecture: "奈良県",  lat: 34.0600, lon: 135.7200, base_risk: 0.65 }
  ];

  function randUniform(min, max) {
    return min + Math.random() * (max - min);
  }

  function jstNow() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace(" ", "T") + "+09:00";
  }

  function getRiverWaterLevels() {
    var now = jstNow();
    return RIVER_STATIONS.map(function (st) {
      var base = st.warning_level * randUniform(0.3, 1.15);
      var level = Math.round(base * 100) / 100;
      var status;
      if (level >= st.danger_level) status = "danger";
      else if (level >= st.warning_level) status = "warning";
      else status = "normal";
      return {
        station_id: st.station_id, name: st.name, river: st.river,
        lat: st.lat, lon: st.lon,
        water_level_m: level, warning_level_m: st.warning_level, danger_level_m: st.danger_level,
        status: status, observed_at: now
      };
    });
  }

  function getRoadClosures() {
    var now = jstNow();
    var count = 1 + Math.floor(Math.random() * ROAD_CLOSURES.length);
    var shuffled = ROAD_CLOSURES.slice().sort(function () { return Math.random() - 0.5; });
    var active = shuffled.slice(0, count);
    return active.map(function (rd) {
      var hoursAgo = 1 + Math.floor(Math.random() * 48);
      var since = new Date(Date.now() - hoursAgo * 3600000).toISOString();
      return {
        road_id: rd.road_id, road_name: rd.road_name, section: rd.section,
        lat: rd.lat, lon: rd.lon, cause: rd.cause,
        status: Math.random() < 0.5 ? "closed" : "restricted",
        since: since, updated_at: now
      };
    });
  }

  function getLandslideWarnings() {
    var now = jstNow();
    return LANDSLIDE_AREAS.map(function (area) {
      var risk = Math.round(area.base_risk * randUniform(0.5, 1.4) * 100) / 100;
      risk = Math.min(risk, 1.0);
      var level;
      if (risk >= 0.8) level = "very_high";
      else if (risk >= 0.6) level = "high";
      else if (risk >= 0.4) level = "moderate";
      else level = "low";
      return {
        area_id: area.area_id, name: area.name, prefecture: area.prefecture,
        lat: area.lat, lon: area.lon,
        risk_score: risk, warning_level: level, observed_at: now
      };
    });
  }

  return {
    getRiverWaterLevels: getRiverWaterLevels,
    getRoadClosures: getRoadClosures,
    getLandslideWarnings: getLandslideWarnings
  };
})();
