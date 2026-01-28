import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AppIcon from "../AppIcon";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TradingBottomSheetModal({
  visible,
  onClose,
  theme,
  symbol,
  tradeTab,
  onTradeTabPress,
  modalSide,
  modalSidePriceStr,
  currentMarketMidStr,
  currentMarketMid,
  pendingEntryPrice,
  setPendingEntryPrice,
  pendingOrderOptions,
  pendingOrderTypeKey,
  setPendingOrderTypeKey,
  pendingExpirationEnabled,
  setPendingExpirationEnabled,
  pendingExpirationTimeIso,
  setPendingExpirationTimeIso,
  shiftPendingExpiration,
  adjustFieldWithBase,
  normalizePriceInput,
  lot,
  lotMin,
  lotMax,
  lotDecimals,
  adjustLotBySteps,
  tpEnabled,
  setTpEnabled,
  tp,
  setTp,
  slEnabled,
  setSlEnabled,
  sl,
  setSl,
  onTpFocus,
  onSlFocus,
  summary,
  executeOrder,
}) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const pendingTypeLabel =
    pendingOrderOptions.find((o) => o.key === pendingOrderTypeKey)?.label ??
    "Pending";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <Animated.View
          style={{
            transform: [{ translateY }],
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
                    name={modalSide === "BUY" ? "trending-up" : "trending-down"}
                    size={20}
                    color={
                      modalSide === "BUY" ? theme.positive : theme.negative
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
                    {tradeTab === "Pending"
                      ? `${pendingTypeLabel} ${symbol}`
                      : `${modalSide === "BUY" ? "Buy" : "Sell"} ${symbol}`}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.secondary,
                      marginTop: 2,
                    }}
                  >
                    {tradeTab === "Pending"
                      ? "Pending order"
                      : modalSide === "BUY"
                        ? "at Ask price"
                        : "at Bid price"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
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

            {/* Market / Pending Tabs */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {["Market", "Pending"].map((t) => {
                  const active = tradeTab === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => onTradeTabPress(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: active
                          ? theme.primary + "20"
                          : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: active ? theme.primary : theme.secondary,
                          fontWeight: "800",
                          fontSize: 12,
                          letterSpacing: 0.2,
                        }}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Current Price Display */}
            <View
              style={{
                backgroundColor:
                  modalSide === "BUY"
                    ? `${theme.positive}15`
                    : `${theme.negative}15`,
                padding: 20,
                borderRadius: 16,
                marginBottom: 20,
                borderWidth: 2,
                borderColor:
                  modalSide === "BUY" ? theme.positive : theme.negative,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: modalSide === "BUY" ? theme.positive : theme.negative,
                  textAlign: "center",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {tradeTab === "Pending"
                  ? "Current Market Price"
                  : `Current ${modalSide === "BUY" ? "Ask" : "Bid"} Price`}
              </Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "900",
                  color: modalSide === "BUY" ? theme.positive : theme.negative,
                  textAlign: "center",
                }}
              >
                {tradeTab === "Pending"
                  ? currentMarketMidStr
                  : modalSidePriceStr}
              </Text>
            </View>

            {/* Pending Fields */}
            {tradeTab === "Pending" && (
              <View style={{ marginBottom: 20 }}>
                {/* Entry Price */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.text,
                      marginBottom: 10,
                    }}
                  >
                    Entry Price (editable)
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        adjustFieldWithBase(
                          setPendingEntryPrice,
                          pendingEntryPrice,
                          -1,
                          currentMarketMid,
                        )
                      }
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
                      value={pendingEntryPrice}
                      onChangeText={setPendingEntryPrice}
                      onBlur={() =>
                        setPendingEntryPrice((v) => normalizePriceInput(v))
                      }
                      placeholder={currentMarketMidStr}
                      placeholderTextColor={theme.secondary}
                      style={{
                        flex: 1,
                        minWidth: 110,
                        backgroundColor: theme.card,
                        paddingHorizontal: 10,
                        paddingVertical: 12,
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: "700",
                        color: theme.text,
                        borderWidth: 1,
                        borderColor: theme.border,
                        textAlign: "center",
                      }}
                      keyboardType="decimal-pad"
                    />

                    <TouchableOpacity
                      onPress={() =>
                        adjustFieldWithBase(
                          setPendingEntryPrice,
                          pendingEntryPrice,
                          1,
                          currentMarketMid,
                        )
                      }
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

                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: theme.secondary,
                    }}
                  >
                    If entry price is greater than current market, options: Buy
                    Stop / Sell Limit. If less, options: Buy Limit / Sell Stop.
                  </Text>
                </View>

                {/* Pending Order Type */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: theme.text,
                      marginBottom: 10,
                    }}
                  >
                    Pending Order Type
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {pendingOrderOptions.map((opt) => {
                      const active = pendingOrderTypeKey === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setPendingOrderTypeKey(opt.key)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: active
                              ? theme.primary + "20"
                              : theme.card,
                            borderWidth: 1,
                            borderColor: active ? theme.primary : theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "800",
                              color: active ? theme.primary : theme.secondary,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Expiration */}
                <View
                  style={{
                    backgroundColor: theme.card,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: pendingExpirationEnabled ? 12 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: theme.text,
                      }}
                    >
                      Expiration Time
                    </Text>
                    <Switch
                      value={pendingExpirationEnabled}
                      onValueChange={setPendingExpirationEnabled}
                      trackColor={{
                        false: theme.border,
                        true: theme.primary,
                      }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {pendingExpirationEnabled && (
                    <>
                      <TextInput
                        value={pendingExpirationTimeIso}
                        onChangeText={setPendingExpirationTimeIso}
                        placeholder="2026-01-27T08:53:15.002Z"
                        placeholderTextColor={theme.secondary}
                        style={{
                          backgroundColor: theme.background,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.text,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            shiftPendingExpiration(-15 * 60 * 1000)
                          }
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: `${theme.secondary}10`,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              color: theme.secondary,
                            }}
                          >
                            -15m
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => shiftPendingExpiration(15 * 60 * 1000)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: `${theme.primary}15`,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              color: theme.primary,
                            }}
                          >
                            +15m
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => shiftPendingExpiration(60 * 60 * 1000)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: `${theme.primary}15`,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "800",
                              color: theme.primary,
                            }}
                          >
                            +1h
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

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
                        onPress={() =>
                          adjustFieldWithBase(
                            setTp,
                            tp,
                            -1,
                            tradeTab === "Pending" ? pendingEntryPrice : null,
                          )
                        }
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
                        onFocus={onTpFocus}
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
                        onPress={() =>
                          adjustFieldWithBase(
                            setTp,
                            tp,
                            1,
                            tradeTab === "Pending" ? pendingEntryPrice : null,
                          )
                        }
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
                        onPress={() =>
                          adjustFieldWithBase(
                            setSl,
                            sl,
                            -1,
                            tradeTab === "Pending" ? pendingEntryPrice : null,
                          )
                        }
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
                        onFocus={onSlFocus}
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
                        onPress={() =>
                          adjustFieldWithBase(
                            setSl,
                            sl,
                            1,
                            tradeTab === "Pending" ? pendingEntryPrice : null,
                          )
                        }
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
              onPress={executeOrder}
              style={{
                backgroundColor:
                  modalSide === "BUY" ? theme.positive : theme.negative,
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
                shadowColor:
                  modalSide === "BUY" ? theme.positive : theme.negative,
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
                {tradeTab === "Pending"
                  ? `PLACE ${pendingTypeLabel?.toUpperCase?.() ?? "PENDING"}`
                  : `CONFIRM ${modalSide}`}
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
                {symbol} • {Number(lot).toFixed(lotDecimals)} lot
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
