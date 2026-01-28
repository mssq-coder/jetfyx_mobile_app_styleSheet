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
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import { createOrder } from "../../api/orders";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import TradingModal from "../../components/OrderComponents/TradingModal";
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

  // Animation values
  const priceChangeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
  const wasTradingModalOpen = useRef(false);

  const [orderType, setOrderType] = useState("BUY");
  const [topTab, setTopTab] = useState("Chart");
  const [tradeTab, setTradeTab] = useState("Market");
  const [pendingEntryPrice, setPendingEntryPrice] = useState("");
  const [pendingOrderTypeKey, setPendingOrderTypeKey] = useState("buyStop");
  const [pendingExpirationEnabled, setPendingExpirationEnabled] =
    useState(true);
  const [pendingExpirationTimeIso, setPendingExpirationTimeIso] = useState("");
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const connectionRef = useRef(null);
  const symbolsBySymbolRef = useRef({});

  const [symbols, setSymbols] = useState([]);
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [lot, setLot] = useState(0.01);
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");

  // Animate on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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

  // Animate price change
  useEffect(() => {
    if (changePct != null) {
      Animated.sequence([
        Animated.timing(priceChangeAnim, {
          toValue: isPositiveChange ? 1 : -1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(priceChangeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [changePct]);

  const changeColor = priceChangeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [theme.negative, theme.secondary, theme.positive],
  });

  const getReferencePrice = () => {
    const price =
      orderType === "BUY" ? safeNumber(quote?.ask) : safeNumber(quote?.bid);
    return price;
  };

  const currentMarketMid = useMemo(() => {
    const mid = safeNumber(quote?.mid);
    if (mid != null) return mid;

    const bid = safeNumber(quote?.bid);
    const ask = safeNumber(quote?.ask);
    if (bid != null && ask != null) return (bid + ask) / 2;
    return bid ?? ask ?? null;
  }, [quote?.mid, quote?.bid, quote?.ask]);

  const currentTradePriceStr = orderType === "BUY" ? askStr : bidStr;

  const modalSide = useMemo(() => {
    if (tradeTab !== "Pending") return orderType;
    return String(pendingOrderTypeKey).toLowerCase().startsWith("buy")
      ? "BUY"
      : "SELL";
  }, [orderType, pendingOrderTypeKey, tradeTab]);

  const modalSidePriceStr = modalSide === "BUY" ? askStr : bidStr;
  const currentMarketMidStr = formatPrice(currentMarketMid, digits);

  const shiftPendingExpiration = useCallback(
    (deltaMs) => {
      const base =
        pendingExpirationTimeIso &&
        !Number.isNaN(Date.parse(pendingExpirationTimeIso))
          ? new Date(pendingExpirationTimeIso)
          : new Date();

      setPendingExpirationTimeIso(
        new Date(base.getTime() + deltaMs).toISOString(),
      );
    },
    [pendingExpirationTimeIso],
  );

  const pendingPriceNumber = useMemo(
    () => safeNumber(pendingEntryPrice),
    [pendingEntryPrice],
  );

  const pendingOrderOptions = useMemo(() => {
    const curr = safeNumber(currentMarketMid);
    const entered = safeNumber(pendingEntryPrice);

    const all = [
      { key: "buyStop", label: "Buy Stop", value: 2 },
      { key: "sellStop", label: "Sell Stop", value: 3 },
      { key: "buyLimit", label: "Buy Limit", value: 4 },
      { key: "sellLimit", label: "Sell Limit", value: 5 },
    ];

    if (curr == null || entered == null) return all;
    if (entered > curr) {
      return all.filter((o) => o.key === "buyStop" || o.key === "sellLimit");
    }
    if (entered < curr) {
      return all.filter((o) => o.key === "buyLimit" || o.key === "sellStop");
    }
    return all;
  }, [currentMarketMid, pendingEntryPrice]);

  useEffect(() => {
    if (!pendingOrderOptions.some((o) => o.key === pendingOrderTypeKey)) {
      setPendingOrderTypeKey(pendingOrderOptions[0]?.key ?? "buyStop");
    }
  }, [pendingOrderOptions, pendingOrderTypeKey]);

  // Initialize default modal state on open
  useEffect(() => {
    // Detect open transition only
    if (isTradingModalVisible && !wasTradingModalOpen.current) {
      wasTradingModalOpen.current = true;

      setTradeTab("Market");

      try {
        const base = safeNumber(currentMarketMid) ?? getReferencePrice();
        if (base != null) {
          setPendingEntryPrice(formatPrice(base, digits));
        }
      } catch (_) {}

      const defaultExp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      setPendingExpirationEnabled(true);
      setPendingExpirationTimeIso(defaultExp);
    }

    // Reset flag when modal closes
    if (!isTradingModalVisible) {
      wasTradingModalOpen.current = false;
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

  const adjustFieldWithBase = (setter, value, direction, baseOverride) => {
    const current = safeNumber(value);
    const baseCandidate =
      current != null
        ? current
        : (safeNumber(baseOverride) ?? getReferencePrice() ?? 0);
    const next = baseCandidate + direction * priceStep;
    setter(formatPrice(next, digits));
  };

  const normalizePriceInput = (value) => {
    const n = safeNumber(value);
    if (n == null) return value;
    return formatPrice(n, digits);
  };

  const handleTradeTabPress = useCallback(
    (t) => {
      setTradeTab(t);

      if (t === "Pending") {
        try {
          const base = safeNumber(currentMarketMid) ?? getReferencePrice();
          if (
            base != null &&
            (!pendingEntryPrice || String(pendingEntryPrice).trim() === "")
          ) {
            setPendingEntryPrice(formatPrice(base, digits));
          }
        } catch (_) {}
      }
    },
    [currentMarketMid, digits, getReferencePrice, pendingEntryPrice],
  );

  const handleTpFocus = useCallback(() => {
    try {
      const ref =
        tradeTab === "Pending"
          ? (safeNumber(pendingEntryPrice) ?? safeNumber(currentMarketMid))
          : getReferencePrice();
      if (ref != null && (!tp || String(tp).trim() === "")) {
        setTp(formatPrice(ref, digits));
      }
    } catch (_) {}
  }, [
    currentMarketMid,
    digits,
    getReferencePrice,
    pendingEntryPrice,
    tp,
    tradeTab,
  ]);

  const handleSlFocus = useCallback(() => {
    try {
      const ref =
        tradeTab === "Pending"
          ? (safeNumber(pendingEntryPrice) ?? safeNumber(currentMarketMid))
          : getReferencePrice();
      if (ref != null && (!sl || String(sl).trim() === "")) {
        setSl(formatPrice(ref, digits));
      }
    } catch (_) {}
  }, [
    currentMarketMid,
    digits,
    getReferencePrice,
    pendingEntryPrice,
    sl,
    tradeTab,
  ]);

  const executeOrder = async () => {
    try {
      if (!selectedAccountId) {
        Alert.alert("Account missing", "Please select an account first.");
        return;
      }

      const nowIso = new Date().toISOString();
      const isPending = tradeTab === "Pending";

      if (isPending) {
        const n = safeNumber(pendingPriceNumber);
        if (n == null || n <= 0) {
          Alert.alert(
            "Missing Entry Price",
            "Entry price is required and must be greater than 0 for pending orders.",
          );
          return;
        }
      }

      const pendingType = pendingOrderOptions.find(
        (o) => o.key === pendingOrderTypeKey,
      );

      const marketTypeNum = orderType === "BUY" ? 0 : 1;
      const pendingTypeNum = pendingType?.value ?? 2;

      const expirationIso = (() => {
        if (
          pendingExpirationTimeIso &&
          !Number.isNaN(Date.parse(pendingExpirationTimeIso))
        ) {
          return new Date(pendingExpirationTimeIso).toISOString();
        }
        return nowIso;
      })();

      const payload = {
        accountId: Number(selectedAccountId),
        lotSize: String(lot ?? "0.01"),
        orderTime: nowIso,
        orderType: isPending ? pendingTypeNum : marketTypeNum,
        remark: "",
        status: isPending ? 2 : 0,
        stopLoss: Number(sl) || 0,
        symbol: String(symbol),
        takeProfit: Number(tp) || 0,

        ...(isPending
          ? {
              EntryPriceForPendingOrder: Number(pendingPriceNumber),
              lotSizeForPendingOrders: Number(lot) || 0,
              expirationTimeForPendingOrder: expirationIso,
              isExpirationTimeEnabledForPendingOrder: Boolean(
                pendingExpirationEnabled,
              ),
            }
          : {}),
      };

      await createOrder(payload);

      Alert.alert(
        "✅ Order Placed",
        isPending
          ? `${pendingType?.label ?? "Pending"} ${symbol} ${payload.lotSize}`
          : `${orderType} ${symbol} ${payload.lotSize}`,
      );
      setTradingModalVisible(false);
    } catch (err) {
      console.error("Create order failed:", err?.response?.data ?? err);
      const message =
        err?.response?.data?.message || err?.message || String(err);
      Alert.alert("❌ Order Failed", message);
    }
  };

  // Trading modal extracted to components/OrderComponents/TradingModal.jsx

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar
          backgroundColor={theme.background}
          barStyle={themeName === "light" ? "dark-content" : "light-content"}
        />

        {/* Minimalist Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 12,
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
                borderRadius: 12,
                backgroundColor: `${theme.primary}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name="arrow-back" color={theme.primary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAccountModalVisible(true)}
              style={{
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.positive,
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: theme.text }}
                >
                  {String(
                    currentAccount?.accountNumber ?? selectedAccountId ?? "--",
                  )}
                </Text>
                <AppIcon
                  name="info"
                  color={theme.secondary}
                  size={16}
                  style={{ marginLeft: 4 }}
                />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "800",
                    color: theme.text,
                    marginRight: 8,
                  }}
                >
                  $
                  {summary?.balance != null
                    ? Number(summary.balance).toFixed(2)
                    : "--"}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: `${theme.primary}15`,
                  }}
                >
              
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFavourite((v) => !v)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${theme.primary}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon
                name={isFavourite ? "star" : "star-outline"}
                color={isFavourite ? theme.primary : theme.secondary}
                size={20}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Symbol Card with Gradient */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 8,
            borderRadius: 20,
            backgroundColor: theme.card,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
            borderWidth: 1,
            borderColor: `${theme.border}30`,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setSymbolModalVisible(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "900",
                      color: theme.primary,
                    }}
                  >
                    {symbol.slice(0, 2)}
                  </Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "800",
                      color: theme.text,
                      marginBottom: 2,
                    }}
                  >
                    {symbol}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: theme.secondary,
                      maxWidth: 150,
                    }}
                    numberOfLines={1}
                  >
                    {description}
                  </Text>
                </View>
              </View>
              <AppIcon
                name="chevron-right"
                color={theme.secondary}
                size={20}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>

            <Animated.View
              style={{
                backgroundColor: changeColor,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                transform: [
                  {
                    scale: priceChangeAnim.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [1.1, 1, 1.1],
                    }),
                  },
                ],
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: "#FFFFFF",
                }}
              >
                {changePct == null
                  ? "--"
                  : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
              </Text>
            </Animated.View>
          </View>

          {/* Price Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.secondary,
                  marginBottom: 4,
                  opacity: 0.7,
                }}
              >
                SELL
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.text,
                }}
              >
                {bidStr}
              </Text>
            </View>

            <View
              style={{
                height: 40,
                width: 1,
                backgroundColor: `${theme.border}50`,
              }}
            />

            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.secondary,
                  marginBottom: 4,
                  opacity: 0.7,
                }}
              >
                BUY
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.text,
                }}
              >
                {askStr}
              </Text>
            </View>

            <View
              style={{
                height: 40,
                width: 1,
                backgroundColor: `${theme.border}50`,
              }}
            />

            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.secondary,
                  marginBottom: 4,
                  opacity: 0.7,
                }}
              >
                SPREAD
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                {(Number(askStr) - Number(bidStr) || 0).toFixed(digits)}
              </Text>
            </View>
          </View>

          {/* High/Low Indicators */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: `${theme.border}30`,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.negative,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 12, color: theme.secondary }}>
                Low:{" "}
                <Text style={{ fontWeight: "700", color: theme.text }}>
                  {lowStr}
                </Text>
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: theme.secondary }}>
                High:{" "}
                <Text style={{ fontWeight: "700", color: theme.text }}>
                  {highStr}
                </Text>
              </Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.positive,
                  marginLeft: 6,
                }}
              />
            </View>
          </View>
        </View>

        {/* Segmented Control Tabs */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 20,
            flexDirection: "row",
            backgroundColor: `${theme.border}20`,
            borderRadius: 14,
            padding: 4,
          }}
        >
          {["Chart", "Info", "News"].map((t) => {
            const active = topTab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTopTab(t)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: active ? theme.background : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: active ? theme.primary : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: active ? 0.1 : 0,
                  shadowRadius: 4,
                  elevation: active ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: active ? "800" : "600",
                    color: active ? theme.text : theme.secondary,
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Area */}
        <View style={{ flex: 1, marginTop: 12 }}>
          {topTab === "Chart" ? (
            <View
              style={{
                flex: 1,
                marginHorizontal: 20,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <TradingViewChart symbol={symbol} accountId={selectedAccountId} />
            </View>
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
                  borderRadius: 20,
                  backgroundColor: `${theme.primary}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  borderWidth: 2,
                  borderColor: `${theme.primary}30`,
                }}
              >
                <AppIcon
                  name={topTab === "Info" ? "bar-chart" : "newspaper"}
                  size={36}
                  color={theme.primary}
                />
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: "800",
                  marginBottom: 8,
                }}
              >
                {topTab === "Info" ? "Market Analysis" : "Financial News"}
              </Text>
              <Text
                style={{
                  color: theme.secondary,
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {topTab === "Info"
                  ? `Detailed analytics and insights for ${symbol} will be available here shortly.`
                  : "Stay updated with the latest market news and expert analysis coming soon."}
              </Text>
            </View>
          )}
        </View>

        {/* Symbol Selection Modal */}
        <Modal
          visible={isSymbolModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSymbolModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)" }}>
            <View
              style={{
                backgroundColor: theme.background,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                marginTop: 60,
                flex: 1,
                paddingTop: 20,
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: theme.text,
                  }}
                >
                  Select Symbol
                </Text>
                <TouchableOpacity
                  onPress={() => setSymbolModalVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppIcon name="close" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: `${theme.border}20`,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <AppIcon
                    name="search"
                    size={20}
                    color={theme.secondary}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ color: theme.secondary, fontSize: 16 }}>
                    Search symbols...
                  </Text>
                </View>
              </View>

              {/* Symbols List */}
              <ScrollView style={{ flex: 1 }}>
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
                  const isSelected = symbol === s;

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
                        backgroundColor: isSelected
                          ? `${theme.primary}15`
                          : theme.background,
                        borderBottomWidth: 1,
                        borderBottomColor: `${theme.border}30`,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: isSelected
                                ? theme.primary
                                : `${theme.primary}20`,
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "800",
                                color: isSelected ? "#FFFFFF" : theme.primary,
                              }}
                            >
                              {s.slice(0, 2)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
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
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
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
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "800",
                              color: theme.text,
                              marginBottom: 4,
                            }}
                          >
                            {a}
                          </Text>
                          <Text
                            style={{ fontSize: 11, color: theme.secondary }}
                          >
                            Bid: {b}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Trading Modal (extracted) */}
        <TradingModal
          isVisible={isTradingModalVisible}
          onClose={() => setTradingModalVisible(false)}
          modalSide={modalSide}
          theme={theme}
          symbol={symbol}
          modalSidePriceStr={modalSidePriceStr}
          tradeTab={tradeTab}
          handleTradeTabPress={handleTradeTabPress}
          pendingOrderOptions={pendingOrderOptions}
          pendingOrderTypeKey={pendingOrderTypeKey}
          setPendingOrderTypeKey={setPendingOrderTypeKey}
          pendingEntryPrice={pendingEntryPrice}
          setPendingEntryPrice={setPendingEntryPrice}
          adjustFieldWithBase={adjustFieldWithBase}
          currentMarketMid={currentMarketMid}
          shiftPendingExpiration={shiftPendingExpiration}
          pendingExpirationEnabled={pendingExpirationEnabled}
          setPendingExpirationEnabled={setPendingExpirationEnabled}
          pendingExpirationTimeIso={pendingExpirationTimeIso}
          lotMin={lotMin}
          lotMax={lotMax}
          lotStep={lotStep}
          adjustLotBySteps={adjustLotBySteps}
          normalizeLot={normalizeLot}
          lot={lot}
          setLot={setLot}
          tpEnabled={tpEnabled}
          setTpEnabled={setTpEnabled}
          tp={tp}
          setTp={setTp}
          handleTpFocus={handleTpFocus}
          slEnabled={slEnabled}
          setSlEnabled={setSlEnabled}
          sl={sl}
          setSl={setSl}
          handleSlFocus={handleSlFocus}
          digits={digits}
          getReferencePrice={getReferencePrice}
          executeOrder={executeOrder}
          pendingPriceNumber={pendingPriceNumber}
        />

        {/* Enhanced Bottom Trading Bar */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: `${theme.border}30`,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
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
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: theme.negative,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                borderWidth: 2,
                borderColor: `${theme.negative}80`,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppIcon name="trending-down" size={16} color="#FFFFFF" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  SELL
                </Text>
              </View>
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: 0.3,
                }}
              >
                {bidStr}
              </Text>
            </TouchableOpacity>

            {/* LOT Display */}
            <TouchableOpacity
              onPress={() => setTradingModalVisible(true)}
              style={{
                width: 80,
                backgroundColor: theme.card,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <AppIcon name="layers" size={12} color={theme.secondary} />
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.secondary,
                    fontWeight: "700",
                    marginLeft: 4,
                  }}
                >
                  LOT
                </Text>
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
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
                paddingVertical: 16,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: theme.positive,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
                borderWidth: 2,
                borderColor: `${theme.positive}80`,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <AppIcon name="trending-up" size={16} color="#FFFFFF" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: "900",
                    marginLeft: 6,
                    letterSpacing: 0.5,
                  }}
                >
                  BUY
                </Text>
              </View>
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: 0.3,
                }}
              >
                {askStr}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Market Stats Bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: `${theme.border}20`,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 10, color: theme.secondary, opacity: 0.7 }}
              >
                VOLUME
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
              >
                --
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 10, color: theme.secondary, opacity: 0.7 }}
              >
                SPREAD
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
              >
                {(Number(askStr) - Number(bidStr) || 0).toFixed(digits)}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ fontSize: 10, color: theme.secondary, opacity: 0.7 }}
              >
                SWAP
              </Text>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
              >
                --
              </Text>
            </View>
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
    </Animated.View>
  );
}
