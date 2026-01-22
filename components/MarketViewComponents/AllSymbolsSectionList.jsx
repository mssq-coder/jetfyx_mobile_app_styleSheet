import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, SectionList } from "react-native";
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

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      renderSectionHeader={({ section }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => toggleGroup(section.title)}
          style={{
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 6,
            backgroundColor: theme.background,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                color: theme.secondary,
                fontSize: 13,
                fontWeight: "800",
                letterSpacing: 0.6,
              }}
            >
              {section.title}
            </Text>
            <Text style={{ color: theme.secondary, fontSize: 12, fontWeight: "700" }}>
              ({section.count ?? 0})
            </Text>
          </View>

          <Text style={{ color: theme.secondary, fontSize: 18, fontWeight: "800" }}>
            {openGroups.has(section.title) ? "⌄" : ">"}
          </Text>
        </TouchableOpacity>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onToggleExpand(item.id)}
          style={{
            marginHorizontal: 12,
            marginVertical: 6,
            borderRadius: 12,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
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
                    parseFloat(prev[item.id] ?? "0.01") - 0.01
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      color: item.isPositive ? theme.positive : theme.negative,
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
              <View style={{ flex: 1.2, flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.secondary,
                      marginBottom: 4,
                      fontWeight: "500",
                    }}
                  >
                    Sell
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.negative,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                      minWidth: 55,
                      textAlign: "right",
                    }}
                  >
                    {item.bid || "--"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.secondary,
                      marginBottom: 4,
                      fontWeight: "500",
                    }}
                  >
                    Buy
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: theme.positive,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                      minWidth: 55,
                      textAlign: "right",
                    }}
                  >
                    {item.ask || "--"}
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
                <Text style={{ fontSize: 20, color: theme.secondary }}>›</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ color: theme.secondary, fontSize: 16, textAlign: "center" }}>
            No symbols available
          </Text>
        </View>
      }
    />
  );
}
