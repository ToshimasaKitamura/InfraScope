// InfraScope — Data Provider (client-side)
// Fetches real data from JMA APIs, falls back to mock data on failure.

var InfraData = (function () {
  "use strict";

  // ── JMA API endpoints ──
  var JMA_FLOOD_URL = "https://www.jma.go.jp/bosai/flood/data/warning/map.json";
  var JMA_SEDIMENT_URL = "https://www.jma.go.jp/bosai/sediment/data/warning/map.json";
  var JMA_WARNING_URL = "https://www.jma.go.jp/bosai/warning/data/warning/map.json";

  // ── Prefecture code → name / coordinates ──
  var AREA_COORDS = {
    "01": { name: "北海道",   lat: 43.06, lon: 141.35 },
    "02": { name: "青森県",   lat: 40.82, lon: 140.74 },
    "03": { name: "岩手県",   lat: 39.70, lon: 141.15 },
    "04": { name: "宮城県",   lat: 38.27, lon: 140.87 },
    "05": { name: "秋田県",   lat: 39.72, lon: 140.10 },
    "06": { name: "山形県",   lat: 38.24, lon: 140.34 },
    "07": { name: "福島県",   lat: 37.75, lon: 140.47 },
    "08": { name: "茨城県",   lat: 36.34, lon: 140.45 },
    "09": { name: "栃木県",   lat: 36.57, lon: 139.88 },
    "10": { name: "群馬県",   lat: 36.39, lon: 139.06 },
    "11": { name: "埼玉県",   lat: 35.86, lon: 139.65 },
    "12": { name: "千葉県",   lat: 35.61, lon: 140.12 },
    "13": { name: "東京都",   lat: 35.69, lon: 139.69 },
    "14": { name: "神奈川県", lat: 35.45, lon: 139.64 },
    "15": { name: "新潟県",   lat: 37.90, lon: 139.02 },
    "16": { name: "富山県",   lat: 36.70, lon: 137.21 },
    "17": { name: "石川県",   lat: 36.59, lon: 136.63 },
    "18": { name: "福井県",   lat: 36.07, lon: 136.22 },
    "19": { name: "山梨県",   lat: 35.66, lon: 138.57 },
    "20": { name: "長野県",   lat: 36.23, lon: 138.18 },
    "21": { name: "岐阜県",   lat: 35.39, lon: 136.72 },
    "22": { name: "静岡県",   lat: 34.98, lon: 138.38 },
    "23": { name: "愛知県",   lat: 35.18, lon: 136.91 },
    "24": { name: "三重県",   lat: 34.73, lon: 136.51 },
    "25": { name: "滋賀県",   lat: 35.00, lon: 135.87 },
    "26": { name: "京都府",   lat: 35.02, lon: 135.76 },
    "27": { name: "大阪府",   lat: 34.69, lon: 135.52 },
    "28": { name: "兵庫県",   lat: 34.69, lon: 135.18 },
    "29": { name: "奈良県",   lat: 34.69, lon: 135.83 },
    "30": { name: "和歌山県", lat: 34.23, lon: 135.17 },
    "31": { name: "鳥取県",   lat: 35.50, lon: 134.24 },
    "32": { name: "島根県",   lat: 35.47, lon: 133.05 },
    "33": { name: "岡山県",   lat: 34.66, lon: 133.93 },
    "34": { name: "広島県",   lat: 34.40, lon: 132.46 },
    "35": { name: "山口県",   lat: 34.19, lon: 131.47 },
    "36": { name: "徳島県",   lat: 34.07, lon: 134.56 },
    "37": { name: "香川県",   lat: 34.34, lon: 134.04 },
    "38": { name: "愛媛県",   lat: 33.84, lon: 132.77 },
    "39": { name: "高知県",   lat: 33.56, lon: 133.53 },
    "40": { name: "福岡県",   lat: 33.61, lon: 130.42 },
    "41": { name: "佐賀県",   lat: 33.25, lon: 130.30 },
    "42": { name: "長崎県",   lat: 32.74, lon: 129.87 },
    "43": { name: "熊本県",   lat: 32.79, lon: 130.74 },
    "44": { name: "大分県",   lat: 33.24, lon: 131.61 },
    "45": { name: "宮崎県",   lat: 31.91, lon: 131.42 },
    "46": { name: "鹿児島県", lat: 31.56, lon: 130.56 },
    "47": { name: "沖縄県",   lat: 26.21, lon: 127.68 }
  };

  function lookupCoords(areaCode) {
    var prefix = areaCode.substring(0, 2);
    return AREA_COORDS[prefix] || null;
  }

  // ── Data source tracking ──
  var _sources = { rivers: "mock", landslides: "mock", roads: "mock" };

  function getSources() { return _sources; }

  // ── Mock data (fallback) ──
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

  var ROAD_CLOSURES = [
    { road_id: "RD001", road_name: "国道16号",    section: "八王子〜相模原", lat: 35.6320, lon: 139.3380, cause: "土砂崩れ" },
    { road_id: "RD002", road_name: "国道246号",   section: "厚木〜秦野",   lat: 35.3960, lon: 139.2770, cause: "冠水" },
    { road_id: "RD003", road_name: "首都高速5号線", section: "板橋〜戸田",   lat: 35.7920, lon: 139.6810, cause: "路面凍結" },
    { road_id: "RD004", road_name: "国道1号",     section: "箱根峠付近",   lat: 35.2000, lon: 139.0200, cause: "土砂崩れ" },
    { road_id: "RD005", road_name: "名神高速",    section: "関ヶ原〜米原",  lat: 35.3700, lon: 136.4600, cause: "積雪" }
  ];

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

  function getMockRiverWaterLevels() {
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
        status: status, observed_at: now, source: "mock"
      };
    });
  }

  function getMockRoadClosures() {
    var now = jstNow();
    var count = 1 + Math.floor(Math.random() * ROAD_CLOSURES.length);
    var shuffled = ROAD_CLOSURES.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, count).map(function (rd) {
      var hoursAgo = 1 + Math.floor(Math.random() * 48);
      return {
        road_id: rd.road_id, road_name: rd.road_name, section: rd.section,
        lat: rd.lat, lon: rd.lon, cause: rd.cause,
        status: Math.random() < 0.5 ? "closed" : "restricted",
        since: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        updated_at: now
      };
    });
  }

  function getMockLandslideWarnings() {
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
        risk_score: risk, warning_level: level, observed_at: now, source: "mock"
      };
    });
  }

  // ── Real API fetchers ──

  async function fetchJmaFloodWarnings() {
    var resp = await fetch(JMA_FLOOD_URL);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var raw = await resp.json();
    var now = jstNow();
    var results = [];

    Object.keys(raw).forEach(function (code) {
      var info = raw[code];
      if (typeof info !== "object" || info === null) return;
      var level = parseInt(info.level || info.l, 10);
      if (isNaN(level) || level < 1) return;
      var coords = lookupCoords(code);
      if (!coords) return;

      var status;
      if (level >= 4) status = "danger";
      else if (level >= 3) status = "warning";
      else status = "normal";

      results.push({
        station_id: "JMA-FL-" + code,
        name: coords.name + " 洪水警報域",
        river: coords.name,
        lat: coords.lat, lon: coords.lon,
        water_level_m: level,
        warning_level_m: 3.0, danger_level_m: 4.0,
        status: status, observed_at: now, source: "jma"
      });
    });
    return results;
  }

  async function fetchJmaLandslideWarnings() {
    var resp = await fetch(JMA_SEDIMENT_URL);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var raw = await resp.json();
    var now = jstNow();
    var results = [];

    Object.keys(raw).forEach(function (code) {
      var info = raw[code];
      if (typeof info !== "object" || info === null) return;
      var level = parseInt(info.level || info.l, 10);
      if (isNaN(level) || level < 1) return;
      var coords = lookupCoords(code);
      if (!coords) return;

      var riskScore = Math.min(level / 5.0, 1.0);
      var warnLevel;
      if (riskScore >= 0.8) warnLevel = "very_high";
      else if (riskScore >= 0.6) warnLevel = "high";
      else if (riskScore >= 0.4) warnLevel = "moderate";
      else warnLevel = "low";

      results.push({
        area_id: "JMA-SD-" + code,
        name: coords.name + " 土砂災害警戒区域",
        prefecture: coords.name,
        lat: coords.lat, lon: coords.lon,
        risk_score: Math.round(riskScore * 100) / 100,
        warning_level: warnLevel,
        observed_at: now, source: "jma"
      });
    });
    return results;
  }

  // ── Public API (try real → fallback to mock) ──

  async function getRiverWaterLevels() {
    try {
      var data = await fetchJmaFloodWarnings();
      if (data.length > 0) {
        _sources.rivers = "jma";
        console.log("[InfraData] Fetched " + data.length + " flood entries from JMA");
        return data;
      }
    } catch (e) {
      console.warn("[InfraData] JMA flood API unavailable, using mock:", e.message);
    }
    _sources.rivers = "mock";
    return getMockRiverWaterLevels();
  }

  async function getLandslideWarnings() {
    try {
      var data = await fetchJmaLandslideWarnings();
      if (data.length > 0) {
        _sources.landslides = "jma";
        console.log("[InfraData] Fetched " + data.length + " landslide entries from JMA");
        return data;
      }
    } catch (e) {
      console.warn("[InfraData] JMA sediment API unavailable, using mock:", e.message);
    }
    _sources.landslides = "mock";
    return getMockLandslideWarnings();
  }

  function getRoadClosures() {
    _sources.roads = "mock";
    return getMockRoadClosures();
  }

  return {
    getRiverWaterLevels: getRiverWaterLevels,
    getRoadClosures: getRoadClosures,
    getLandslideWarnings: getLandslideWarnings,
    getSources: getSources
  };
})();
