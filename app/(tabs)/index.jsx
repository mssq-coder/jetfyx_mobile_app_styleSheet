import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";
import { getFavouriteWatchlistSymbols } from "../../api/auth";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import { createOrder } from "../../api/orders";
import AppIcon from "../../components/AppIcon";
import AllSymbolsSectionList from "../../components/MarketViewComponents/AllSymbolsSectionList";
import ExpandedRow from "../../components/MarketViewComponents/expandedRow";
import { useAppTheme } from "../../contexts/ThemeContext";

// ✅ SignalR client
import * as signalR from "@microsoft/signalr";

export default function Trade() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Favourites");
  const [expandedId, setExpandedId] = useState(null);
  const [lots, setLots] = useState({});
  const [placingOrderForId, setPlacingOrderForId] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoItem, setInfoItem] = useState(null);
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);

  // Keep last rows reachable above the absolute tab bar + FAB
  const bottomInset = insets.bottom || 0;
  const tabBarHeight = 58 + bottomInset;
  const fabBottomOffset = bottomInset + 90;
  const fabHeight = 60;
  const listBottomPadding = Math.max(
    tabBarHeight + 16,
    fabBottomOffset + fabHeight + 16,
  );

  // Detect runtime environment for headers
  const isReactNative =
    typeof navigator !== "undefined" && navigator.product === "ReactNative";
  const isWeb = typeof window !== "undefined";
  const clientOrigin =
    isWeb && window?.location?.origin ? window.location.origin : "react-native";

  // ============================
  // ✅ LIVE PRICE STATE
  // ============================
  const [instruments, setInstruments] = useState([]);
  const [allSymbols, setAllSymbols] = useState([]); // For "All Symbols" tab
  const connectionRef = useRef(null);

  // ⚠️ Replace with your backend API domain
  const API_BASE_URL =
    "https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";
  const HUB_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

  // ============================
  // ✅ WATCHLIST LOAD
  // ============================
  useEffect(() => {
    if (!selectedAccountId) return;

    const loadWatchlist = async () => {
      try {
        if (activeTab === "Favourites") {
          console.log(
            "📊 Market - Loading favourites for account:",
            selectedAccountId,
          );
          const data = await getFavouriteWatchlistSymbols(selectedAccountId);

          // Try to fetch currency list once so we can enrich favourites with metadata
          let currencyList = [];
          try {
            currencyList = await getAllCurrencyListFromDB(selectedAccountId);
          } catch (e) {
            // not fatal — favourites will still show basic info
            console.warn(
              "Could not fetch currency list to enrich favourites",
              e,
            );
          }

          // Build lookup by symbol for quick merge
          const lookup = (
            Array.isArray(currencyList) ? currencyList : []
          ).reduce((acc, cur) => {
            if (cur && cur.symbol) acc[String(cur.symbol)] = cur;
            return acc;
          }, {});

          const mapped = mapWatchlistToInstruments(data, lookup);
          setInstruments(mapped);
        } else if (activeTab === "All Symbols") {
          console.log(
            "📊 Market - Loading all symbols for account:",
            selectedAccountId,
          );
          const data = await getAllCurrencyListFromDB(selectedAccountId);
          const mapped = mapCurrencyListToInstruments(data);
          console.log(`📈 Loaded ${mapped.length} symbols from CurrencyPair`);
          setAllSymbols(mapped);
          setInstruments(mapped);
        }
      } catch (error) {
        console.error("API error:", error);
      }
    };

    loadWatchlist();
  }, [selectedAccountId, activeTab]);

  // ============================
  // ✅ SIGNALR LIVE PRICE CONNECTION
  // ============================
  useEffect(() => {
    if (!selectedAccountId) return;

    const setupConnection = async () => {
      // Get authentication token
      const token = await SecureStore.getItemAsync("accessToken");

      // Setup headers similar to auth.js
      const headers = {
        "X-Client-App": "JetFyXMobile",
        "X-Client-Origin": clientOrigin,
      };

      if (isReactNative) {
        headers["User-Agent"] = "JetFyXMobile";
        headers["Origin"] = clientOrigin;
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${HUB_BASE_URL}/hubs/market`, {
          accessTokenFactory: () => token,
          // Allow fallback if WS is blocked
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.LongPolling,
          headers: headers,
        })
        .withAutomaticReconnect()
        .build();

      connectionRef.current = connection;

      // 🔥 Receive live price updates
      connection.on("ReceiveMarketUpdate", (payload) => {
        /**
         * Example payload:
         * {
         *   symbol: "EURUSD",
         *   bid: 1.08512,
         *   ask: 1.08518,
         *   ts: "2026-01-13T10:25:12Z",
         *   high: 1.08700,
         *   low: 1.08320
         * }
         */

        const symbol = payload?.symbol;
        if (!symbol) return;

        setInstruments((prev) =>
          prev.map((item) => {
            if (item.symbol !== symbol) return item;
            // console.log(`🔔 Price update for ${symbol}:`, payload);

            // Extract digits from payload, fallback to stored digits
            const digits = payload.digits ?? item.digits ?? 5;
            const parsedDigits = Number.isFinite(Number(digits))
              ? parseInt(digits, 10)
              : 5;

            // Store raw numeric values
            const rawBid = payload.bid ?? item._rawBid ?? null;
            const rawAsk = payload.ask ?? item._rawAsk ?? null;
            const prevRawPrice = item._rawPrice;

            // Helper to format with toFixed(digits)
            const format = (value) => {
              if (value == null) return null;
              return Number(value).toFixed(parsedDigits);
            };

            // Calculate mid price from raw values
            const rawMidPrice =
              rawBid != null && rawAsk != null
                ? (rawBid + rawAsk) / 2
                : prevRawPrice;

            return {
              ...item,

              // ============================
              // ✅ STORE RAW VALUES & DIGITS
              // ============================
              _rawBid: rawBid,
              _rawAsk: rawAsk,
              _rawPrice: rawMidPrice,
              digits: parsedDigits,

              // ============================
              // ✅ FORMAT DISPLAY VALUES
              // ============================
              bid: format(rawBid),
              ask: format(rawAsk),
              price: format(rawMidPrice),

              // ============================
              // ✅ LIVE TIME UPDATE
              // ============================
              time: payload.ts
                ? new Date(payload.ts).toLocaleTimeString()
                : item.time,

              // ============================
              // ✅ HIGH / LOW UPDATE
              // ============================
              high: payload.high ?? item.high,
              low: payload.low ?? item.low,
              highValue: payload.high ?? item.highValue,

              // ============================
              // ✅ CHANGE CALCULATION
              // ============================
              change:
                prevRawPrice != null && rawMidPrice != null
                  ? (rawMidPrice - prevRawPrice).toFixed(parsedDigits)
                  : item.change,

              // ============================
              // ✅ POSITIVE / NEGATIVE FLAG
              // ============================
              isPositive:
                prevRawPrice != null && rawMidPrice != null
                  ? rawMidPrice >= prevRawPrice
                  : item.isPositive,

              // ============================
              // ✅ SPREAD CALCULATION
              // ============================
              // spread:
              //   rawAsk != null && rawBid != null
              //     ? (rawAsk - rawBid).toFixed(parsedDigits)
              //     : item.spread,
            };
          }),
        );
      });

      // 🚀 Start connection and subscribe
      connection
        .start()
        .then(() => {
          console.log("✅ SignalR connected");
          connection.invoke("SubscribeAccountSymbols", selectedAccountId);
        })
        .catch((err) => {
          console.error("❌ SignalR error:", err);
        });

      return () => {
        console.log("🧹 Closing SignalR connection");
        connection.stop();
      };
    };

    const cleanup = setupConnection();
    return () => {
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
      } else if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [selectedAccountId, clientOrigin, isReactNative]);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openInfo = (item) => {
    setInfoItem(item ?? null);
    setInfoVisible(true);
  };

  const closeInfo = () => {
    setInfoVisible(false);
    setInfoItem(null);
  };

  const placeOrder = async ({ instrumentId, symbol, lotSize, side }) => {
    if (!selectedAccountId) {
      Alert.alert("Account missing", "Please select an account first.");
      return;
    }
    if (!symbol) {
      Alert.alert("Symbol missing", "Please select a symbol first.");
      return;
    }

    const orderType = side === "BUY" ? 0 : 1;

    try {
      setPlacingOrderForId(instrumentId);

      const payload = {
        accountId: Number(selectedAccountId),
        lotSize: String(lotSize ?? "0.01"),
        orderTime: new Date().toISOString(),
        orderType,
        remark: "",
        status: 0,
        stopLoss: 0,
        symbol: String(symbol),
        takeProfit: 0,
      };

      const response = await createOrder(payload);
      console.log("✅ Order created:", response);
      Alert.alert("Order placed", `${side} ${symbol} ${payload.lotSize}`);
      setExpandedId(null);
    } catch (error) {
      console.error("❌ Create order failed:", error?.response?.data ?? error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to create order. Please try again.";
      Alert.alert("Order failed", String(message));
    } finally {
      setPlacingOrderForId(null);
    }
  };

  const tabs = ["Favourites", "All Symbols"];
  // ============================
  // ✅ MAP WATCHLIST TO INSTRUMENTS
  // ============================
  const mapWatchlistToInstruments = (watchlist = [], currencyLookup = {}) => {
    return (Array.isArray(watchlist) ? watchlist.slice() : [])
      .sort((a, b) => (a.sortOrderId || 0) - (b.sortOrderId || 0))
      .map((item) => {
        const symbol = String(item.symbol || "");
        const meta = currencyLookup[symbol] || {};

        return {
          id: String(item.id),
          symbol,

          // Merge useful metadata from currency list when available
          description: meta.description ?? item.description ?? null,
          digits: Number.isFinite(Number(meta.digits ?? item.digits))
            ? parseInt(meta.digits ?? item.digits, 10)
            : 5,
          minLotSize: meta.minLotSize ?? item.minLotSize ?? null,
          maxLotSize: meta.maxLotSize ?? item.maxLotSize ?? null,
          lotStepSize: meta.lotStepSize ?? item.lotStepSize ?? null,
          contractSize: meta.contractSize ?? item.contractSize ?? null,
          contractValue: meta.contractValue ?? item.contractValue ?? null,
          buySpread: meta.buySpread ?? item.buySpread ?? null,
          sellSpread: meta.sellSpread ?? item.sellSpread ?? null,
          commission: meta.commission ?? item.commission ?? null,
          swapLong: meta.swapLong ?? item.swapLong ?? null,
          swapShort: meta.swapShort ?? item.swapShort ?? null,
          sessionQuotes: meta.sessionQuotes ?? item.sessionQuotes ?? null,

          // Initial values — will update live from SignalR
          price: null,
          bid: null,
          ask: null,
          _rawPrice: null,
          _rawBid: null,
          _rawAsk: null,
          change: null,
          time: null,
          high: null,
          low: null,
          highValue: null,
          isPositive: true,
          spread: null,
        };
      });
  };

  // ============================
  // ✅ MAP ALL SYMBOLS (CurrencyPair) TO INSTRUMENTS
  // ============================
  const mapCurrencyListToInstruments = (list = []) => {
    return (Array.isArray(list) ? list : [])
      .filter((item) => item && item.symbol)
      .filter((item) => item.isSymbolVisible !== false)
      .map((item) => ({
        // Keep ID + key fields for later use
        id: String(item.id),
        symbol: String(item.symbol),
        description: item.description ?? null,
        currencyGroupId: item.currencyGroupId ?? null,
        currencyGroupName: item.currencyGroupName ?? null,
        categoryName: item.categoryName ?? null,
        sectorName: item.sectorName ?? null,

        // Trading constraints / metadata you said you need later
        digits: Number.isFinite(Number(item.digits))
          ? parseInt(item.digits, 10)
          : 5,
        minLotSize: item.minLotSize ?? null,
        maxLotSize: item.maxLotSize ?? null,
        lotStepSize: item.lotStepSize ?? null,
        contractSize: item.contractSize ?? null,
        contractValue: item.contractValue ?? null,
        executionType: item.executionType ?? null,
        tradeAccess: item.tradeAccess ?? null,
        spreadType: item.spreadType ?? null,
        fixedSpread: item.fixedSpread ?? null,
        buySpread: item.buySpread ?? null,
        sellSpread: item.sellSpread ?? null,
        commission: item.commission ?? null,
        swapLong: item.swapLong ?? null,
        swapShort: item.swapShort ?? null,
        contractUnits: item.contractUnits ?? null,
        baseCurrency: item.baseCurrency ?? null,
        marginCurrency: item.marginCurrency ?? null,
        profitCurrency: item.profitCurrency ?? null,
        marginCalculationType: item.marginCalculationType ?? null,
        marginPercentage: item.marginPercentage ?? null,
        limitAndStopLevelPoints: item.limitAndStopLevelPoints ?? null,
        orderType: item.orderType ?? null,
        sessionQuotes: item.sessionQuotes ?? null,

        // Initial values — will update live from SignalR
        price: null,
        bid: null,
        ask: null,
        _rawPrice: null,
        _rawBid: null,
        _rawAsk: null,
        change: null,
        time: null,
        high: null,
        low: null,
        highValue: null,
        isPositive: true,
        spread: null,
      }));
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.background }}
      pointerEvents="box-none"
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Instrument Info Modal */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="slide"
        onRequestClose={closeInfo}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 18,
              maxHeight: "80%",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}
                >
                  {infoItem?.symbol
                    ? String(infoItem.symbol)
                    : "Instrument Info"}
                </Text>
                {infoItem?.description ? (
                  <Text
                    style={{ color: theme.secondary, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {String(infoItem.description)}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={closeInfo}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                accessibilityRole="button"
                accessibilityLabel="Close instrument info"
              >
                <AppIcon name="close" size={18} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                const rows = [
                  ["Group", infoItem?.currencyGroupName],
                  ["Category", infoItem?.categoryName],
                  ["Sector", infoItem?.sectorName],
                  ["Digits", infoItem?.digits],
                  ["Min Lot", infoItem?.minLotSize],
                  ["Max Lot", infoItem?.maxLotSize],
                  ["Lot Step", infoItem?.lotStepSize],
                  ["Contract Size", infoItem?.contractSize],
                  ["Contract Value", infoItem?.contractValue],
                  ["Contract Units", infoItem?.contractUnits],
                  ["Execution", infoItem?.executionType],
                  ["Trade Access", infoItem?.tradeAccess],
                  ["Spread Type", infoItem?.spreadType],
                  ["Fixed Spread", infoItem?.fixedSpread],
                  ["Buy Spread", infoItem?.buySpread],
                  ["Sell Spread", infoItem?.sellSpread],
                  ["Commission", infoItem?.commission],
                  ["Swap Long", infoItem?.swapLong],
                  ["Swap Short", infoItem?.swapShort],
                  ["Base Currency", infoItem?.baseCurrency],
                  ["Margin Currency", infoItem?.marginCurrency],
                  ["Profit Currency", infoItem?.profitCurrency],
                  ["Margin Type", infoItem?.marginCalculationType],
                  ["Margin %", infoItem?.marginPercentage],
                  ["Limit/Stop Level", infoItem?.limitAndStopLevelPoints],
                ];

                return rows.map(([label, value]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.secondary,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 13,
                        fontWeight: "700",
                        marginLeft: 12,
                        flex: 1,
                        textAlign: "right",
                      }}
                      numberOfLines={2}
                    >
                      {value == null || value === "" ? "--" : String(value)}
                    </Text>
                  </View>
                ));
              })()}

              {Array.isArray(infoItem?.orderType) &&
              infoItem.orderType.length ? (
                <View style={{ paddingVertical: 12 }}>
                  <Text
                    style={{
                      color: theme.secondary,
                      fontSize: 13,
                      fontWeight: "700",
                      marginBottom: 8,
                    }}
                  >
                    Order Types
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {infoItem.orderType.map((t) => (
                      <View
                        key={String(t)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: theme.primary + "15",
                          borderWidth: 1,
                          borderColor: theme.primary + "35",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "700",
                            fontSize: 12,
                          }}
                        >
                          {String(t)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Header with Tabs */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
            borderRadius: 25,
            padding: 4,
            marginHorizontal: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Tabs */}
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 20,
                backgroundColor:
                  activeTab === tab ? theme.primary : "transparent",
                marginHorizontal: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? "#fff" : theme.text,
                  fontSize: 15,
                  fontWeight: activeTab === tab ? "600" : "500",
                  textAlign: "center",
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Symbol List */}
      {activeTab === "All Symbols" ? (
        <AllSymbolsSectionList
          theme={theme}
          data={instruments}
          expandedId={expandedId}
          onToggleExpand={toggleExpand}
          lots={lots}
          setLots={setLots}
          placingOrderForId={placingOrderForId}
          onOpenInfo={openInfo}
          bottomPadding={listBottomPadding}
          onBuy={({ instrumentId, symbol, lotSize }) =>
            placeOrder({ instrumentId, symbol, lotSize, side: "BUY" })
          }
          onSell={({ instrumentId, symbol, lotSize }) =>
            placeOrder({ instrumentId, symbol, lotSize, side: "SELL" })
          }
        />
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={instruments}
            keyExtractor={(item) => String(item.id)}
            onDragEnd={({ data }) => setInstruments(data)}
            contentContainerStyle={{ paddingBottom: listBottomPadding }}
            renderItem={({ item, drag, isActive }) => (
              <ScaleDecorator>
                {(() => {
                  const digits = Number.isFinite(Number(item.digits))
                    ? parseInt(item.digits, 10)
                    : 5;
                  const placeholder = `0.${"0".repeat(Math.max(digits, 1))}`;
                  const formatVal = (val) => {
                    if (val == null || val === "") return placeholder;
                    const num = Number(val);
                    return Number.isFinite(num)
                      ? num.toFixed(digits)
                      : placeholder;
                  };
                  item.__displayBid = formatVal(item.bid ?? item._rawBid);
                  item.__displayAsk = formatVal(item.ask ?? item._rawAsk);
                })()}
                <TouchableOpacity
                  onPress={() => toggleExpand(item.id)}
                  onLongPress={drag}
                  disabled={isActive}
                  style={{
                    marginHorizontal: 12,
                    marginVertical: 6,
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? theme.primary + "15"
                      : theme.card,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? theme.primary : theme.border,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {expandedId === item.id ? (
                    <ExpandedRow
                      symbol={item.symbol}
                      lotSize={lots[item.id] ?? "0.01"}
                      buyPrice={item.ask}
                      sellPrice={item.bid}
                      low={item.low}
                      high={item.high}
                      isPlacing={placingOrderForId === item.id}
                      onInfo={() => openInfo(item)}
                      onChangeLot={(value) =>
                        setLots((prev) => ({
                          ...prev,
                          [item.id]: value,
                        }))
                      }
                      onBuy={() =>
                        placeOrder({
                          instrumentId: item.id,
                          symbol: item.symbol,
                          lotSize: lots[item.id] ?? "0.01",
                          side: "BUY",
                        })
                      }
                      onSell={() =>
                        placeOrder({
                          instrumentId: item.id,
                          symbol: item.symbol,
                          lotSize: lots[item.id] ?? "0.01",
                          side: "SELL",
                        })
                      }
                      onClose={() => toggleExpand(item.id)}
                      onIncrease={() =>
                        setLots((prev) => ({
                          ...prev,
                          [item.id]: (
                            parseFloat(prev[item.id] ?? "0.01") + 0.01
                          ).toFixed(2),
                        }))
                      }
                      onDecrease={() =>
                        setLots((prev) => ({
                          ...prev,
                          [item.id]: Math.max(
                            0.01,
                            parseFloat(prev[item.id] ?? "0.01") - 0.01,
                          ).toFixed(2),
                        }))
                      }
                    />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                      }}
                    >
                      {/* Left: Symbol & Meta Info */}
                      <View style={{ flex: 1.5 }}>
                        <Text
                          style={{
                            color: theme.secondary,
                            fontSize: 11,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          {item.time || "--"}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 18,
                            fontWeight: "700",
                            letterSpacing: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          {item.symbol}
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Text
                            style={{
                              color: item.isPositive
                                ? theme.positive
                                : theme.negative,
                              fontSize: 13,
                              fontWeight: "600",
                              marginRight: 4,
                            }}
                          >
                            {item.isPositive ? "↑" : "↓"} {item.change || "--"}
                          </Text>
                        </View>
                      </View>

                      {/* Middle: Sell & Buy in columns */}
                      <View style={styles.priceRow}>
                        <View
                          style={[
                            styles.priceBox,
                            { borderColor: theme.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.sellPriceText,
                              { color: theme.negative },
                            ]}
                          >
                            {item.__displayBid}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.priceBox,
                            { borderColor: theme.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.buyPriceText,
                              { color: theme.positive },
                            ]}
                          >
                            {item.__displayAsk}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Indicator */}
                      <View
                        style={{
                          width: 24,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ fontSize: 20, color: theme.secondary }}>
                          ›
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </ScaleDecorator>
            )}
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: "center" }}>
                <AppIcon name="show-chart" size={48} color={theme.secondary} />
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 16,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No favourite symbols found
                </Text>
              </View>
            }
          />
        </GestureHandlerRootView>
      )}

      {/* Floating Create Order Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push("/orderScreen")}
        style={{
          position: "absolute",
          right: 18,
          bottom: insets.bottom + 90,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 6,
          zIndex: 1,
        }}
        accessibilityRole="button"
        accessibilityLabel="Create order"
      >
        <AppIcon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  priceRow: {
    flex: 1.2,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  priceBox: {
    minWidth: 60,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  sellPriceText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  buyPriceText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
});
