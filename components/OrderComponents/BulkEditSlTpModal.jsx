import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppIcon from "../AppIcon";

const orderTypeLabel = (raw) => {
  if (raw == null) return "—";
  const s = String(raw);
  const n = Number(s);
  const v = Number.isFinite(n) ? n : s;

  const map = {
    0: "Buy",
    1: "Sell",
    2: "Buy Limit",
    3: "Sell Limit",
    4: "Buy Stop",
    5: "Sell Stop",
  };

  if (typeof v === "number") return map[v] ?? String(v);

  return String(v)
    .replace(/(Buy|Sell)(Stop|Limit)/gi, (m, p1, p2) => `${p1} ${p2}`)
    .replace(/_/g, " ")
    .trim();
};

const getOrderTypeKey = (order) => {
  if (!order || typeof order !== "object") return "";
  const raw =
    order?.orderType ??
    order?.type ??
    order?.orderSide ??
    order?.side ??
    order?.direction;
  return raw == null ? "" : String(raw);
};

const Chip = ({ theme, label, selected, disabled, onPress }) => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: selected ? theme.primary : theme.background,
      borderWidth: 1,
      borderColor: selected ? theme.primary : theme.border,
      opacity: disabled ? 0.6 : 1,
    }}
    accessibilityRole="button"
  >
    <Text
      style={{
        color: selected ? "#fff" : theme.text,
        fontSize: 12,
        fontWeight: "800",
      }}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const BulkEditSlTpModal = ({
  visible,
  onClose,
  theme,
  ongoingOrders,
  pendingOrders,
  symbols,
  saving,
  onSave,
  validateSlTp,
  getOrderId,
  getMarketReferencePrice,
  getPriceDigits,
  getPriceStep,
  formatWithDigits,
  adjustInputByStep,
  toNumberOrZero,
  styles,
}) => {
  const [contentReady, setContentReady] = useState(false);
  const [activeTab, setActiveTab] = useState("ongoing"); // ongoing|pending
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedOrderType, setSelectedOrderType] = useState("");
  const [slValue, setSlValue] = useState("");
  const [tpValue, setTpValue] = useState("");
  const [slValidationError, setSlValidationError] = useState("");
  const [tpValidationError, setTpValidationError] = useState("");

  useEffect(() => {
    if (!visible) {
      setContentReady(false);
      return;
    }
    setContentReady(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setContentReady(true);
    });
    return () => {
      if (task && typeof task.cancel === "function") task.cancel();
    };
  }, [visible]);

  const currentOrders = useMemo(() => {
    return activeTab === "pending" ? pendingOrders || [] : ongoingOrders || [];
  }, [activeTab, ongoingOrders, pendingOrders]);

  const availableSymbols = useMemo(() => {
    const set = new Set();
    for (const o of currentOrders) {
      const sym = o?.symbol ?? o?.instrument ?? o?.instrumentName;
      if (sym) set.add(String(sym));
    }
    return Array.from(set).sort();
  }, [currentOrders]);

  const availableOrderTypes = useMemo(() => {
    if (!selectedSymbol) return [];
    const set = new Set();
    for (const o of currentOrders) {
      const sym = o?.symbol ?? o?.instrument ?? o?.instrumentName;
      if (String(sym) !== String(selectedSymbol)) continue;
      const k = getOrderTypeKey(o);
      if (k) set.add(k);
    }
    return Array.from(set).sort();
  }, [currentOrders, selectedSymbol]);

  const symbolObj = useMemo(() => {
    const list = Array.isArray(symbols) ? symbols : [];
    return list.find((s) => String(s?.symbol) === String(selectedSymbol)) || {};
  }, [symbols, selectedSymbol]);

  const filteredOrders = useMemo(() => {
    if (!selectedSymbol) return [];
    const symMatch = (o) =>
      String(o?.symbol ?? o?.instrument ?? o?.instrumentName) ===
      String(selectedSymbol);

    const base = (currentOrders || []).filter(symMatch);
    if (!selectedOrderType) return base;
    return base.filter((o) => getOrderTypeKey(o) === String(selectedOrderType));
  }, [currentOrders, selectedSymbol, selectedOrderType]);

  const sampleOrder = filteredOrders?.[0] ?? null;
  const digits = sampleOrder
    ? getPriceDigits(sampleOrder)
    : (symbolObj?.digits ?? 2);
  const step = sampleOrder
    ? getPriceStep(sampleOrder)
    : Math.pow(10, -(digits || 2));
  const marketRef = sampleOrder ? getMarketReferencePrice(sampleOrder) : 0;

  useEffect(() => {
    if (!visible) {
      setActiveTab("ongoing");
      setSelectedSymbol("");
      setSelectedOrderType("");
      setSlValue("");
      setTpValue("");
      setSlValidationError("");
      setTpValidationError("");
      return;
    }
  }, [visible]);

  useEffect(() => {
    setSelectedSymbol("");
    setSelectedOrderType("");
    setSlValue("");
    setTpValue("");
    setSlValidationError("");
    setTpValidationError("");
  }, [activeTab]);

  useEffect(() => {
    if (availableSymbols.length === 1) {
      setSelectedSymbol(availableSymbols[0]);
    } else if (selectedSymbol && !availableSymbols.includes(selectedSymbol)) {
      setSelectedSymbol("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, availableSymbols.length]);

  useEffect(() => {
    if (!selectedSymbol) {
      setSelectedOrderType("");
      return;
    }
    if (availableOrderTypes.length === 1) {
      setSelectedOrderType(availableOrderTypes[0]);
    } else if (
      selectedOrderType &&
      availableOrderTypes.length > 1 &&
      !availableOrderTypes.includes(selectedOrderType)
    ) {
      setSelectedOrderType("");
    }
  }, [selectedSymbol, activeTab, availableOrderTypes, selectedOrderType]);

  useEffect(() => {
    if (!slValue || !sampleOrder) {
      setSlValidationError("");
      return;
    }
    const nextSl = toNumberOrZero(slValue);
    const nextTp = toNumberOrZero(tpValue);
    const { slError } = validateSlTp(sampleOrder, nextSl, nextTp);
    setSlValidationError(slError || "");
  }, [slValue, tpValue, sampleOrder, validateSlTp, toNumberOrZero]);

  useEffect(() => {
    if (!tpValue || !sampleOrder) {
      setTpValidationError("");
      return;
    }
    const nextSl = toNumberOrZero(slValue);
    const nextTp = toNumberOrZero(tpValue);
    const { tpError } = validateSlTp(sampleOrder, nextSl, nextTp);
    setTpValidationError(tpError || "");
  }, [slValue, tpValue, sampleOrder, validateSlTp, toNumberOrZero]);

  if (!visible) return null;

  const canSave =
    Boolean(selectedSymbol) &&
    Boolean(selectedOrderType) &&
    (String(slValue).length > 0 || String(tpValue).length > 0) &&
    !slValidationError &&
    !tpValidationError &&
    !saving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose?.();
      }}
    >
      <View style={styles.centerModalRoot}>
        <Pressable
          style={styles.centerBackdrop}
          onPress={() => {
            if (!saving) onClose?.();
          }}
        />

        <View
          style={[
            styles.centerCard,
            { backgroundColor: theme.card, padding: 0 },
          ]}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}
            >
              Bulk Edit SL / TP
            </Text>

            <TouchableOpacity
              disabled={saving}
              onPress={() => onClose?.()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
                opacity: saving ? 0.6 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Close bulk edit modal"
            >
              <AppIcon name="close" color={theme.text} size={18} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              padding: 16,
              paddingBottom: 10,
            }}
          >
            <Chip
              theme={theme}
              label={`Ongoing (${(ongoingOrders || []).length})`}
              selected={activeTab === "ongoing"}
              disabled={saving}
              onPress={() => setActiveTab("ongoing")}
            />
            <Chip
              theme={theme}
              label={`Pending (${(pendingOrders || []).length})`}
              selected={activeTab === "pending"}
              disabled={saving}
              onPress={() => setActiveTab("pending")}
            />
          </View>

          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!contentReady ? (
              <View
                style={{
                  paddingVertical: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <ActivityIndicator color={theme.icon} />
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Loading…
                </Text>
              </View>
            ) : null}

            {contentReady ? (
              <>
                {/* Symbol */}
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Symbol
                </Text>
                <View style={{ height: 10 }} />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {availableSymbols.length ? (
                    availableSymbols.map((sym) => (
                      <Chip
                        key={sym}
                        theme={theme}
                        label={sym}
                        selected={selectedSymbol === sym}
                        disabled={saving}
                        onPress={() => setSelectedSymbol(sym)}
                      />
                    ))
                  ) : (
                    <Text style={{ color: theme.secondary, fontSize: 12 }}>
                      No symbols available.
                    </Text>
                  )}
                </View>

                <View style={{ height: 16 }} />

                {/* Order Type */}
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  Order Type
                </Text>
                <View style={{ height: 10 }} />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {selectedSymbol ? (
                    availableOrderTypes.length ? (
                      availableOrderTypes.map((t) => (
                        <Chip
                          key={t}
                          theme={theme}
                          label={orderTypeLabel(t)}
                          selected={selectedOrderType === t}
                          disabled={saving}
                          onPress={() => setSelectedOrderType(t)}
                        />
                      ))
                    ) : (
                      <Text style={{ color: theme.secondary, fontSize: 12 }}>
                        No order types for this symbol.
                      </Text>
                    )
                  ) : (
                    <Text style={{ color: theme.secondary, fontSize: 12 }}>
                      Select a symbol first.
                    </Text>
                  )}
                </View>

                <View style={{ height: 16 }} />

                {/* Orders summary */}
                <View
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {filteredOrders.length} order(s) matched
                  </Text>
                  <Text
                    style={{
                      color: theme.secondary,
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    Updates apply to all {orderTypeLabel(selectedOrderType)}{" "}
                    orders for {selectedSymbol}.
                  </Text>
                </View>

                {/* Price + inputs */}
                <View style={{ height: 14 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.secondary, fontSize: 11 }}>
                      Market
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 12,
                        fontWeight: "900",
                      }}
                    >
                      {marketRef > 0
                        ? formatWithDigits(marketRef, digits)
                        : "--"}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 14 }} />

                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
                >
                  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
                    <Text
                      style={{
                        color: theme.secondary,
                        fontSize: 12,
                        fontWeight: "800",
                        marginBottom: 8,
                      }}
                    >
                      Stop Loss
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                      }}
                    >
                      <TouchableOpacity
                        disabled={saving || !selectedOrderType}
                        onPress={() =>
                          setSlValue((prev) =>
                            adjustInputByStep(prev, step, -1, digits),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          opacity: saving || !selectedOrderType ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                      <TextInput
                        value={slValue}
                        onChangeText={(v) => setSlValue(v)}
                        keyboardType="decimal-pad"
                        editable={!saving && Boolean(selectedOrderType)}
                        placeholder={formatWithDigits(0, digits)}
                        placeholderTextColor={theme.secondary}
                        onFocus={() => {
                          if (saving) return;
                          if (!selectedOrderType) return;
                          if (toNumberOrZero(slValue) > 0) return;
                          if (marketRef > 0)
                            setSlValue(formatWithDigits(marketRef, digits));
                        }}
                        style={[
                          styles.input,
                          {
                            flexGrow: 1,
                            flexShrink: 1,
                            minWidth: 0,
                            height: 48,
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: slValidationError
                              ? theme.negative
                              : theme.border,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: "900",
                            paddingHorizontal: 10,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        disabled={saving || !selectedOrderType}
                        onPress={() =>
                          setSlValue((prev) =>
                            adjustInputByStep(prev, step, +1, digits),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          opacity: saving || !selectedOrderType ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {slValidationError ? (
                      <Text
                        style={{
                          color: theme.negative,
                          fontSize: 11,
                          fontWeight: "800",
                          marginTop: 6,
                        }}
                      >
                        {slValidationError}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260 }}>
                    <Text
                      style={{
                        color: theme.secondary,
                        fontSize: 12,
                        fontWeight: "800",
                        marginBottom: 8,
                      }}
                    >
                      Take Profit
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                      }}
                    >
                      <TouchableOpacity
                        disabled={saving || !selectedOrderType}
                        onPress={() =>
                          setTpValue((prev) =>
                            adjustInputByStep(prev, step, -1, digits),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          opacity: saving || !selectedOrderType ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                        >
                          −
                        </Text>
                      </TouchableOpacity>
                      <TextInput
                        value={tpValue}
                        onChangeText={(v) => setTpValue(v)}
                        keyboardType="decimal-pad"
                        editable={!saving && Boolean(selectedOrderType)}
                        placeholder={formatWithDigits(0, digits)}
                        placeholderTextColor={theme.secondary}
                        onFocus={() => {
                          if (saving) return;
                          if (!selectedOrderType) return;
                          if (toNumberOrZero(tpValue) > 0) return;
                          if (marketRef > 0)
                            setTpValue(formatWithDigits(marketRef, digits));
                        }}
                        style={[
                          styles.input,
                          {
                            flexGrow: 1,
                            flexShrink: 1,
                            minWidth: 0,
                            height: 48,
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: tpValidationError
                              ? theme.negative
                              : theme.border,
                            textAlign: "center",
                            fontSize: 16,
                            fontWeight: "900",
                            paddingHorizontal: 10,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        disabled={saving || !selectedOrderType}
                        onPress={() =>
                          setTpValue((prev) =>
                            adjustInputByStep(prev, step, +1, digits),
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          opacity: saving || !selectedOrderType ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: "900",
                          }}
                        >
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {tpValidationError ? (
                      <Text
                        style={{
                          color: theme.negative,
                          fontSize: 11,
                          fontWeight: "800",
                          marginTop: 6,
                        }}
                      >
                        {tpValidationError}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Orders list (compact) */}
                {filteredOrders.length ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 14,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        backgroundColor: theme.background,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.secondary,
                          fontSize: 11,
                          fontWeight: "900",
                        }}
                      >
                        Preview
                      </Text>
                    </View>

                    <View style={{ maxHeight: 220 }}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {(filteredOrders || []).slice(0, 20).map((o, idx) => {
                          const id = getOrderId(o);
                          const entry =
                            o?.entryPrice ??
                            o?.entryPriceForPendingOrders ??
                            o?.price ??
                            o?.entry;
                          return (
                            <View
                              key={String(id ?? idx)}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderBottomWidth:
                                  idx === filteredOrders.length - 1 ? 0 : 1,
                                borderBottomColor: theme.border,
                                backgroundColor: theme.card,
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 12,
                                  fontWeight: "900",
                                }}
                              >
                                #{String(o?.orderId ?? id ?? "—")} ·{" "}
                                {String(o?.symbol ?? "—")} ·{" "}
                                {orderTypeLabel(getOrderTypeKey(o))}
                              </Text>
                              <Text
                                style={{
                                  color: theme.secondary,
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                Lot: {String(o?.lotSize ?? o?.volume ?? "—")} ·
                                Entry: {entry != null ? String(entry) : "—"} ·
                                SL: {String(o?.stopLoss ?? 0)} · TP:{" "}
                                {String(o?.takeProfit ?? 0)}
                              </Text>
                            </View>
                          );
                        })}
                        {filteredOrders.length > 20 ? (
                          <View
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: theme.card,
                              borderTopWidth: 1,
                              borderTopColor: theme.border,
                            }}
                          >
                            <Text
                              style={{
                                color: theme.secondary,
                                fontSize: 11,
                                fontWeight: "800",
                              }}
                            >
                              +{filteredOrders.length - 20} more
                            </Text>
                          </View>
                        ) : null}
                      </ScrollView>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <TouchableOpacity
              disabled={saving}
              onPress={() => onClose?.()}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text
                style={{ color: theme.text, fontSize: 12, fontWeight: "900" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!canSave}
              onPress={() =>
                onSave?.({
                  tab: activeTab,
                  symbol: selectedSymbol,
                  orderType: selectedOrderType,
                  stopLoss: slValue,
                  takeProfit: tpValue,
                  matchedCount: filteredOrders.length,
                })
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: canSave ? theme.primary : theme.border,
                opacity: canSave ? 1 : 0.6,
                flex: 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppIcon name="save" color="#fff" size={18} />
              )}
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>
                {saving ? "Updating…" : "Save Updates"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BulkEditSlTpModal;
