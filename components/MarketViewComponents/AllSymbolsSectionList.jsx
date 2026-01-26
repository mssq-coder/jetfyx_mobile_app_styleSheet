import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { addSymbolToFavouriteWatchlist, getFavouriteWatchlistSymbols, removeSymbolFromFavouriteWatchlist } from "../../api/auth";
import AppIcon from "../AppIcon";
import ExpandedRow from "./expandedRow";

function canonicalGroupName(raw) {
  if (!raw) return "Other";
  const normalized = String(raw).trim();
  const upper = normalized.toUpperCase();

  if (upper === "MAJORS") return "Majors";
  if (upper === "MINORS") return "Minors";
  if (upper === "METALS") return "Metals";
  if (upper === "ENERGY") return "Energy";
  if (upper === "CRYPTO") return "Crypto";

  // fallback: Title Case-ish
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function getItemGroup(item) {
  return (
    canonicalGroupName(item?.currencyGroupName) ||
    canonicalGroupName(item?.categoryName) ||
    "Other"
  );
}

export default function AllSymbolsSectionList({
  theme,
  data,
  expandedId,
  onToggleExpand,
  lots,
  setLots,
  placingOrderForId,
  onBuy,
  onSell,
  onOpenInfo,
  bottomPadding = 110,
}) {
  // Start collapsed: initially show only the category headers
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const accountId = useAuthStore((s) => s.selectedAccountId);

  const [favouritesBySymbol, setFavouritesBySymbol] = useState(() => new Map());
  const [pendingSymbols, setPendingSymbols] = useState(() => new Set());

  const refreshFavourites = async (aid) => {
    const safeAccountId = Number(aid);
    if (!Number.isFinite(safeAccountId) || safeAccountId <= 0) {
      setFavouritesBySymbol(new Map());
      return;
    }

    try {
      const res = await getFavouriteWatchlistSymbols(safeAccountId);
      const rows = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const next = new Map();
      rows.forEach((row) => {
        const symbol = String(row?.symbol || "").trim();
        const id = Number(row?.id);
        if (symbol && Number.isFinite(id) && id > 0) {
          next.set(symbol.toUpperCase(), id);
        }
      });
      setFavouritesBySymbol(next);
    } catch (err) {
      console.error("getFavouriteWatchlistSymbols error:", err);
    }
  };

  useEffect(() => {
    refreshFavourites(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const toggleGroup = (title) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const sections = useMemo(() => {
    const buckets = new Map();

    (Array.isArray(data) ? data : []).forEach((item) => {
      const group = getItemGroup(item);
      const key = group || "Other";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    });

    const preferredOrder = ["Majors", "Minors", "Metals", "Energy", "Crypto"];

    const ordered = [];
    preferredOrder.forEach((title) => {
      const arr = buckets.get(title);
      if (arr && arr.length) ordered.push({ title, data: arr });
      buckets.delete(title);
    });

    // append any remaining groups
    Array.from(buckets.entries())
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .forEach(([title, arr]) => {
        if (arr && arr.length) ordered.push({ title, data: arr });
      });

    return ordered.map((section) => ({
      ...section,
      count: section.data.length,
      data: openGroups.has(section.title) ? section.data : [],
    }));
  }, [data, openGroups]);

  const handleFavouritePress = async (item) => {
    const aid = Number(accountId);
    if (!Number.isFinite(aid) || aid <= 0) {
      Alert.alert("No account", "Please select a valid account first.");
      return;
    }
    
    const symbolRaw = item?.symbol || item?.symbolName || item?.instrument || "";
    const symbol = String(symbolRaw).trim();
    const symbolKey = symbol ? symbol.toUpperCase() : "";
    
    if (!symbol) {
      Alert.alert("No symbol", "This symbol is invalid.");
      return;
    }

    try {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        if (symbolKey) next.add(symbolKey);
        return next;
      });

      const favouriteId = favouritesBySymbol.get(symbolKey);
      const isFavourite = Boolean(favouriteId);

      if (isFavourite) {
        await removeSymbolFromFavouriteWatchlist(favouriteId);
        Alert.alert("Removed", `${symbol} removed from favourites.`);
      } else {
        await addSymbolToFavouriteWatchlist(aid, symbol);
        Alert.alert("Saved", `${symbol} added to favourites.`);
      }

      await refreshFavourites(aid);
    } catch (err) {
      console.error("Favourite toggle error:", err);
      const resp = err?.response || err;
      const msg =
        resp?.data?.message ||
        resp?.data?.error ||
        resp?.message ||
        String(err);
      Alert.alert("Error", msg);
    } finally {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        if (symbolKey) next.delete(symbolKey);
        return next;
      });
    }
  };

  const renderItem = ({ item }) => {
    const symbolRaw = item?.symbol || item?.symbolName || item?.instrument || "";
    const symbol = String(symbolRaw).trim();
    const symbolKey = symbol ? symbol.toUpperCase() : "";
    const favouriteId = symbolKey ? favouritesBySymbol.get(symbolKey) : undefined;
    const isFavourite = Boolean(favouriteId);
    const isPending = symbolKey ? pendingSymbols.has(symbolKey) : false;

    // Calculate change percentage if available
    const changePercentage = item.changePercent || "";
    const isPositive = item.isPositive !== undefined ? item.isPositive : (parseFloat(changePercentage) >= 0);

    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}>
        {/* Favorite button - now on the left side */}
        <TouchableOpacity
          onPress={() => handleFavouritePress(item)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
            backgroundColor: 'transparent',
          }}
          accessibilityRole="button"
          accessibilityLabel={`${isFavourite ? 'Remove' : 'Add'} ${item.symbol} to favourites`}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isFavourite ? `${theme.primary}15` : `${theme.secondary}10`,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <AppIcon
                name={isFavourite ? "favorite" : "favorite-border"}
                size={20}
                color={isFavourite ? theme.primary : theme.secondary}
              />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Main content container */}
        <TouchableOpacity
          onPress={() => onToggleExpand(item.id)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            marginVertical: 4,
            borderRadius: 16,
            backgroundColor: expandedId === item.id ? `${theme.card}EE` : theme.card,
            borderWidth: expandedId === item.id ? 1.5 : 1,
            borderColor: expandedId === item.id ? theme.primary : theme.border,
            overflow: "hidden",
            shadowColor: expandedId === item.id ? theme.primary : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: expandedId === item.id ? 0.15 : 0.08,
            shadowRadius: expandedId === item.id ? 8 : 4,
            elevation: expandedId === item.id ? 5 : 3,
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
              onInfo={() => onOpenInfo(item)}
              onChangeLot={(value) =>
                setLots((prev) => ({
                  ...prev,
                  [item.id]: value,
                }))
              }
              onBuy={() =>
                onBuy({
                  instrumentId: item.id,
                  symbol: item.symbol,
                  lotSize: lots[item.id] ?? "0.01",
                })
              }
              onSell={() =>
                onSell({
                  instrumentId: item.id,
                  symbol: item.symbol,
                  lotSize: lots[item.id] ?? "0.01",
                })
              }
              onClose={() => onToggleExpand(item.id)}
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
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              {/* Left: Symbol & Meta Info */}
              <View style={{ flex: 1.8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isPositive ? theme.positive : theme.negative,
                    marginRight: 6,
                  }} />
                  <Text
                    style={{
                      color: theme.secondary,
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}
                  >
                    {item.time || "--:--"}
                  </Text>
                </View>
                
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                    fontFamily: 'System',
                  }}
                >
                  {item.symbol}
                </Text>
                
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center",
                  backgroundColor: isPositive ? `${theme.positive}15` : `${theme.negative}15`,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                }}>
                  <Text
                    style={{
                      color: isPositive ? theme.positive : theme.negative,
                      fontSize: 13,
                      fontWeight: "700",
                      marginRight: 4,
                    }}
                  >
                    {isPositive ? "▲" : "▼"}
                  </Text>
                  <Text
                    style={{
                      color: isPositive ? theme.positive : theme.negative,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {item.change || "--"}
                  </Text>
                  {changePercentage && (
                    <Text
                      style={{
                        color: isPositive ? theme.positive : theme.negative,
                        fontSize: 11,
                        fontWeight: "600",
                        marginLeft: 6,
                        opacity: 0.9,
                      }}
                    >
                      ({changePercentage}%)
                    </Text>
                  )}
                </View>
              </View>

              {/* Middle: Sell & Buy prices with improved visual design */}
              <View
                style={{
                  flex: 1.2,
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.secondary,
                      marginBottom: 6,
                      fontWeight: "600",
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Sell
                  </Text>
                  <View
                    style={{
                      minWidth: 88,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: theme.negative,
                      alignItems: "flex-end",
                      backgroundColor: `${theme.negative}10`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.negative,
                        fontWeight: "800",
                        letterSpacing: 0.3,
                        textAlign: "right",
                        fontFamily: 'System',
                      }}
                    >
                      {item.bid || "--"}
                    </Text>
                  </View>
                </View>
                
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.secondary,
                      marginBottom: 6,
                      fontWeight: "600",
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Buy
                  </Text>
                  <View
                    style={{
                      minWidth: 88,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: theme.positive,
                      alignItems: "flex-end",
                      backgroundColor: `${theme.positive}10`,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.positive,
                        fontWeight: "800",
                        letterSpacing: 0.3,
                        textAlign: "right",
                        fontFamily: 'System',
                      }}
                    >
                      {item.ask || "--"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled={true}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ 
        paddingBottom: bottomPadding,
        paddingHorizontal: 4,
      }}
      renderSectionHeader={({ section }) => (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleGroup(section.title)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: theme.background,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            marginTop: 4,
            marginBottom: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 4,
              height: 20,
              borderRadius: 2,
              backgroundColor: theme.primary,
            }} />
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                {section.title}
              </Text>
              <Text
                style={{
                  color: theme.secondary,
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {section.count ?? 0} instruments
              </Text>
            </View>
          </View>

          <View style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: `${theme.primary}20`,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text
              style={{ 
                color: theme.primary, 
                fontSize: 16, 
                fontWeight: "700",
                marginTop: openGroups.has(section.title) ? 0 : -1,
              }}
            >
              {openGroups.has(section.title) ? "–" : "+"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={{ 
          padding: 40, 
          alignItems: "center",
          justifyContent: 'center',
          minHeight: 300,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: `${theme.primary}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <AppIcon
              name="currency-exchange"
              size={40}
              color={theme.secondary}
            />
          </View>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No symbols available
          </Text>
          <Text
            style={{
              color: theme.secondary,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Check back later or refresh to see trading instruments
          </Text>
        </View>
      }
      initialNumToRender={10}
      maxToRenderPerBatch={20}
      windowSize={10}
    />
  );
}