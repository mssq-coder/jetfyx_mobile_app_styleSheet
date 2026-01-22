import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";
import {
	Modal,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import TradingViewChart from "../../components/TradingViewChart";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function ChartScreen() {
  const { theme } = useAppTheme();
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);
  const currentAccount = useMemo(() => {
    const id = selectedAccountId;
    return (
      (Array.isArray(accounts) ? accounts : []).find(
        (a) => (a?.accountId ?? a?.id) === id,
      ) ?? null
    );
  }, [accounts, selectedAccountId]);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [symbols, setSymbols] = useState([]);
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [resolution, setResolution] = useState("1");
  const [timeframeModalOpen, setTimeframeModalOpen] = useState(false);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [drawMode, setDrawMode] = useState("none");
  const [clearDrawingsToken, setClearDrawingsToken] = useState(0);

  const timeframes = useMemo(
    () => [
      { label: "1 M", value: "1" },
      { label: "5 M", value: "5" },
      { label: "15 M", value: "15" },
      { label: "30 M", value: "30" },
      { label: "1 H", value: "60" },
      { label: "4 H", value: "240" },
      { label: "1 D", value: "1D" },
      { label: "1 W", value: "1W" },
      { label: "1 M", value: "1M" },
    ],
    [],
  );
  const resolutionLabel = useMemo(() => {
    return (
      timeframes.find((t) => t.value === resolution)?.label ??
      String(resolution)
    );
  }, [resolution, timeframes]);

  useEffect(() => {
    if (!selectedAccountId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getAllCurrencyListFromDB(selectedAccountId);
        const list = (Array.isArray(data) ? data : [])
          .filter((x) => x && x.symbol)
          .filter((x) => x.isSymbolVisible !== false)
          .map((x) => ({
            symbol: String(x.symbol),
            description: x.description ?? "",
          }));
        if (cancelled) return;
        setSymbols(list);
        setSymbol((prev) =>
          list.some((s) => s.symbol === prev)
            ? prev
            : (list[0]?.symbol ?? prev),
        );
      } catch (e) {
        console.warn("ChartScreen - failed to load symbols", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  const filteredSymbols = useMemo(() => {
    const term = String(search || "")
      .trim()
      .toUpperCase();
    if (!term) return symbols;
    return symbols.filter((s) => {
      const sym = String(s.symbol || "").toUpperCase();
      const desc = String(s.description || "").toUpperCase();
      return sym.includes(term) || desc.includes(term);
    });
  }, [search, symbols]);

  const accent = theme.tabActive || theme.headerBlue || theme.primary;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header with symbol changer */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => setSymbolModalOpen(true)}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>
            {symbol}
          </Text>
          <Text
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: "900",
              color: theme.text,
            }}
          >
            ▾
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => setTimeframeModalOpen(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              marginRight: 8,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "900", color: theme.text }}
            >
              {resolutionLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDrawModalOpen(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: drawMode !== "none" ? accent : theme.border,
              backgroundColor:
                drawMode !== "none" ? `${accent}10` : "transparent",
              marginRight: 8,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "900", color: theme.text }}
            >
              Draw
            </Text>
          </TouchableOpacity>

          {/* <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
						{String(currentAccount?.accountNumber ?? currentAccount?.id ?? selectedAccountId ?? '--')}
					</Text> */}
        </View>
      </View>

      <TradingViewChart
        symbol={symbol}
        accountId={selectedAccountId}
        resolution={resolution}
        showSideToolbar
        drawMode={drawMode}
        clearDrawingsToken={clearDrawingsToken}
      />

      {/* Timeframe modal */}
      <Modal
        visible={timeframeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeframeModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setTimeframeModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: theme.background,
              borderRadius: 16,
              padding: 14,
              maxHeight: 420,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                marginBottom: 10,
                color: theme.text,
              }}
            >
              Timeframe
            </Text>
            <ScrollView>
              {timeframes.map((t) => {
                const active = t.value === resolution;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => {
                      setResolution(t.value);
                      setTimeframeModalOpen(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? accent : theme.border,
                      backgroundColor: active ? `${accent}10` : "transparent",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "900",
                        color: theme.text,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Draw tools modal */}
      <Modal
        visible={drawModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDrawModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: theme.background,
              borderRadius: 16,
              padding: 14,
              maxHeight: 420,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                marginBottom: 10,
                color: theme.text,
              }}
            >
              Drawing tools
            </Text>
            {[
              { label: "Off", value: "none" },
              { label: "Horizontal line", value: "hline" },
              { label: "Trend line (2 taps)", value: "trend" },
            ].map((t) => {
              const active = drawMode === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => {
                    setDrawMode(t.value);
                    setDrawModalOpen(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? accent : theme.border,
                    backgroundColor: active ? `${accent}10` : "transparent",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: theme.text,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => {
                setClearDrawingsToken((n) => n + 1);
                setDrawMode("none");
                setDrawModalOpen(false);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.negative,
                backgroundColor: `${theme.negative}10`,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: theme.negative,
                }}
              >
                Clear drawings
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Symbol selection modal */}
      <Modal
        visible={symbolModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSymbolModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSymbolModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: theme.background,
              borderRadius: 16,
              padding: 14,
              maxHeight: 520,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "900",
                marginBottom: 10,
                color: theme.text,
              }}
            >
              Select Symbol
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search symbol"
              placeholderTextColor={theme.secondary}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
                color: theme.text,
                backgroundColor: theme.background,
              }}
            />
            <ScrollView>
              {(filteredSymbols.length ? filteredSymbols : symbols).map(
                (item) => (
                  <TouchableOpacity
                    key={item.symbol}
                    onPress={() => {
                      setSymbol(item.symbol);
                      setSymbolModalOpen(false);
                      setSearch("");
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      {item.symbol}
                    </Text>
                    {item.description ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.secondary,
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
