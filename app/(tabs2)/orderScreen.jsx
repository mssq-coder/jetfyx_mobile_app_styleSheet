import * as signalR from "@microsoft/signalr";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import { createOrder } from "../../api/orders";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import TradingViewChart from "../../components/TradingViewChart";
import { useAppTheme } from "../../contexts/ThemeContext";
import useAccountSummary from "../../hooks/useAccountSummary";
import { useAuthStore } from "../../store/authStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const API_BASE_URL =
  "https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";
const HUB_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");

const safeNumber = (value) => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const countDecimals = (value) => {
  const n = safeNumber(value);
  if (n == null) return 0;
  const s = String(n);
  if (s.includes("e-")) {
    const [, exp] = s.split("e-");
    const expNum = parseInt(exp, 10);
    return Number.isFinite(expNum) ? expNum : 0;
  }
  const parts = s.split(".");
  return parts[1] ? parts[1].length : 0;
};

const formatPrice = (value, digits) => {
  const n = safeNumber(value);
  const d = Number.isFinite(Number(digits))
    ? Math.max(0, parseInt(digits, 10))
    : 2;
  if (n == null) return "--";
  return Number(n).toFixed(d);
};

export default function Orders() {
  const { theme, themeName } = useAppTheme();
  const router = useRouter();
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);
  const sharedAccounts = useAuthStore((state) => state.sharedAccounts);
  const fullName = useAuthStore((state) => state.fullName);
  const setSelectedAccount = useAuthStore((state) => state.setSelectedAccount);
  const currentAccount = useMemo(() => {
    const id = selectedAccountId;
    return (
      (Array.isArray(accounts) ? accounts : []).find(
        (a) => (a?.accountId ?? a?.id) === id,
      ) ?? null
    );
  }, [accounts, selectedAccountId]);
  const { summary } = useAccountSummary(null, selectedAccountId, API_BASE_URL);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [isSymbolModalVisible, setSymbolModalVisible] = useState(false);
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  const [isTradingModalVisible, setTradingModalVisible] = useState(false);
  const [orderType, setOrderType] = useState("BUY");
  const [topTab, setTopTab] = useState("Chart");
  const [tradeTab, setTradeTab] = useState("Market");
  const [regularSettingsOpen, setRegularSettingsOpen] = useState(true);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const connectionRef = useRef(null);
  const symbolsBySymbolRef = useRef({});
  const modalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [symbols, setSymbols] = useState([]);
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [lot, setLot] = useState(0.01);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");

  const symbolsBySymbol = useMemo(() => {
    return (Array.isArray(symbols) ? symbols : []).reduce((acc, item) => {
      if (item?.symbol) acc[String(item.symbol)] = item;
      return acc;
    }, {});
  }, [symbols]);

  useEffect(() => {
    symbolsBySymbolRef.current = symbolsBySymbol;
  }, [symbolsBySymbol]);

  const instrument = symbolsBySymbol[symbol] || null;
  const digits = instrument?.digits ?? quotesBySymbol?.[symbol]?.digits ?? 2;
  const priceStep = useMemo(() => {
    const d = Number.isFinite(Number(digits))
      ? Math.max(0, parseInt(digits, 10))
      : 2;
    return d > 0 ? 10 ** -d : 1;
  }, [digits]);

  const quote = quotesBySymbol?.[symbol] || {};
  const bidStr = formatPrice(quote?.bid, digits);
  const askStr = formatPrice(quote?.ask, digits);
  const description = instrument?.description || "";
  const changePct = safeNumber(quote?.changePct);
  const lowStr = formatPrice(quote?.low, digits);
  const highStr = formatPrice(quote?.high, digits);
  const isPositiveChange = changePct != null && changePct >= 0;

  const getReferencePrice = () => {
    const price =
      orderType === "BUY" ? safeNumber(quote?.ask) : safeNumber(quote?.bid);
    return price;
  };

  const currentTradePriceStr = orderType === "BUY" ? askStr : bidStr;

  // Animate modal
  useEffect(() => {
    if (isTradingModalVisible) {
      Animated.spring(modalTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(modalTranslateY, {
        toValue: SCREEN_HEIGHT,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [isTradingModalVisible]);

  // Load symbols metadata
  useEffect(() => {
    if (!selectedAccountId) return;

    let isCancelled = false;

    const loadSymbols = async () => {
      try {
        const data = await getAllCurrencyListFromDB(selectedAccountId);
        const mapped = (Array.isArray(data) ? data : [])
          .filter((item) => item && item.symbol)
          .filter((item) => item.isSymbolVisible !== false)
          .map((item) => ({
            id: String(item.id),
            symbol: String(item.symbol),
            description: item.description ?? "",
            digits: Number.isFinite(Number(item.digits))
              ? parseInt(item.digits, 10)
              : 2,
            minLotSize: item.minLotSize ?? null,
            maxLotSize: item.maxLotSize ?? null,
            lotStepSize: item.lotStepSize ?? null,
          }));

        if (isCancelled) return;
        setSymbols(mapped);
        if (!mapped.length) return;
        setSymbol((prev) =>
          mapped.some((x) => x.symbol === prev) ? prev : mapped[0].symbol,
        );
      } catch (e) {
        console.warn("OrderScreen - failed to load symbols", e);
      }
    };

    loadSymbols();
    return () => {
      isCancelled = true;
    };
  }, [selectedAccountId]);

  // SignalR: live bid/ask
  useEffect(() => {
    if (!selectedAccountId) return;

    const isReactNative =
      typeof navigator !== "undefined" && navigator.product === "ReactNative";
    const isWeb = typeof window !== "undefined";
    const clientOrigin =
      isWeb && window?.location?.origin
        ? window.location.origin
        : "react-native";

    let isDisposed = false;

    const setupConnection = async () => {
      const token = (await SecureStore.getItemAsync("accessToken")) ?? "";
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
          transport:
            signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.LongPolling,
          headers,
        })
        .withAutomaticReconnect()
        .build();

      connectionRef.current = connection;

      connection.on("ReceiveMarketUpdate", (payload) => {
        if (isDisposed) return;
        const sym = payload?.symbol ? String(payload.symbol) : null;
        if (!sym) return;

        const bid = safeNumber(payload?.bid);
        const ask = safeNumber(payload?.ask);
        const fallbackDigits = symbolsBySymbolRef.current?.[sym]?.digits ?? 2;
        const parsedDigits = Number.isFinite(Number(payload?.digits))
          ? parseInt(payload.digits, 10)
          : fallbackDigits;

        setQuotesBySymbol((prev) => {
          const prevForSymbol = prev?.[sym] || {};
          const nextBid = bid ?? prevForSymbol?.bid ?? null;
          const nextAsk = ask ?? prevForSymbol?.ask ?? null;
          const nextMid =
            nextBid != null && nextAsk != null
              ? (nextBid + nextAsk) / 2
              : (prevForSymbol?.mid ?? null);
          const prevMid = prevForSymbol?.mid ?? null;
          const nextChangePct =
            prevMid != null && nextMid != null && prevMid !== 0
              ? ((nextMid - prevMid) / prevMid) * 100
              : (prevForSymbol?.changePct ?? null);

          return {
            ...prev,
            [sym]: {
              ...prevForSymbol,
              bid: nextBid,
              ask: nextAsk,
              mid: nextMid,
              changePct: nextChangePct,
              low: payload?.low ?? prevForSymbol?.low ?? null,
              high: payload?.high ?? prevForSymbol?.high ?? null,
              digits: parsedDigits,
              ts: payload?.ts ?? prevForSymbol?.ts ?? null,
            },
          };
        });
      });

      try {
        await connection.start();
        await connection.invoke("SubscribeAccountSymbols", selectedAccountId);
      } catch (err) {
        console.error("❌ OrderScreen SignalR error:", err);
      }
    };

    setupConnection();

    return () => {
      isDisposed = true;
      try {
        connectionRef.current?.stop?.();
      } catch (_) {}
      connectionRef.current = null;
    };
  }, [selectedAccountId]);

  // Lot constraints
  const lotMin = safeNumber(instrument?.minLotSize) ?? 0.01;
  const lotStep = safeNumber(instrument?.lotStepSize) ?? 0.01;
  const lotMax = safeNumber(instrument?.maxLotSize);
  const lotDecimals = Math.min(6, Math.max(2, countDecimals(lotStep)));

  const normalizeLot = useCallback(
    (value) => {
      let v = safeNumber(value);
      if (v == null) v = lotMin;
      if (v < lotMin) v = lotMin;
      if (lotMax != null && v > lotMax) v = lotMax;
      if (lotStep > 0) {
        v = lotMin + Math.round((v - lotMin) / lotStep) * lotStep;
      }
      if (v < lotMin) v = lotMin;
      if (lotMax != null && v > lotMax) v = lotMax;
      return Number(v.toFixed(lotDecimals));
    },
    [lotDecimals, lotMax, lotMin, lotStep],
  );

  useEffect(() => {
    setLot((prev) => normalizeLot(prev));
  }, [symbol, normalizeLot]);

  const adjustLotBySteps = (steps) => {
    setLot((prev) =>
      normalizeLot((safeNumber(prev) ?? lotMin) + steps * lotStep),
    );
  };

  const adjustField = (setter, value, direction) => {
    const current = safeNumber(value);
    const base = current != null ? current : (getReferencePrice() ?? 0);
    const next = base + direction * priceStep;
    setter(formatPrice(next, digits));
  };

  const normalizePriceInput = (value) => {
    const n = safeNumber(value);
    if (n == null) return value;
    return formatPrice(n, digits);
  };

  const executeOrder = async (side) => {
    try {
      if (!selectedAccountId) {
        Alert.alert("Account missing", "Please select an account first.");
        return;
      }

      const orderTypeNum = side === "BUY" ? 0 : 1;

      const payload = {
        accountId: Number(selectedAccountId),
        lotSize: String(lot ?? "0.01"),
        orderTime: new Date().toISOString(),
        orderType: orderTypeNum,
        remark: "",
        status: 0,
        stopLoss: Number(sl) || 0,
        symbol: String(symbol),
        takeProfit: Number(tp) || 0,
      };

      const resp = await createOrder(payload);
      Alert.alert("✅ Order Placed", `${side} ${symbol} ${payload.lotSize}`);
      setTradingModalVisible(false);
    } catch (err) {
      console.error("Create order failed:", err?.response?.data ?? err);
      const message =
        err?.response?.data?.message || err?.message || String(err);
      Alert.alert("❌ Order Failed", message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={themeName === "light" ? "dark-content" : "light-content"}
      />

      {/* Enhanced Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${theme.card}80`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="arrow-back" color={theme.text} size={22} />
          </TouchableOpacity>

          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <TouchableOpacity
                onPress={() => setAccountModalVisible(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.positive,
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: theme.text }}
                >
                  {String(
                    currentAccount?.accountNumber ?? selectedAccountId ?? "--",
                  )}
                </Text>
                <AppIcon
                  name="keyboard-arrow-down"
                  color={theme.secondary}
                  size={18}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: theme.text,
                  marginRight: 12,
                }}
              >
                $
                {summary?.balance != null
                  ? Number(summary.balance).toFixed(2)
                  : "--"}
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: `${theme.positive}20`,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: theme.positive,
                  }}
                >
                  {String(currentAccount?.accountType ?? "DEMO")}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsFavourite((v) => !v)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${theme.card}80`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon
              name={isFavourite ? "star" : "star-border"}
              color={isFavourite ? theme.primary : theme.secondary}
              size={22}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Symbol Selection Row */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setSymbolModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: theme.background,
                borderWidth: 2,
                borderColor: theme.primary,
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: theme.text,
                  marginRight: 8,
                }}
              >
                {symbol}
              </Text>
              <AppIcon name="expand-more" color={theme.primary} size={20} />
            </TouchableOpacity>

            {/* Change Indicator */}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isPositiveChange
                  ? `${theme.positive}20`
                  : `${theme.negative}20`,
                borderWidth: 1,
                borderColor: isPositiveChange ? theme.positive : theme.negative,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "900",
                  color: isPositiveChange ? theme.positive : theme.negative,
                }}
              >
                {changePct == null
                  ? "--"
                  : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: theme.secondary,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  LOW
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: theme.negative,
                  }}
                >
                  {lowStr}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: theme.border }} />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: theme.secondary,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  HIGH
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: theme.positive,
                  }}
                >
                  {highStr}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Enhanced Top Tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 0,
          backgroundColor: theme.background,
        }}
      >
        {["Chart", "Info", "News"].map((t) => {
          const active = topTab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTopTab(t)}
              style={{
                marginRight: 24,
                paddingBottom: 12,
                position: "relative",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: active ? "900" : "600",
                  color: active ? theme.text : theme.secondary,
                  letterSpacing: 0.3,
                }}
              >
                {t}
              </Text>
              {active && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: theme.primary,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Symbol Selection Modal */}
      <Modal
        visible={isSymbolModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSymbolModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSymbolModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 20,
              paddingVertical: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 10,
              maxHeight: SCREEN_HEIGHT * 0.7,
            }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: theme.text,
                  textAlign: "center",
                }}
              >
                Select Symbol
              </Text>
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}>
              {(Array.isArray(symbols) && symbols.length
                ? symbols
                : [{ symbol, description }]
              ).map((item, index) => {
                const s = item.symbol;
                const q = quotesBySymbol?.[s];
                const d = item?.digits ?? q?.digits ?? 2;
                const b = formatPrice(q?.bid, d);
                const a = formatPrice(q?.ask, d);
                const change = q?.changePct || 0;
                const isItemPositive = change >= 0;

                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setSymbol(s);
                      setSymbolModalVisible(false);
                    }}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      backgroundColor:
                        symbol === s ? `${theme.primary}15` : theme.background,
                      borderBottomWidth: index < symbols.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "800",
                              color: symbol === s ? theme.primary : theme.text,
                            }}
                          >
                            {s}
                          </Text>
                          <View
                            style={{
                              marginLeft: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: isItemPositive
                                ? `${theme.positive}20`
                                : `${theme.negative}20`,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "800",
                                color: isItemPositive
                                  ? theme.positive
                                  : theme.negative,
                              }}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(2)}%
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.secondary,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {item?.description || ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <View
                          style={{
                            backgroundColor:
                              symbol === s ? theme.primary : theme.positive,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "800",
                              color: "#FFFFFF",
                            }}
                          >
                            {a}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.secondary }}>
                          Bid: {b}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {topTab === "Chart" ? (
          <TradingViewChart symbol={symbol} accountId={selectedAccountId} />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: `${theme.primary}15`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <AppIcon
                name={topTab === "Info" ? "info" : "newspaper"}
                size={40}
                color={theme.primary}
              />
            </View>
            <Text
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              {topTab === "Info" ? "Symbol Information" : "Market News"}
            </Text>
            <Text
              style={{
                color: theme.secondary,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {topTab === "Info"
                ? "Detailed information about " + symbol + " coming soon"
                : "Latest market news and analysis coming soon"}
            </Text>
          </View>
        )}
      </View>

      {/* Enhanced Trading Bottom Sheet Modal */}
      <Modal
        visible={isTradingModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setTradingModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTradingModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <Animated.View
            style={{
              transform: [{ translateY: modalTranslateY }],
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: theme.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 20,
                paddingBottom: 34,
                paddingHorizontal: 20,
                minHeight: 460,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 20,
              }}
            >
              {/* Sheet Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${theme.primary}20`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <AppIcon
                      name={
                        orderType === "BUY" ? "trending-up" : "trending-down"
                      }
                      size={20}
                      color={
                        orderType === "BUY" ? theme.positive : theme.negative
                      }
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "900",
                        color: theme.text,
                      }}
                    >
                      {orderType === "BUY" ? "Buy" : "Sell"} {symbol}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.secondary,
                        marginTop: 2,
                      }}
                    >
                      {orderType === "BUY" ? "at Ask price" : "at Bid price"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setTradingModalVisible(false)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${theme.card}80`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppIcon name="close" color={theme.secondary} size={22} />
                </TouchableOpacity>
              </View>

              {/* Current Price Display */}
              <View
                style={{
                  backgroundColor:
                    orderType === "BUY"
                      ? `${theme.positive}15`
                      : `${theme.negative}15`,
                  padding: 20,
                  borderRadius: 16,
                  marginBottom: 20,
                  borderWidth: 2,
                  borderColor:
                    orderType === "BUY" ? theme.positive : theme.negative,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color:
                      orderType === "BUY" ? theme.positive : theme.negative,
                    textAlign: "center",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Current {orderType === "BUY" ? "Ask" : "Bid"} Price
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "900",
                    color:
                      orderType === "BUY" ? theme.positive : theme.negative,
                    textAlign: "center",
                  }}
                >
                  {currentTradePriceStr}
                </Text>
              </View>

              {/* Lot Size Control */}
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.text,
                    }}
                  >
                    Lot Size
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.secondary }}>
                    Min {lotMin.toFixed(lotDecimals)} • Max{" "}
                    {lotMax?.toFixed(lotDecimals) || "∞"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: theme.card,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => adjustLotBySteps(-1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: `${theme.secondary}15`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "900",
                        color: theme.secondary,
                      }}
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: "900",
                        color: theme.text,
                        marginBottom: 4,
                      }}
                    >
                      {Number(lot).toFixed(lotDecimals)}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      Volume
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => adjustLotBySteps(1)}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: `${theme.primary}15`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "900",
                        color: theme.primary,
                      }}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* TP/SL Toggles */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: theme.text,
                        }}
                      >
                        Take Profit
                      </Text>
                      <Switch
                        value={tpEnabled}
                        onValueChange={setTpEnabled}
                        trackColor={{
                          false: theme.border,
                          true: theme.positive,
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    {tpEnabled && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => adjustField(setTp, tp, -1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: `${theme.secondary}10`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              color: theme.secondary,
                              fontWeight: "700",
                            }}
                          >
                            −
                          </Text>
                        </TouchableOpacity>

                        <TextInput
                          value={tp}
                          onChangeText={setTp}
                          onFocus={() => {
                            try {
                              const ref = getReferencePrice();
                              if (
                                ref != null &&
                                (!tp || String(tp).trim() === "")
                              ) {
                                setTp(formatPrice(ref, digits));
                              }
                            } catch (_) {}
                          }}
                          placeholder="TP Price"
                          placeholderTextColor={theme.secondary}
                          style={{
                            flex: 1,
                            minWidth: 90,
                            backgroundColor: theme.card,
                            paddingHorizontal: 8,
                            paddingVertical: 12,
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.text,
                            borderWidth: 1,
                            borderColor: theme.border,
                            textAlign: "center",
                          }}
                          keyboardType="decimal-pad"
                        />

                        <TouchableOpacity
                          onPress={() => adjustField(setTp, tp, 1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: `${theme.primary}15`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              color: theme.primary,
                              fontWeight: "700",
                            }}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: theme.text,
                        }}
                      >
                        Stop Loss
                      </Text>
                      <Switch
                        value={slEnabled}
                        onValueChange={setSlEnabled}
                        trackColor={{
                          false: theme.border,
                          true: theme.negative,
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    {slEnabled && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => adjustField(setSl, sl, -1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: `${theme.secondary}10`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              color: theme.secondary,
                              fontWeight: "700",
                            }}
                          >
                            −
                          </Text>
                        </TouchableOpacity>

                        <TextInput
                          value={sl}
                          onChangeText={setSl}
                          onFocus={() => {
                            try {
                              const ref = getReferencePrice();
                              if (
                                ref != null &&
                                (!sl || String(sl).trim() === "")
                              ) {
                                setSl(formatPrice(ref, digits));
                              }
                            } catch (_) {}
                          }}
                          placeholder="SL Price"
                          placeholderTextColor={theme.secondary}
                          style={{
                            flex: 1,
                            minWidth: 90,
                            backgroundColor: theme.card,
                            paddingHorizontal: 8,
                            paddingVertical: 12,
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.text,
                            borderWidth: 1,
                            borderColor: theme.border,
                            textAlign: "center",
                          }}
                          keyboardType="decimal-pad"
                        />

                        <TouchableOpacity
                          onPress={() => adjustField(setSl, sl, 1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: `${theme.primary}15`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              color: theme.primary,
                              fontWeight: "700",
                            }}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Margin Info */}
              <View
                style={{
                  backgroundColor: theme.card,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.secondary,
                    marginBottom: 8,
                  }}
                >
                  MARGIN REQUIRED
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "900",
                        color: theme.text,
                      }}
                    >
                      $
                      {summary?.margin != null
                        ? Number(summary.margin).toFixed(2)
                        : "--"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.secondary,
                        marginTop: 4,
                      }}
                    >
                      Required
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: theme.border }} />
                  <View>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "900",
                        color: theme.positive,
                      }}
                    >
                      $
                      {summary?.freeMargin != null
                        ? Number(summary.freeMargin).toFixed(2)
                        : "--"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.secondary,
                        marginTop: 4,
                      }}
                    >
                      Free
                    </Text>
                  </View>
                </View>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={() => executeOrder(orderType)}
                style={{
                  backgroundColor:
                    orderType === "BUY" ? theme.positive : theme.negative,
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: "center",
                  shadowColor:
                    orderType === "BUY" ? theme.positive : theme.negative,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  CONFIRM {orderType}
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 14,
                    fontWeight: "600",
                    marginTop: 4,
                    opacity: 0.9,
                  }}
                >
                  {symbol} • {lot.toFixed(lotDecimals)} lot
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Enhanced Bottom Trading Bar */}
      <View
        style={{
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* SELL Button */}
          <TouchableOpacity
            onPress={() => {
              setOrderType("SELL");
              setTradingModalVisible(true);
            }}
            style={{
              flex: 1,
              backgroundColor: theme.negative,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: theme.negative,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <AppIcon name="trending-down" size={14} color="#FFFFFF" />
              <Text
                style={{
                  color: "white",
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                SELL
              </Text>
            </View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
              {bidStr}
            </Text>
          </TouchableOpacity>

          {/* LOT Display */}
          <TouchableOpacity
            onPress={() => setTradingModalVisible(true)}
            style={{
              width: 100,
              backgroundColor: theme.card,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: theme.secondary,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              LOT
            </Text>
            <Text
              style={{ fontSize: 20, fontWeight: "900", color: theme.text }}
            >
              {Number(lot).toFixed(lotDecimals)}
            </Text>
          </TouchableOpacity>

          {/* BUY Button */}
          <TouchableOpacity
            onPress={() => {
              setOrderType("BUY");
              setTradingModalVisible(true);
            }}
            style={{
              flex: 1,
              backgroundColor: theme.positive,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: theme.positive,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <AppIcon name="trending-up" size={14} color="#FFFFFF" />
              <Text
                style={{
                  color: "white",
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                BUY
              </Text>
            </View>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
              {askStr}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <AccountSelectorModal
        visible={isAccountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName || ""}
        selectedAccountId={
          currentAccount
            ? (currentAccount.accountId ?? currentAccount.id)
            : selectedAccountId
        }
        onSelectAccount={(a) => {
          setSelectedAccount?.(a);
          setAccountModalVisible(false);
        }}
        onRefresh={() => {}}
      />
    </SafeAreaView>
  );
}
