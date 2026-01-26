import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import AppIcon from "../AppIcon";

const ExpandedRow = ({
  onSell,
  onDecrease,
  onIncrease,
  onBuy,
  onPlus,
  onInfo,
  onClose,
  sellPrice = 0,
  buyPrice = 0,
  lotSize = 1,
  onChangeLot = null,
  low,
  high,
  symbol = "",
  isPlacing = false,
  digits = 2,
}) => {
  const { theme } = useTheme();
  const [isLotFocused, setIsLotFocused] = useState(false);

  const getSpreadText = (buy, sell, digitsParam) => {
    if (buy == null || sell == null) return "--";
    const d = Number.isFinite(Number(digitsParam))
      ? parseInt(digitsParam, 10)
      : 2;
    return ((Number(buy) - Number(sell)) * Math.pow(10, d)).toFixed(0);
  };

  return (
    <View style={{ paddingVertical: 2 }}>
      {/* Compact Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          paddingHorizontal: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: `${theme.primary}20`,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {symbol ? symbol.slice(0, 2) : "--"}
            </Text>
          </View>

          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {symbol || "--"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity
            onPress={onInfo}
            disabled={!onInfo}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${theme.secondary}10`,
              opacity: onInfo ? 1 : 0.5,
            }}
          >
            <AppIcon name="info-outline" size={14} color={theme.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            disabled={!onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${theme.negative}10`,
              opacity: onClose ? 1 : 0.5,
            }}
          >
            <AppIcon name="close" size={14} color={theme.negative} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Action Buttons Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
          paddingHorizontal: 4,
        }}
      >
        {/* SELL Button */}
        <TouchableOpacity
          onPress={onSell}
          disabled={!onSell || isPlacing}
          activeOpacity={0.85}
          style={{
            flex: 1,
            borderRadius: 12,
            backgroundColor: theme.negative,
            paddingVertical: 10,
            paddingHorizontal: 8,
            shadowColor: theme.negative,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            opacity: !onSell || isPlacing ? 0.7 : 1,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: "#fff",
                fontSize: 9,
                fontWeight: "700",
                marginBottom: 4,
                letterSpacing: 0.3,
              }}
            >
              {isPlacing ? "..." : "SELL"}
            </Text>

            {isPlacing ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ height: 20 }}
              />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                }}
              >
                {sellPrice}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Compact Lot Size Control */}
        <View
          style={{
            width: 100,
            borderRadius: 10,
            backgroundColor: theme.card,
            padding: 8,
            borderWidth: 1,
            borderColor: isLotFocused ? theme.primary : theme.border,
          }}
        >
          <Text
            style={{
              color: theme.secondary,
              fontSize: 9,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: 6,
            }}
          >
            LOT
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={onDecrease}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: `${theme.secondary}10`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: theme.secondary,
                  fontWeight: "600",
                }}
              >
                −
              </Text>
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: theme.background,
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: isLotFocused ? theme.primary : theme.border,
                minWidth: 40,
                alignItems: "center",
              }}
            >
              <TextInput
                value={String(lotSize)}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, "");
                  if (onChangeLot) onChangeLot(cleaned);
                }}
                onFocus={() => setIsLotFocused(true)}
                onBlur={() => setIsLotFocused(false)}
                keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                style={{
                  fontWeight: "700",
                  color: theme.text,
                  fontSize: 14,
                  textAlign: "center",
                  padding: 0,
                  minWidth: 30,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={onIncrease}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: `${theme.primary}10`,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: theme.primary,
                  fontWeight: "600",
                }}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BUY Button */}
        <TouchableOpacity
          onPress={onBuy}
          disabled={!onBuy || isPlacing}
          activeOpacity={0.85}
          style={{
            flex: 1,
            borderRadius: 12,
            backgroundColor: theme.positive,
            paddingVertical: 10,
            paddingHorizontal: 8,
            shadowColor: theme.positive,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            opacity: !onBuy || isPlacing ? 0.7 : 1,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                color: "#fff",
                fontSize: 9,
                fontWeight: "700",
                marginBottom: 4,
                letterSpacing: 0.3,
              }}
            >
              {isPlacing ? "..." : "BUY"}
            </Text>

            {isPlacing ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ height: 20 }}
              />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                }}
              >
                {buyPrice}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Compact Market Data */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 8,
          paddingVertical: 8,
          backgroundColor: `${theme.card}80`,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
          marginHorizontal: 4,
        }}
      >
        {/* Low */}
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              color: theme.secondary,
              fontWeight: "600",
              marginBottom: 2,
            }}
          >
            LOW
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.negative,
              fontWeight: "700",
            }}
          >
            {low ? low : "--"}
          </Text>
        </View>

        {/* Separator */}
        <View
          style={{
            width: 1,
            backgroundColor: theme.border,
          }}
        />

        {/* Spread */}
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              color: theme.secondary,
              fontWeight: "600",
              marginBottom: 2,
            }}
          >
            SPREAD
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.text,
              fontWeight: "700",
            }}
          >
            {getSpreadText(buyPrice, sellPrice, digits)}
          </Text>
        </View>

        {/* Separator */}
        <View
          style={{
            width: 1,
            backgroundColor: theme.border,
          }}
        />

        {/* High */}
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              color: theme.secondary,
              fontWeight: "600",
              marginBottom: 2,
            }}
          >
            HIGH
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.positive,
              fontWeight: "700",
            }}
          >
            {high ? high : "--"}
          </Text>
        </View>
      </View>

      {/* Optional: Add to watchlist button */}
      {onPlus && (
        <TouchableOpacity
          onPress={onPlus}
          style={{
            marginTop: 6,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: `${theme.primary}10`,
            alignItems: "center",
            marginHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: theme.primary,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            + Add to Watchlist
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ExpandedRow;
