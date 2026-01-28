import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../AppIcon";

export default function TradingModal(props) {
  const {
    isVisible,
    onClose,
    modalSide,
    theme,
    symbol,
    modalSidePriceStr,
    tradeTab,
    handleTradeTabPress,
    pendingOrderOptions,
    pendingOrderTypeKey,
    setPendingOrderTypeKey,
    pendingEntryPrice,
    setPendingEntryPrice,
    adjustFieldWithBase,
    currentMarketMid,
    shiftPendingExpiration,
    pendingExpirationEnabled,
    setPendingExpirationEnabled,
    pendingExpirationTimeIso,
    lotMin,
    lotMax,
    lotStep,
    adjustLotBySteps,
    normalizeLot,
    lot,
    setLot,
    tpEnabled,
    setTpEnabled,
    tp,
    setTp,
    handleTpFocus,
    slEnabled,
    setSlEnabled,
    sl,
    setSl,
    handleSlFocus,
    digits,
    getReferencePrice,
    executeOrder,
    pendingPriceNumber,
  } = props;

  const modalSideColor = modalSide === "BUY" ? theme.positive : theme.negative;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: modalSideColor,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <AppIcon
                    name={modalSide === "BUY" ? "trending-up" : "trending-down"}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: theme.text,
                    }}
                  >
                    {modalSide} {symbol}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.secondary }}>
                    Price: {modalSidePriceStr}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
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

            {/* Trade Type Tabs */}
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 16,
                flexDirection: "row",
                backgroundColor: `${theme.border}20`,
                borderRadius: 12,
                padding: 4,
              }}
            >
              {["Market", "Pending"].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleTradeTabPress(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor:
                      tradeTab === t ? theme.background : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: tradeTab === t ? "800" : "600",
                      color: tradeTab === t ? theme.text : theme.secondary,
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                {/* Pending Orders Section */}
                {tradeTab === "Pending" && (
                  <View style={{ marginBottom: 20 }}>
                    {/* Entry Price */}
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: theme.secondary,
                          marginBottom: 8,
                        }}
                      >
                        Entry Price
                      </Text>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: theme.card,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: theme.text,
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                          value={pendingEntryPrice}
                          onChangeText={setPendingEntryPrice}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.secondary}
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
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.primary,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
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
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.card,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                        >
                          <AppIcon name="remove" size={20} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Order Type */}
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: theme.secondary,
                          marginBottom: 8,
                        }}
                      >
                        Order Type
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {pendingOrderOptions.map((option) => (
                          <TouchableOpacity
                            key={option.key}
                            onPress={() => setPendingOrderTypeKey(option.key)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 10,
                              backgroundColor:
                                pendingOrderTypeKey === option.key
                                  ? option.key.includes("buy")
                                    ? theme.positive
                                    : theme.negative
                                  : theme.card,
                              marginRight: 8,
                              borderWidth: 2,
                              borderColor:
                                pendingOrderTypeKey === option.key
                                  ? option.key.includes("buy")
                                    ? theme.positive
                                    : theme.negative
                                  : theme.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color:
                                  pendingOrderTypeKey === option.key
                                    ? "#FFFFFF"
                                    : theme.text,
                              }}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Expiration Time */}
                    <View style={{ marginBottom: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: theme.secondary,
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
                        <View style={{ marginTop: 12 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            {["1h", "4h", "1d", "1w"].map((duration) => (
                              <TouchableOpacity
                                key={duration}
                                onPress={() => {
                                  let delta = 0;
                                  switch (duration) {
                                    case "1h":
                                      delta = 60 * 60 * 1000;
                                      break;
                                    case "4h":
                                      delta = 4 * 60 * 60 * 1000;
                                      break;
                                    case "1d":
                                      delta = 24 * 60 * 60 * 1000;
                                      break;
                                    case "1w":
                                      delta = 7 * 24 * 60 * 60 * 1000;
                                      break;
                                  }
                                  shiftPendingExpiration(delta);
                                }}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: theme.card,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: theme.text,
                                  }}
                                >
                                  +{duration}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TextInput
                            style={{
                              backgroundColor: theme.card,
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                              fontSize: 14,
                              color: theme.text,
                              borderWidth: 2,
                              borderColor: theme.border,
                            }}
                            value={
                              pendingExpirationTimeIso
                                ? new Date(
                                    pendingExpirationTimeIso,
                                  ).toLocaleString()
                                : ""
                            }
                            editable={false}
                            placeholder="Select expiration time"
                            placeholderTextColor={theme.secondary}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Lot Size */}
                <View style={{ marginBottom: 20 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: theme.secondary,
                      }}
                    >
                      Lot Size
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      Min: {lotMin} | Max: {lotMax || "∞"} | Step: {lotStep}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => adjustLotBySteps(-1)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: theme.card,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    >
                      <AppIcon name="remove" size={20} color={theme.text} />
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <TextInput
                        style={{
                          backgroundColor: theme.card,
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          fontSize: 18,
                          fontWeight: "700",
                          color: theme.text,
                          textAlign: "center",
                          borderWidth: 2,
                          borderColor: theme.border,
                        }}
                        value={String(lot)}
                        onChangeText={(text) => {
                          const num = Number(text);
                          if (!Number.isNaN(num)) {
                            setLot(normalizeLot(num));
                          } else {
                            setLot(text);
                          }
                        }}
                        keyboardType="numeric"
                        placeholder="0.01"
                        placeholderTextColor={theme.secondary}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => adjustLotBySteps(1)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: theme.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppIcon name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Quick Lot Buttons */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    {[0.01, 0.1, 0.5, 1].map((quickLot) => (
                      <TouchableOpacity
                        key={quickLot}
                        onPress={() => setLot(normalizeLot(quickLot))}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor:
                            Math.abs(lot - quickLot) < 0.001
                              ? theme.primary
                              : theme.card,
                          borderWidth: 1,
                          borderColor:
                            Math.abs(lot - quickLot) < 0.001
                              ? theme.primary
                              : theme.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color:
                              Math.abs(lot - quickLot) < 0.001
                                ? "#FFFFFF"
                                : theme.text,
                          }}
                        >
                          {quickLot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Take Profit & Stop Loss */}
                <View style={{ marginBottom: 20 }}>
                  {/* Take Profit */}
                  <View style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Switch
                          value={tpEnabled}
                          onValueChange={setTpEnabled}
                          trackColor={{
                            false: theme.border,
                            true: theme.positive,
                          }}
                          thumbColor="#FFFFFF"
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: theme.secondary,
                            marginLeft: 8,
                          }}
                        >
                          Take Profit
                        </Text>
                      </View>
                      {tpEnabled && tp && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.positive,
                            fontWeight: "600",
                          }}
                        >
                          +
                          {(
                            (Number(tp) - getReferencePrice()) *
                            (modalSide === "BUY" ? 1 : -1)
                          ).toFixed(digits)}
                        </Text>
                      )}
                    </View>
                    {tpEnabled && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: theme.card,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: theme.text,
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                          value={tp}
                          onChangeText={setTp}
                          onFocus={handleTpFocus}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.secondary}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            adjustFieldWithBase(
                              setTp,
                              tp,
                              1,
                              getReferencePrice(),
                            )
                          }
                          style={{
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.primary,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            adjustFieldWithBase(
                              setTp,
                              tp,
                              -1,
                              getReferencePrice(),
                            )
                          }
                          style={{
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.card,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                        >
                          <AppIcon name="remove" size={20} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Stop Loss */}
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Switch
                          value={slEnabled}
                          onValueChange={setSlEnabled}
                          trackColor={{
                            false: theme.border,
                            true: theme.negative,
                          }}
                          thumbColor="#FFFFFF"
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: theme.secondary,
                            marginLeft: 8,
                          }}
                        >
                          Stop Loss
                        </Text>
                      </View>
                      {slEnabled && sl && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.negative,
                            fontWeight: "600",
                          }}
                        >
                          -
                          {(
                            (getReferencePrice() - Number(sl)) *
                            (modalSide === "BUY" ? 1 : -1)
                          ).toFixed(digits)}
                        </Text>
                      )}
                    </View>
                    {slEnabled && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: theme.card,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: theme.text,
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                          value={sl}
                          onChangeText={setSl}
                          onFocus={handleSlFocus}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={theme.secondary}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            adjustFieldWithBase(
                              setSl,
                              sl,
                              1,
                              getReferencePrice(),
                            )
                          }
                          style={{
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.primary,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <AppIcon name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            adjustFieldWithBase(
                              setSl,
                              sl,
                              -1,
                              getReferencePrice(),
                            )
                          }
                          style={{
                            marginLeft: 8,
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: theme.card,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: theme.border,
                          }}
                        >
                          <AppIcon name="remove" size={20} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* Order Summary */}
                <View
                  style={{
                    backgroundColor: `${modalSideColor}15`,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    borderWidth: 2,
                    borderColor: `${modalSideColor}30`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: theme.secondary,
                      marginBottom: 8,
                    }}
                  >
                    ORDER SUMMARY
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      Type
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: modalSideColor,
                      }}
                    >
                      {tradeTab === "Pending"
                        ? `${pendingOrderOptions.find((o) => o.key === pendingOrderTypeKey)?.label || "Pending"} ${modalSide}`
                        : `${modalSide} at Market`}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      Symbol
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: theme.text,
                      }}
                    >
                      {symbol}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.secondary }}>
                      Volume
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: theme.text,
                      }}
                    >
                      {lot} lot
                    </Text>
                  </View>
                  {tradeTab === "Pending" && (
                    <>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: theme.secondary }}>
                          Entry Price
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: theme.text,
                          }}
                        >
                          {pendingEntryPrice || "--"}
                        </Text>
                      </View>
                      {pendingExpirationEnabled && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={{ fontSize: 12, color: theme.secondary }}
                          >
                            Expires
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: theme.text,
                            }}
                          >
                            {pendingExpirationTimeIso
                              ? new Date(
                                  pendingExpirationTimeIso,
                                ).toLocaleDateString()
                              : "--"}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  {tpEnabled && tp && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.secondary }}>
                        Take Profit
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.positive,
                        }}
                      >
                        {tp}
                      </Text>
                    </View>
                  )}
                  {slEnabled && sl && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.secondary }}>
                        Stop Loss
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.negative,
                        }}
                      >
                        {sl}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Execute Button */}
                <TouchableOpacity
                  onPress={executeOrder}
                  style={{
                    backgroundColor: modalSideColor,
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: modalSideColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "900",
                      color: "#FFFFFF",
                      letterSpacing: 0.5,
                    }}
                  >
                    {tradeTab === "Pending"
                      ? "PLACE PENDING ORDER"
                      : `EXECUTE ${modalSide} ORDER`}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#FFFFFF",
                      marginTop: 4,
                      opacity: 0.9,
                    }}
                  >
                    {symbol} • {lot} lot • {modalSidePriceStr}
                  </Text>
                </TouchableOpacity>

                {/* Risk Warning */}
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.secondary,
                    textAlign: "center",
                    marginTop: 12,
                    lineHeight: 14,
                  }}
                >
                  Trading involves risk. Past performance is not indicative of
                  future results.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
