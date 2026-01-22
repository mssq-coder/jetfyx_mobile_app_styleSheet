import * as signalR from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAppTheme } from "../contexts/ThemeContext";

const DEFAULT_API_BASE_URL =
  "https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";
const DEFAULT_HUB_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/api\/?$/i, "");

// NOTE: You may want to move this to env/config.
const DEFAULT_POLYGON_API_KEY = "pHb5HDupIeUbw06zY6JJ0CqouUqBH1CH";

const safeNumber = (value) => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeSymbolCore = (symbol) =>
  String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/^[CX]:/, "");

const isCryptoSymbol = (core) => {
  const c = normalizeSymbolCore(core);
  const cryptoPrefixes = [
    "BTC",
    "ETH",
    "LTC",
    "XRP",
    "ADA",
    "DOT",
    "LINK",
    "UNI",
    "DOGE",
    "MATIC",
  ];
  return cryptoPrefixes.some((p) => c.startsWith(p));
};

const buildPolygonTicker = (symbol) => {
  const core = normalizeSymbolCore(symbol);
  if (!core) return "";
  return (isCryptoSymbol(core) ? "X:" : "C:") + core;
};

const resolutionToPolygonRange = (resolution) => {
  // Polygon: range/{multiplier}/{timespan}
  // We keep a small subset aligned with your datafeed.
  if (resolution === "1D") return { multiplier: 1, timespan: "day" };
  if (resolution === "1W") return { multiplier: 1, timespan: "week" };
  if (resolution === "1M") return { multiplier: 1, timespan: "month" };
  const minutes = parseInt(String(resolution), 10);
  if (Number.isFinite(minutes) && minutes > 0)
    return { multiplier: minutes, timespan: "minute" };
  return { multiplier: 1, timespan: "minute" };
};

const getBarStartTimeSec = (timestampSec, resolution) => {
  const ts = Number(timestampSec);
  if (!Number.isFinite(ts)) return null;

  if (resolution === "1D") {
    const d = new Date(ts * 1000);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }
  if (resolution === "1W") {
    const d = new Date(ts * 1000);
    const day = d.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + mondayOffset);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }
  if (resolution === "1M") {
    const d = new Date(ts * 1000);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }

  const minutes = parseInt(String(resolution), 10);
  const bucket = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 60;
  return Math.floor(ts / bucket) * bucket;
};

