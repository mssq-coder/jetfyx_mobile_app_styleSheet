import React from 'react'
import { View, Text, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import AppIcon from '../AppIcon'

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
  symbol = '',
  isPlacing = false,
}) => {
  const { theme } = useTheme()
  return (
    <View style={{ paddingVertical: 4 }}>
      {/* Top row: symbol left, icons right */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 8 }}>
        <View style={{ flex: 1 }}>
          {symbol ? (
            <Text style={{ color: theme.secondary, fontSize: 18, fontWeight: '600' }}>{symbol}</Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={onPlus}
            disabled={!onPlus}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: onPlus ? 1 : 0.6,
            }}
          >
            <AppIcon name="add" size={18} color={theme.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onInfo}
            disabled={!onInfo}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: onInfo ? 1 : 0.6,
            }}
          >
            <AppIcon name="info-outline" size={18} color={theme.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            disabled={!onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: onClose ? 1 : 0.6,
            }}
          >
            <AppIcon name="close" size={18} color={theme.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
        {/* SELL Button */}
        <View style={{ 
          flex: 1, 
          borderRadius: 10, 
          backgroundColor: theme.negative,
          padding: 12,
          shadowColor: theme.negative,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        }}>
          <TouchableOpacity onPress={onSell} disabled={!onSell || isPlacing} style={{ alignItems: "center", opacity: (!onSell || isPlacing) ? 0.6 : 1 }}>
            <Text style={{ color: "#ffffff", fontSize: 11, opacity: 0.85, fontWeight: "600", marginBottom: 6 }}>{isPlacing ? 'Processing' : 'SELL'}</Text>
            {isPlacing ? (
              <ActivityIndicator size="small" color="#fff" style={{ paddingVertical: 8 }} />
            ) : (
              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ 
                  color: "#ffffff", 
                  fontSize: 22, 
                  fontWeight: "800", 
                  minWidth: 50, 
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}
              >
                {String(sellPrice)}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Lot Size Control */}
        <View style={{ 
          width: 130, 
          borderRadius: 10, 
          backgroundColor: theme.card,
          padding: 10,
          borderWidth: 1,
          borderColor: theme.border,
        }}>
          {/* Increment/Decrement */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: 8 }}>
            <TouchableOpacity onPress={onDecrease} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: theme.secondary, fontWeight: "600" }}>−</Text>
            </TouchableOpacity>
            <View style={{ 
              backgroundColor: theme.secondary + "15", 
              paddingHorizontal: 8, 
              paddingVertical: 0, 
              borderRadius: 6,
              borderWidth: 1,
              borderColor: theme.secondary + "30",
              minWidth: 60,
            }}>
              <TextInput
                value={String(lotSize)}
                onChangeText={(text) => {
                  // Allow only digits and decimal separator
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  if (onChangeLot) onChangeLot(cleaned);
                }}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                style={{ fontWeight: '700', color: theme.text, fontSize: 14, textAlign: 'center', paddingVertical: 8 }}
              />
            </View>
            <TouchableOpacity onPress={onIncrease} style={{ padding: 4 }}>
              <Text style={{ fontSize: 20, color: theme.secondary, fontWeight: "600" }}>+</Text>
            </TouchableOpacity>
          </View>

          
        </View>

        {/* BUY Button */}
        <View style={{ 
          flex: 1, 
          borderRadius: 10, 
          backgroundColor: theme.positive,
          padding: 12,
          shadowColor: theme.positive,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        }}>
          <TouchableOpacity onPress={onBuy} disabled={!onBuy || isPlacing} style={{ alignItems: "center", opacity: (!onBuy || isPlacing) ? 0.6 : 1 }}>
            <Text style={{ color: "#ffffff", fontSize: 11, opacity: 0.85, fontWeight: "600", marginBottom: 6 }}>{isPlacing ? 'Processing' : 'BUY'}</Text>
            {isPlacing ? (
              <ActivityIndicator size="small" color="#fff" style={{ paddingVertical: 8 }} />
            ) : (
              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ 
                  color: "#ffffff", 
                  fontSize: 22, 
                  fontWeight: "800", 
                  minWidth: 50, 
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}
              >
                {String(buyPrice)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* High / Low Info */}
      <View style={{ 
        flexDirection: "row", 
        justifyContent: "space-around", 
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: theme.card + "60",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: theme.secondary, marginBottom: 3, fontWeight: "500" }}>LOW</Text>
          <Text style={{ fontSize: 14, color: theme.negative, fontWeight: "700", letterSpacing: 0.2 }}>{low || "--"}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.border }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: theme.secondary, marginBottom: 3, fontWeight: "500" }}>HIGH</Text>
          <Text style={{ fontSize: 14, color: theme.positive, fontWeight: "700", letterSpacing: 0.2 }}>{high || "--"}</Text>
        </View>
      </View>
    </View>
  )
}

export default ExpandedRow

