import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppIcon from "../AppIcon";

const DURATIONS = [
  { key: "1h", ms: 60 * 60 * 1000 },
  { key: "4h", ms: 4 * 60 * 60 * 1000 },
  { key: "1d", ms: 24 * 60 * 60 * 1000 },
  { key: "1w", ms: 7 * 24 * 60 * 60 * 1000 },
];

const EditOrderModal = ({
  visible,
  theme,
  order,
  saving,
  onClose,
  onSubmit,
  onDelete,
  updateError,

  // SL/TP + remark
  slInput,
  setSlInput,
  tpInput,
  setTpInput,
  remarkInput,
  setRemarkInput,
  slFieldError,
  tpFieldError,
  setUpdateError,

  // Pending fields
  lotSizeInput,
  setLotSizeInput,
  entryPriceInput,
  setEntryPriceInput,
  expiryEnabled,
  setExpiryEnabled,
  expiryIso,
  shiftExpiry,
  remarkLocked,

  // Partial close
  partialLotInput,
  setPartialLotInput,
  partialError,
  partialSaving,
  onSubmitPartialClose,

  // Targets
  targets,
  targetsSaving,
  onDeleteTarget,

  // helpers
  getOrderId,
  getOrderSide,
  getMarketReferencePrice,
  getBuySellValues,
  getPriceDigits,
  getPriceStep,
  formatWithDigits,
  adjustInputByStep,
  toNumberOrZero,
  isPendingOrder,
  styles,
}) => {
  const [activeTab, setActiveTab] = useState("order");

  useEffect(() => {
    if (!visible) {
      setActiveTab("order");
      return;
    }
    if (order && !isPendingOrder(order)) {
      setActiveTab((t) => (t === "partial" || t === "order" ? t : "order"));
    } else {
      setActiveTab("order");
    }
  }, [visible, order, isPendingOrder]);

  const pending = Boolean(order && isPendingOrder(order));
  const oid = useMemo(
    () => (order ? getOrderId(order) : null),
    [order, getOrderId],
  );
  const side = useMemo(
    () => (order ? getOrderSide(order) : ""),
    [order, getOrderSide],
  );
  const isBuy = side.includes("buy");
  const isSell = side.includes("sell");
  const digits = useMemo(
    () => (order ? getPriceDigits(order) : 2),
    [order, getPriceDigits],
  );
  const step = useMemo(
    () => (order ? getPriceStep(order) : 0.01),
    [order, getPriceStep],
  );
  const { buy, sell } = useMemo(
    () => (order ? getBuySellValues(order) : { buy: 0, sell: 0 }),
    [order, getBuySellValues],
  );
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getMarketRef = (o) => {
    const ask = toNum(o?.ask ?? o?.buyPrice);
    const bid = toNum(o?.bid ?? o?.sellPrice);
    if (ask > 0 && bid > 0) return (ask + bid) / 2;
    if (ask > 0) return ask;
    if (bid > 0) return bid;

    const candidates = [
      o?.marketPrice,
      o?.currentPrice,
      o?.price,
      o?.entryPrice,
      o?.entryPriceForPendingOrders,
    ];
    for (const c of candidates) {
      const n = toNum(c);
      if (n > 0) return n;
    }
    return 0;
  };

  const marketPrice = useMemo(() => (order ? getMarketRef(order) : 0), [order]);

  const entryPrice = useMemo(() => {
    if (!order) return 0;
    return (
      order?.entryPrice ??
      order?.entryPriceForPendingOrders ??
      order?.entry ??
      0
    );
  }, [order]);

  const lotSize = useMemo(() => {
    if (!order) return 0;
    return order?.lotSize ?? order?.remainingLotSize ?? 0;
  }, [order]);

  const formatPrice = (price, priceDigits) => {
    const n = toNum(price);
    if (!n || n <= 0) return "--";
    const d = Number.isFinite(Number(priceDigits)) ? Number(priceDigits) : 2;
    return n.toFixed(Math.max(0, Math.min(10, d)));
  };

  const busy = Boolean(saving || partialSaving || targetsSaving);

  if (!visible || !order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose?.();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={[styles.centerModalRoot, { backgroundColor: "transparent" }]}
        >
          <Pressable
            style={styles.centerBackdrop}
            onPress={() => {
              if (!busy) onClose?.();
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
                paddingTop: 14,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${theme.primary}25`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppIcon name="edit" color={theme.primary} size={18} />
                </View>
                <Text
                  style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}
                >
                  {pending ? "Edit Pending Order" : "Edit Ongoing Order"}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => onClose?.()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: `${theme.border}25`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppIcon name="close" color={theme.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            {!pending ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                {[
                  { key: "order", label: "Modify SL/TP", icon: "tune" },
                  {
                    key: "partial",
                    label: "Partial Close",
                    icon: "call-split",
                  },
                ].map((t) => {
                  const selected = activeTab === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setActiveTab(t.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: selected
                          ? theme.primary
                          : theme.background,
                        borderWidth: 1,
                        borderColor: selected ? theme.primary : theme.border,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <AppIcon
                        name={t.icon}
                        color={selected ? "#fff" : theme.text}
                        size={16}
                      />
                      <Text
                        style={{
                          color: selected ? "#fff" : theme.text,
                          fontSize: 12,
                          fontWeight: "800",
                        }}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                paddingBottom: 18,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Info row */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>
                    Order
                  </Text>
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    #{String(order?.orderId ?? oid ?? "—")}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>
                    Market
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {formatPrice(marketPrice, digits)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isBuy
                        ? theme.positive
                        : isSell
                          ? theme.negative
                          : theme.secondary,
                      fontWeight: "800",
                    }}
                    numberOfLines={1}
                  >
                    {isBuy ? "BUY" : isSell ? "SELL" : "—"}
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                    numberOfLines={1}
                  >
                    {String(order?.symbol ?? order?.instrument ?? "—")}
                  </Text>
                </View>
              </View>

              {/* Entry + Lot */}
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>
                    Entry
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {formatPrice(entryPrice, digits)}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: theme.secondary, fontSize: 11 }}>
                    Lot Size
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {toNum(lotSize) > 0 ? toNum(lotSize).toFixed(2) : "--"}
                  </Text>
                </View>
              </View>

              {activeTab === "order" ? (
                <>
                  {/* Pending-only fields */}
                  {pending ? (
                    <View style={{ marginTop: 14, gap: 12 }}>
                      <View>
                        <Text
                          style={{
                            color: theme.secondary,
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Volume
                        </Text>
                        <TextInput
                          value={lotSizeInput}
                          onChangeText={(v) => {
                            setLotSizeInput?.(v);
                            setUpdateError?.(null);
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0.01"
                          placeholderTextColor={theme.secondary}
                          editable={!busy}
                          style={[
                            styles.input,
                            {
                              color: theme.text,
                              borderColor: theme.border,
                              backgroundColor: theme.background,
                              textAlign: "center",
                            },
                          ]}
                        />
                      </View>

                      <View>
                        <Text
                          style={{
                            color: theme.secondary,
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Entry Price
                        </Text>
                        <TextInput
                          value={entryPriceInput}
                          onChangeText={(v) => {
                            setEntryPriceInput?.(v);
                            setUpdateError?.(null);
                          }}
                          keyboardType="decimal-pad"
                          placeholder={
                            marketPrice > 0 ? formatWithDigits(marketPrice, digits) : "0"
                          }
                          placeholderTextColor={theme.secondary}
                          editable={!busy}
                          style={[
                            styles.input,
                            {
                              color: theme.text,
                              borderColor: theme.border,
                              backgroundColor: theme.background,
                              textAlign: "center",
                            },
                          ]}
                        />
                      </View>

                      <View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.secondary,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            Expiration Time
                          </Text>
                          <Switch
                            value={Boolean(expiryEnabled)}
                            onValueChange={(v) => setExpiryEnabled?.(v)}
                            trackColor={{
                              false: theme.border,
                              true: theme.primary,
                            }}
                            thumbColor="#FFFFFF"
                            disabled={busy}
                          />
                        </View>

                        {expiryEnabled ? (
                          <View style={{ marginTop: 10 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 8,
                                marginBottom: 10,
                              }}
                            >
                              {DURATIONS.map((d) => (
                                <TouchableOpacity
                                  key={d.key}
                                  disabled={busy}
                                  onPress={() => shiftExpiry?.(d.ms)}
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: theme.background,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: theme.text,
                                      fontSize: 12,
                                      fontWeight: "800",
                                    }}
                                  >
                                    +{d.key}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            <View
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                borderWidth: 1,
                                borderColor: theme.border,
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 12,
                                  fontWeight: "800",
                                }}
                              >
                                {expiryIso &&
                                !Number.isNaN(Date.parse(expiryIso))
                                  ? new Date(expiryIso).toLocaleString()
                                  : "—"}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>

                      <View>
                        <Text
                          style={{
                            color: theme.secondary,
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Comment
                        </Text>
                        <TextInput
                          value={remarkInput}
                          onChangeText={(v) => {
                            if (remarkLocked) return;
                            setRemarkInput?.(v);
                            setUpdateError?.(null);
                          }}
                          placeholder={remarkLocked ? "" : "Add comment"}
                          placeholderTextColor={theme.secondary}
                          editable={!busy && !remarkLocked}
                          style={[
                            styles.input,
                            {
                              color: theme.text,
                              borderColor: theme.border,
                              backgroundColor: theme.background,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12 }}>
                      <Text
                        style={{
                          color: theme.secondary,
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                      >
                        Remarks
                      </Text>
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {String(order?.remark ?? "No remarks")}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* SL / TP */}
                  <View style={{ marginTop: 16, gap: 12 }}>
                    <View>
                      <Text
                        style={{
                          color: theme.secondary,
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                      >
                        Stop Loss
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() =>
                            setSlInput((prev) =>
                              adjustInputByStep(prev, step, -1, digits),
                            )
                          }
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 18,
                              fontWeight: "900",
                            }}
                          >
                            −
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <TextInput
                            value={slInput}
                            onChangeText={(v) => {
                              setSlInput?.(v);
                              setUpdateError?.(null);
                            }}
                            keyboardType="decimal-pad"
                            placeholder={formatWithDigits(0, digits)}
                            placeholderTextColor={theme.secondary}
                            editable={!busy}
                            onFocus={() => {
                              if (busy) return;
                              if (toNumberOrZero(slInput) > 0) return;
                              if (marketPrice > 0)
                                setSlInput(formatWithDigits(marketPrice, digits));
                            }}
                            style={[
                              styles.input,
                              {
                                color: theme.text,
                                borderColor: slFieldError
                                  ? theme.negative
                                  : theme.border,
                                backgroundColor: theme.background,
                                textAlign: "center",
                              },
                            ]}
                          />

                          {slFieldError ? (
                            <View style={{ marginTop: 6 }}>
                              <Text
                                style={{
                                  color: theme.negative,
                                  fontSize: 11,
                                  fontWeight: "800",
                                }}
                              >
                                {slFieldError}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() =>
                            setSlInput((prev) =>
                              adjustInputByStep(prev, step, +1, digits),
                            )
                          }
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 18,
                              fontWeight: "900",
                            }}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text
                        style={{
                          color: theme.secondary,
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                      >
                        Take Profit
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() =>
                            setTpInput((prev) =>
                              adjustInputByStep(prev, step, -1, digits),
                            )
                          }
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 18,
                              fontWeight: "900",
                            }}
                          >
                            −
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <TextInput
                            value={tpInput}
                            onChangeText={(v) => {
                              setTpInput?.(v);
                              setUpdateError?.(null);
                            }}
                            keyboardType="decimal-pad"
                            placeholder={formatWithDigits(0, digits)}
                            placeholderTextColor={theme.secondary}
                            editable={!busy}
                            onFocus={() => {
                              if (busy) return;
                              if (toNumberOrZero(tpInput) > 0) return;
                              if (marketPrice > 0)
                                setTpInput(formatWithDigits(marketPrice, digits));
                            }}
                            style={[
                              styles.input,
                              {
                                color: theme.text,
                                borderColor: tpFieldError
                                  ? theme.negative
                                  : theme.border,
                                backgroundColor: theme.background,
                                textAlign: "center",
                              },
                            ]}
                          />

                          {tpFieldError ? (
                            <View style={{ marginTop: 6 }}>
                              <Text
                                style={{
                                  color: theme.negative,
                                  fontSize: 11,
                                  fontWeight: "800",
                                }}
                              >
                                {tpFieldError}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={busy}
                          onPress={() =>
                            setTpInput((prev) =>
                              adjustInputByStep(prev, step, +1, digits),
                            )
                          }
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 18,
                              fontWeight: "900",
                            }}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {updateError ? (
                      <View
                        style={{
                          marginTop: 4,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: `${theme.negative}15`,
                          borderWidth: 1,
                          borderColor: `${theme.negative}40`,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.negative,
                            fontSize: 12,
                            fontWeight: "800",
                          }}
                        >
                          {String(updateError)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                /* Partial Close */
                <>
                  <View style={{ marginTop: 14 }}>
                    <Text
                      style={{
                        color: theme.secondary,
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      Partial Close Lot
                    </Text>
                    <TextInput
                      value={partialLotInput}
                      onChangeText={(v) => setPartialLotInput?.(v)}
                      keyboardType="decimal-pad"
                      placeholder="0.01"
                      placeholderTextColor={theme.secondary}
                      editable={!busy}
                      style={[
                        styles.input,
                        {
                          color: theme.text,
                          borderColor: partialError
                            ? theme.negative
                            : theme.border,
                          backgroundColor: theme.background,
                          textAlign: "center",
                        },
                      ]}
                    />

                    {partialError ? (
                      <View style={{ marginTop: 8 }}>
                        <Text
                          style={{
                            color: theme.negative,
                            fontSize: 11,
                            fontWeight: "800",
                          }}
                        >
                          {String(partialError)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {Array.isArray(targets) && targets.length ? (
                    <View style={{ marginTop: 16 }}>
                      <Text
                        style={{
                          color: theme.secondary,
                          fontSize: 12,
                          fontWeight: "800",
                          marginBottom: 10,
                        }}
                      >
                        Targets
                      </Text>
                      {targets.map((t, idx) => {
                        const tid =
                          t?.id ??
                          t?.orderTargetsId ??
                          t?.orderTargetId ??
                          t?.targetId;
                        const lot = t?.lotSize ?? "—";
                        const sl = t?.stopLoss ?? 0;
                        const tp = t?.takeProfit ?? 0;
                        return (
                          <View
                            key={String(tid ?? idx)}
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              backgroundColor: theme.background,
                              borderWidth: 1,
                              borderColor: theme.border,
                              marginBottom: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 12,
                                  fontWeight: "900",
                                }}
                              >
                                Lot: {String(lot)}
                              </Text>
                              <Text
                                style={{ color: theme.secondary, fontSize: 11 }}
                              >
                                SL: {sl ? String(sl) : "0"} · TP:{" "}
                                {tp ? String(tp) : "0"}
                              </Text>
                            </View>

                            <TouchableOpacity
                              accessibilityRole="button"
                              disabled={busy || tid == null}
                              onPress={() => onDeleteTarget?.(tid)}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: `${theme.negative}20`,
                                borderWidth: 1,
                                borderColor: `${theme.negative}40`,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <AppIcon
                                name="delete"
                                color={theme.negative}
                                size={18}
                              />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 14,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                gap: 10,
              }}
            >
              {busy ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ActivityIndicator color={theme.primary} />
                  <Text
                    style={{
                      color: theme.secondary,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Please wait…
                  </Text>
                </View>
              ) : null}

              {activeTab === "order" ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => onSubmit?.()}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: theme.primary,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <AppIcon name="save" color="#fff" size={18} />
                    <Text
                      style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}
                    >
                      Modify Order
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => onClose?.()}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <AppIcon name="close" color={theme.text} size={18} />
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "900",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => onSubmitPartialClose?.()}
                  style={{
                    borderRadius: 14,
                    backgroundColor: theme.primary,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <AppIcon name="call-split" color="#fff" size={18} />
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}
                  >
                    Partial Close
                  </Text>
                </TouchableOpacity>
              )}

              {pending ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => onDelete?.()}
                  style={{
                    borderRadius: 14,
                    backgroundColor: theme.negative,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <AppIcon name="delete" color="#fff" size={18} />
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}
                  >
                    Delete Order
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditOrderModal;