export default function TradingViewChart({
  symbol = "XAUUSD",
  accountId = null,
  resolution = "1",
  showSideToolbar = false,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  hubBaseUrl = DEFAULT_HUB_BASE_URL,
  polygonApiKey = DEFAULT_POLYGON_API_KEY,
  drawMode = "none",
  clearDrawingsToken = 0,
}) {
  const { theme, themeName } = useAppTheme();
  const webRef = useRef(null);
  const lastBarRef = useRef(null);
  const [webReady, setWebReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const chartColors = useMemo(() => {
    const accent = theme.tabActive || theme.headerBlue || theme.primary;
    const isDarkLike = themeName !== "light";
    return {
      isDarkLike,
      background: theme.background,
      text: theme.text,
      grid: theme.border,
      border: theme.border,
      up: theme.positive || "#10b981",
      down: theme.negative || "#ef4444",
      accent,
      toolbarBg: isDarkLike ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.95)",
      toolbarBorder: isDarkLike ? theme.border : "rgba(229,231,235,1)",
    };
  }, [theme, themeName]);

  const html = useMemo(() => {
    // Uses TradingView Lightweight Charts (MIT) inside WebView.
    const bg = JSON.stringify(chartColors.background);
    const text = JSON.stringify(chartColors.text);
    const grid = JSON.stringify(chartColors.grid);
    const border = JSON.stringify(chartColors.border);
    const up = JSON.stringify(chartColors.up);
    const down = JSON.stringify(chartColors.down);
    const accent = JSON.stringify(chartColors.accent);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body { height: 100%; width: 100%; margin: 0; padding: 0; background: ${bg}; }
      #root { height: 100%; width: 100%; position: relative; }
      #chart { height: 100%; width: 100%; }
    </style>
  </head>
  <body>
    <div id="root">
      <div id="chart"></div>
    </div>
    <script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js"></script>
    <script>
      const root = document.getElementById('root');
      const chartEl = document.getElementById('chart');

      const chart = LightweightCharts.createChart(chartEl, {
        width: chartEl.clientWidth,
        height: chartEl.clientHeight,
        layout: { background: { type: 'solid', color: ${bg} }, textColor: ${text} },
        grid: { vertLines: { color: ${grid} }, horzLines: { color: ${grid} } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: ${border} },
        timeScale: { borderColor: ${border}, timeVisible: true, secondsVisible: false },
      });
      const series = chart.addCandlestickSeries({
        upColor: ${up}, downColor: ${down}, borderUpColor: ${up}, borderDownColor: ${down},
        wickUpColor: ${up}, wickDownColor: ${down}
      });

      let barSpacing = 8;

      window.__fit = function() {
        try { chart.timeScale().fitContent(); } catch (e) {}
      };
      window.__zoomIn = function() {
        try {
          barSpacing = Math.min(60, barSpacing + 2);
          chart.timeScale().applyOptions({ barSpacing: barSpacing });
        } catch (e) {}
      };
      window.__zoomOut = function() {
        try {
          barSpacing = Math.max(2, barSpacing - 2);
          chart.timeScale().applyOptions({ barSpacing: barSpacing });
        } catch (e) {}
      };

      function resize() {
        chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight });
      }
      window.addEventListener('resize', resize);

      window.__setBars = function(bars) {
        try {
          series.setData(Array.isArray(bars) ? bars : []);
          if (bars && bars.length) {
            chart.timeScale().fitContent();
          }
        } catch (e) {}
      };
      window.__updateBar = function(bar) {
        try { series.update(bar); } catch (e) {}
      };
      window.__setTheme = function(mode) {
        const dark = mode !== 'light';
        chart.applyOptions({
          layout: { background: { type: 'solid', color: dark ? ${bg} : ${bg} }, textColor: dark ? ${text} : ${text} },
          grid: { vertLines: { color: dark ? ${grid} : ${grid} }, horzLines: { color: dark ? ${grid} : ${grid} } },
          rightPriceScale: { borderColor: dark ? ${border} : ${border} },
          timeScale: { borderColor: dark ? ${border} : ${border} },
        });
      };

      // -----------------------------
      // Drawing tools (minimal)
      // Modes: none | hline | trend
      // -----------------------------
      let __drawMode = 'none';
      let __trendStart = null; // { time, price }
      const __drawings = []; // { type: 'hline', series, handle } | { type: 'trend', series }

      function __timeToSec(t) {
        if (t == null) return null;
        if (typeof t === 'number') return t;
        // business day object
        if (typeof t === 'object' && t.year && t.month && t.day) {
          const d = new Date(Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0, 0));
          return Math.floor(d.getTime() / 1000);
        }
        return null;
      }

      function __resolveTime(param) {
        const direct = __timeToSec(param && param.time);
        if (direct != null) return direct;
        try {
          const maybe = chart.timeScale().coordinateToTime(param.point.x);
          return __timeToSec(maybe);
        } catch (e) {}
        return null;
      }

      function __resolvePrice(param) {
        try {
          return series.coordinateToPrice(param.point.y);
        } catch (e) {}
        return null;
      }

      window.__setDrawMode = function(mode) {
        __drawMode = String(mode || 'none');
        __trendStart = null;
      };

      window.__clearDrawings = function() {
        try {
          while (__drawings.length) {
            const d = __drawings.pop();
            if (!d) continue;
            if (d.type === 'hline' && d.handle && d.series) {
              try { d.series.removePriceLine(d.handle); } catch (e) {}
            }
            if (d.type === 'trend' && d.series) {
              try { chart.removeSeries(d.series); } catch (e) {}
            }
          }
        } catch (e) {}
        __trendStart = null;
      };

      chart.subscribeClick((param) => {
        try {
          if (!param || !param.point) return;
          if (__drawMode === 'none') return;

          const t = __resolveTime(param);
          const p = __resolvePrice(param);
          if (t == null || p == null || !isFinite(p)) return;

          if (__drawMode === 'hline') {
            const h = series.createPriceLine({
              price: p,
              color: ${accent},
              lineWidth: 2,
              lineStyle: LightweightCharts.LineStyle.Solid,
              axisLabelVisible: true,
              title: 'H',
            });
            __drawings.push({ type: 'hline', series, handle: h });
            return;
          }

          if (__drawMode === 'trend') {
            if (!__trendStart) {
              __trendStart = { time: t, price: p };
              return;
            }
            const line = chart.addLineSeries({
              color: ${accent},
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            line.setData([
              { time: __trendStart.time, value: __trendStart.price },
              { time: t, value: p },
            ]);
            __drawings.push({ type: 'trend', series: line });
            __trendStart = null;
            return;
          }
        } catch (e) {}
      });

      window.__ready = true;
    </script>
  </body>
</html>`;
  }, [chartColors]);

  const inject = (js) => {
    if (!webRef.current) return;
    webRef.current.injectJavaScript(`${js}; true;`);
  };

  useEffect(() => {
    if (!webReady) return;
    inject(
      `window.__setTheme && window.__setTheme(${JSON.stringify(themeName || "light")})`,
    );
  }, [themeName, webReady]);

  useEffect(() => {
    if (!webReady) return;
    inject(
      `window.__setDrawMode && window.__setDrawMode(${JSON.stringify(drawMode)})`,
    );
  }, [drawMode, webReady]);

  useEffect(() => {
    if (!webReady) return;
    if (!clearDrawingsToken) return;
    inject("window.__clearDrawings && window.__clearDrawings()");
  }, [clearDrawingsToken, webReady]);

  useEffect(() => {
    setWebReady(false);
    setLoading(true);
    lastBarRef.current = null;
  }, [symbol, resolution]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        if (!polygonApiKey) {
          setLoading(false);
          return;
        }
        const ticker = buildPolygonTicker(symbol);
        if (!ticker) {
          setLoading(false);
          return;
        }

        const { multiplier, timespan } = resolutionToPolygonRange(resolution);
        const nowMs = Date.now();
        const nowSec = Math.floor(nowMs / 1000);
        // Keep history window reasonable for mobile
        const backDays =
          timespan === "minute" ? 7 : timespan === "hour" ? 90 : 365;
        const fromSec = nowSec - backDays * 86400;
        const fromDate = new Date(fromSec * 1000).toISOString().slice(0, 10);
        const toDate = new Date(nowSec * 1000).toISOString().slice(0, 10);

        const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
          ticker,
        )}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(
          polygonApiKey,
        )}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Polygon error ${resp.status}`);
        const json = await resp.json();
        const results = Array.isArray(json?.results) ? json.results : [];

        const bars = results
          .map((b) => {
            const time = Math.floor(Number(b.t) / 1000);
            if (!Number.isFinite(time)) return null;
            return {
              time,
              open: Number(b.o),
              high: Number(b.h),
              low: Number(b.l),
              close: Number(b.c),
            };
          })
          .filter(Boolean);

        if (cancelled) return;
        lastBarRef.current = bars.length ? bars[bars.length - 1] : null;
        if (webReady) {
          inject(`window.__setBars(${JSON.stringify(bars)})`);
        }
      } catch (e) {
        console.warn("Chart history load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [polygonApiKey, symbol, resolution, webReady]);

  // Live updates via SignalR market hub (same idea as your datafeed wsManager)
  useEffect(() => {
    if (!accountId) return;

    let disposed = false;
    let connection = null;

    const start = async () => {
      try {
        const token = (await SecureStore.getItemAsync("accessToken")) ?? "";
        connection = new signalR.HubConnectionBuilder()
          .withUrl(`${hubBaseUrl}/hubs/market`, {
            accessTokenFactory: () => token,
            transport:
              signalR.HttpTransportType.WebSockets |
              signalR.HttpTransportType.LongPolling,
          })
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveMarketUpdate", (payload) => {
          if (disposed) return;
          const sym = String(
            payload?.symbol ?? payload?.Symbol ?? "",
          ).toUpperCase();
          if (!sym) return;
          if (normalizeSymbolCore(sym) !== normalizeSymbolCore(symbol)) return;

          const price = safeNumber(payload?.bid ?? payload?.Bid);
          if (price == null) return;

          const rawTs =
            payload?.ts ??
            payload?.timestamp ??
            payload?.Timestamp ??
            payload?.time;
          const tsMs =
            typeof rawTs === "number"
              ? rawTs
              : rawTs
                ? Date.parse(rawTs)
                : Date.now();
          const tsSec = Math.floor(
            (Number.isFinite(tsMs) ? tsMs : Date.now()) / 1000,
          );
          const barTime = getBarStartTimeSec(tsSec, resolution);
          if (barTime == null) return;

          const last = lastBarRef.current;
          let next;
          if (!last || last.time !== barTime) {
            const prevClose = last?.close ?? price;
            next = {
              time: barTime,
              open: prevClose,
              high: price,
              low: price,
              close: price,
            };
          } else {
            next = {
              time: last.time,
              open: last.open,
              high: Math.max(last.high, price),
              low: Math.min(last.low, price),
              close: price,
            };
          }

          lastBarRef.current = next;
          if (webReady) {
            inject(`window.__updateBar(${JSON.stringify(next)})`);
          }
        });

        await connection.start();
        await connection.invoke("SubscribeAccountSymbols", accountId);
      } catch (e) {
        console.warn("Chart SignalR connection failed", e);
      }
    };

    start();

    return () => {
      disposed = true;
      try {
        connection?.stop?.();
      } catch (_) {}
    };
  }, [accountId, hubBaseUrl, symbol, resolution, webReady]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        source={{ html }}
        onLoadEnd={() => {
          setWebReady(true);
        }}
        style={{ flex: 1, backgroundColor: "transparent" }}
      />

      {showSideToolbar ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            alignItems: "center",
          }}
        >
          {[
            {
              label: "⤢",
              onPress: () => inject("window.__fit && window.__fit()"),
            },
            {
              label: "+",
              onPress: () => inject("window.__zoomIn && window.__zoomIn()"),
            },
            {
              label: "−",
              onPress: () => inject("window.__zoomOut && window.__zoomOut()"),
            },
          ].map((b) => (
            <TouchableOpacity
              key={b.label}
              onPress={b.onPress}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: chartColors.toolbarBorder,
                backgroundColor: chartColors.toolbarBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
              accessibilityRole="button"
              accessibilityLabel="Chart tool"
            >
              <Text
                style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
              >
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  );
}
