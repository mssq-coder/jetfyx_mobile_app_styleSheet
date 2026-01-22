import * as signalR from "@microsoft/signalr";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
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
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import TradingViewChart from "../../components/TradingViewChart";
import { useAppTheme } from "../../contexts/ThemeContext";
import useAccountSummary from "../../hooks/useAccountSummary";
import { useAuthStore } from "../../store/authStore";

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
  const [orderType, setOrderType] = useState("BUY"); // 'BUY' or 'SELL'
  const [topTab, setTopTab] = useState("Chart");
  const [tradeTab, setTradeTab] = useState("Market");
  const [regularSettingsOpen, setRegularSettingsOpen] = useState(true);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  // timeframe reserved for future chart controls
  const connectionRef = useRef(null);
  const symbolsBySymbolRef = useRef({});

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

  const getReferencePrice = () => {
    const price =
      orderType === "BUY" ? safeNumber(quote?.ask) : safeNumber(quote?.bid);
    return price;
  };

  const currentTradePriceStr = orderType === "BUY" ? askStr : bidStr;

  // ============================
  // Load symbols metadata
  // ============================
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
        // If current symbol is not in list, fallback to first
        setSymbol((prev) => {
          if (!mapped.length) return prev;
          return mapped.some((x) => x.symbol === prev)
            ? prev
            : mapped[0].symbol;
        });
      } catch (e) {
        console.warn("OrderScreen - failed to load symbols", e);
      }
    };

    loadSymbols();
    return () => {
      isCancelled = true;
    };
  }, [selectedAccountId]);

  // ============================
  // SignalR: live bid/ask
  // ============================
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
        console.log("✅ OrderScreen SignalR connected");
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

  // ============================
  // Lot constraints
  // ============================
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
      // snap to step relative to min
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

  const executeOrder = (side) => {
    console.log(`Execute ${side} order`, {
      symbol,
      lot,
      bid: bidStr,
      ask: askStr,
      tp,
      sl,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        backgroundColor={theme.background}
        barStyle={themeName === "light" ? "dark-content" : "light-content"}
      />

      {/* Top account header (like reference) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 6, marginRight: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon name="arrow-back" color={theme.text} size={22} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: theme.text }}>
            {summary?.balance != null
              ? `$${Number(summary.balance).toFixed(2)}`
              : "--"}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: theme.secondary,
                }}
              >
                {String(
                  currentAccount?.accountType ??
                    currentAccount?.accountTypeName ??
                    "DEMO",
                )}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAccountModalVisible(true)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: theme.secondary,
                  fontWeight: "700",
                }}
              >
                {String(
                  currentAccount?.accountNumber ??
                    currentAccount?.id ??
                    selectedAccountId ??
                    "--",
                )}
              </Text>
              <AppIcon
                name="keyboard-arrow-down"
                color={theme.secondary}
                size={18}
              />
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

        <TouchableOpacity
          onPress={() => setIsFavourite((v) => !v)}
          style={{ padding: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Toggle favourite"
        >
          <AppIcon
            name={isFavourite ? "star" : "star-border"}
            color={theme.text}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* Top tabs */}
      <View
        style={{ flexDirection: "row", paddingHorizontal: 14, paddingTop: 10 }}
      >
        {["Chart", "Calendar", "Info"].map((t) => {
          const active = topTab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTopTab(t)}
              style={{ marginRight: 22, paddingBottom: 10 }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: active ? "800" : "700",
                  color: active ? theme.tabActive : theme.secondary,
                }}
              >
                {t}
              </Text>
              <View
                style={{
                  height: 3,
                  borderRadius: 999,
                  marginTop: 8,
                  backgroundColor: active ? theme.tabActive : "transparent",
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Symbol row + timeframe + actions */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setSymbolModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              marginRight: 10,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "800", color: theme.text }}
            >
              {symbol}
            </Text>
            <AppIcon
              name="keyboard-arrow-down"
              color={theme.secondary}
              size={20}
            />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {/* Change chip */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                marginRight: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: theme.secondary }}>
                Change
              </Text>
              <Text
                style={{
                  fontWeight: "800",
                  color:
                    changePct != null && changePct >= 0
                      ? theme.positive
                      : theme.negative,
                }}
              >
                {changePct == null
                  ? "--"
                  : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
              </Text>
            </View>

            {/* Low chip */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                marginRight: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: theme.secondary }}>Low</Text>
              <Text style={{ fontWeight: "800", color: theme.secondary }}>
                {lowStr}
              </Text>
            </View>

            {/* High chip */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 12, color: theme.secondary }}>High</Text>
              <Text style={{ fontWeight: "800", color: theme.secondary }}>
                {highStr}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* {[
						{ name: 'tune', label: 'Tools' },
						{ name: 'edit', label: 'Draw' },
						{ name: 'layers', label: 'Layers' },
						{ name: 'settings', label: 'Settings' },
						{ name: 'fullscreen', label: 'Fullscreen' },
					].map((a) => (
						<TouchableOpacity
							key={a.name}
							style={{ padding: 6, marginLeft: 6 }}
							accessibilityRole="button"
							accessibilityLabel={a.label}
						>
							<AppIcon name={a.name} color={theme.secondary} size={22} />
						</TouchableOpacity>
					))} */}
        </View>
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
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 15,
              paddingVertical: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <ScrollView style={{ maxHeight: 420 }}>
              {(Array.isArray(symbols) && symbols.length
                ? symbols
                : [{ symbol, description }]
              ).map((item, index, array) => {
                const s = item.symbol;
                const q = quotesBySymbol?.[s];
                const d = item?.digits ?? q?.digits ?? 2;
                const b = formatPrice(q?.bid, d);
                const a = formatPrice(q?.ask, d);

                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setSymbol(s);
                      setSymbolModalVisible(false);
                    }}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 15,
                      backgroundColor:
                        symbol === s
                          ? theme.tabActive + "20"
                          : theme.background,
                      borderBottomWidth: index < array.length - 1 ? 1 : 0,
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
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: symbol === s ? theme.tabActive : theme.text,
                          }}
                        >
                          {s}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.secondary,
                            marginTop: 2,
                          }}
                          numberOfLines={2}
                        >
                          {item?.description || ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 12, color: theme.secondary }}>
                          Buy {b}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.secondary,
                            marginTop: 2,
                          }}
                        >
                          Sell {a}
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

      {/* Content */}
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
            <Text style={{ color: theme.secondary, fontSize: 14 }}>
              {topTab} coming soon
            </Text>
          </View>
        )}
      </View>

      {/* Trading Bottom Sheet */}
      <Modal
        visible={isTradingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTradingModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTradingModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingTop: 10,
              paddingBottom: 18,
              paddingHorizontal: 16,
              minHeight: 420,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {/* Sheet header: Market/Pending tabs + close */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {["Market", "Pending"].map((t) => {
                  const active = tradeTab === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTradeTab(t)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 6,
                        marginRight: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: active ? "900" : "700",
                          color: active ? theme.tabActive : theme.secondary,
                        }}
                      >
                        {t === "Market" ? "Market order" : "Pending order"}
                      </Text>
                      <View
                        style={{
                          height: 3,
                          borderRadius: 999,
                          marginTop: 8,
                          backgroundColor: active
                            ? theme.tabActive
                            : "transparent",
                        }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => setTradingModalVisible(false)}
                style={{ padding: 6 }}
              >
                <AppIcon name="close" color={theme.secondary} size={24} />
              </TouchableOpacity>
            </View>

            {/* Regular settings accordion */}
            <TouchableOpacity
              onPress={() => setRegularSettingsOpen((v) => !v)}
              style={{
                marginTop: 8,
                backgroundColor: theme.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "800", color: theme.text }}
              >
                Regular settings
              </Text>
              <AppIcon
                name={
                  regularSettingsOpen
                    ? "keyboard-arrow-up"
                    : "keyboard-arrow-down"
                }
                color={theme.secondary}
                size={22}
              />
            </TouchableOpacity>

            {regularSettingsOpen ? (
              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  Volume, lots
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "900",
                      color: theme.text,
                    }}
                  >
                    {Number(lot).toFixed(lotDecimals)}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => adjustLotBySteps(-1)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "900",
                          color: theme.text,
                        }}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => adjustLotBySteps(1)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "900",
                          color: theme.text,
                        }}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text
                  style={{ fontSize: 12, color: theme.secondary, marginTop: 8 }}
                >
                  Min {Number(lotMin).toFixed(lotDecimals)}
                  {lotMax != null
                    ? ` • Max ${Number(lotMax).toFixed(lotDecimals)}`
                    : ""}{" "}
                  • Step {Number(lotStep).toFixed(lotDecimals)}
                </Text>

                {/* TP / SL toggles */}
                <View style={{ marginTop: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      Take Profit
                    </Text>
                    <Switch value={tpEnabled} onValueChange={setTpEnabled} />
                  </View>
                  {tpEnabled ? (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: theme.background,
                      }}
                    >
                      <TextInput
                        value={tp}
                        onChangeText={setTp}
                        onFocus={() => {
                          if (String(tp || "").trim() !== "") return;
                          const ref = getReferencePrice();
                          if (ref != null) setTp(formatPrice(ref, digits));
                        }}
                        onBlur={() =>
                          setTp((prev) => normalizePriceInput(prev))
                        }
                        placeholder="Enter Take Profit"
                        placeholderTextColor={theme.secondary}
                        keyboardType="numeric"
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: theme.text,
                          padding: 0,
                          textAlign: "center",
                        }}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginTop: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => adjustField(setTp, tp, -1)}
                          style={{ padding: 10 }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "900",
                              color: theme.secondary,
                            }}
                          >
                            - {priceStep}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => adjustField(setTp, tp, 1)}
                          style={{ padding: 10 }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "900",
                              color: theme.secondary,
                            }}
                          >
                            + {priceStep}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={{ marginTop: 14 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      Stop Loss
                    </Text>
                    <Switch value={slEnabled} onValueChange={setSlEnabled} />
                  </View>
                  {slEnabled ? (
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: theme.background,
                      }}
                    >
                      <TextInput
                        value={sl}
                        onChangeText={setSl}
                        onFocus={() => {
                          if (String(sl || "").trim() !== "") return;
                          const ref = getReferencePrice();
                          if (ref != null) setSl(formatPrice(ref, digits));
                        }}
                        onBlur={() =>
                          setSl((prev) => normalizePriceInput(prev))
                        }
                        placeholder="Enter Stop Loss"
                        placeholderTextColor={theme.secondary}
                        keyboardType="numeric"
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: theme.text,
                          padding: 0,
                          textAlign: "center",
                        }}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginTop: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => adjustField(setSl, sl, -1)}
                          style={{ padding: 10 }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "900",
                              color: theme.secondary,
                            }}
                          >
                            - {priceStep}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => adjustField(setSl, sl, 1)}
                          style={{ padding: 10 }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "900",
                              color: theme.secondary,
                            }}
                          >
                            + {priceStep}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 12, color: theme.secondary }}>
                    Required margin/Free margin
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "900",
                      color: theme.text,
                      marginTop: 6,
                    }}
                  >
                    {summary?.margin != null
                      ? `$${Number(summary.margin).toFixed(2)}`
                      : "$--"}{" "}
                    /{" "}
                    {summary?.freeMargin != null
                      ? `$${Number(summary.freeMargin).toFixed(2)}`
                      : "$--"}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Confirm button */}
            <TouchableOpacity
              onPress={() => {
                executeOrder(orderType);
                setTradingModalVisible(false);
              }}
              style={{
                marginTop: 18,
                backgroundColor:
                  orderType === "BUY" ? theme.positive : theme.negative,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
                Confirm {orderType === "BUY" ? "Buy" : "Sell"} order
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                {currentTradePriceStr}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Bottom trading bar (like reference) */}
      <View
        style={{
          position: "sticky",
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "row",
          height: 74,
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        {/* SELL */}
        <TouchableOpacity
          onPress={() => {
            setOrderType("SELL");
            setTradingModalVisible(true);
          }}
          style={{
            flex: 1,
            backgroundColor: theme.negative,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "900",
              marginBottom: 2,
            }}
          >
            Sell
          </Text>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
            {bidStr}
          </Text>
        </TouchableOpacity>

        {/* VOLUME */}
        <View
          style={{
            width: 140,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{ fontSize: 12, color: theme.secondary, fontWeight: "800" }}
          >
            Volume
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              marginTop: 6,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: theme.card,
            }}
          >
            <TouchableOpacity
              onPress={() => adjustLotBySteps(-1)}
              style={{ padding: 4 }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
              >
                −
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
            >
              {Number(lot).toFixed(lotDecimals)}
            </Text>
            <TouchableOpacity
              onPress={() => adjustLotBySteps(1)}
              style={{ padding: 4 }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BUY */}
        <TouchableOpacity
          onPress={() => {
            setOrderType("BUY");
            setTradingModalVisible(true);
          }}
          style={{
            flex: 1,
            backgroundColor: theme.positive,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "900",
              marginBottom: 2,
            }}
          >
            Buy
          </Text>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>
            {askStr}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
