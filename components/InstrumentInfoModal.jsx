import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "./AppIcon";

const InstrumentInfoModal = ({ visible, item, onClose, theme }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "blurred" ? theme.modalOverlay : "transparent",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 18,
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}
              >
                {item?.symbol ? String(item.symbol) : "Instrument Info"}
              </Text>
              {item?.description ? (
                <Text
                  style={{ color: theme.secondary, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {String(item.description)}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              accessibilityRole="button"
              accessibilityLabel="Close instrument info"
            >
              <AppIcon name="close" size={18} color={theme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {(() => {
              const rows = [
                ["Spread ", item?.spreadType], // required
                ["Digits", item?.digits], // required
                ["SL/TP Level", item?.limitAndStopLevelPoints], // required
                ["Contract Size", item?.contractSize],
                ["Margin Currency", item?.marginCurrency],
                ["Margin Hedge", item?.hedgeMargin],
                ["Trade ", item?.tradeAccess], // required
                ["Execution", item?.executionType], // required
                ["Minimal Volume", item?.minLotSize], // required
                ["Maximal Volume", item?.maxLotSize], // required
                ["Volume Step", item?.lotStepSize],
                ["Swap Buy", item?.swapLong],
                ["Swap Sell", item?.swapShort],
                ["3-Days Swap", item?.threeDaySwapDay],
                // ["Contract Value", item?.contractValue],
              ];

              return rows.map(([label, value]) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      color: theme.secondary,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: "700",
                      marginLeft: 12,
                      flex: 1,
                      textAlign: "right",
                    }}
                    numberOfLines={2}
                  >
                    {value == null || value === "" ? "--" : String(value)}
                  </Text>
                </View>
              ));
            })()}

            {Array.isArray(item?.orderType) && item.orderType.length ? (
              <View style={{ paddingVertical: 12 }}>
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 13,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  Order Types
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {item.orderType.map((t) => (
                    <View
                      key={String(t)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: theme.primary + "15",
                        borderWidth: 1,
                        borderColor: theme.primary + "35",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        {String(t)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {Array.isArray(item?.sessionQuotes) && item.sessionQuotes.length ? (
              <View style={{ paddingVertical: 12 }}>
                <Text
                  style={{
                    color: theme.secondary,
                    fontSize: 13,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  Session Quotes
                </Text>
                {(() => {
                  console.log(
                    "sessionQuotes for",
                    item?.symbol,
                    ":",
                    item?.sessionQuotes,
                  );
                  const grouped = item.sessionQuotes.reduce((acc, quote) => {
                    if (!acc[quote.dayOfWeek]) acc[quote.dayOfWeek] = {};
                    acc[quote.dayOfWeek][quote.type] = quote;
                    return acc;
                  }, {});
                  return (
                    <View>
                      {/* Table Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            color: theme.text,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Days
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            color: theme.text,
                            fontSize: 12,
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          Quote
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            color: theme.text,
                            fontSize: 12,
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          Trade
                        </Text>
                      </View>
                      {/* Table Rows */}
                      {Object.entries(grouped).map(([day, types]) => (
                        <View
                          key={day}
                          style={{
                            flexDirection: "row",
                            paddingVertical: 8,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              flex: 1,
                              color: theme.text,
                              fontSize: 12,
                            }}
                          >
                            {day}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              color: theme.secondary,
                              fontSize: 12,
                              textAlign: "center",
                            }}
                          >
                            {types.Quote
                              ? `${types.Quote.startTime} - ${types.Quote.endTime}`
                              : "--"}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              color: theme.secondary,
                              fontSize: 12,
                              textAlign: "center",
                            }}
                          >
                            {types.Trade
                              ? `${types.Trade.startTime} - ${types.Trade.endTime}`
                              : "--"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default InstrumentInfoModal;
