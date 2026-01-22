import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, ActivityIndicator, Alert } from 'react-native';
import { formatPriceParts } from '../utils/formatPriceParts';

// Dummy data
const DUMMY_SYMBOLS = {
  'XAUUSD': { digits: 2, minLotSize: 0.01, maxLotSize: 100 },
  'EURUSD': { digits: 5, minLotSize: 0.01, maxLotSize: 100 },
  'GBPUSD': { digits: 5, minLotSize: 0.01, maxLotSize: 100 },
};


const normalizeTwoDecimals = (value) => {
  if (!value) return '';
  const num = parseFloat(value);
  return isNaN(num) ? '' : num.toFixed(2);
};

const ChartTradePanelRN = ({
  symbol = 'XAUUSD',
  bid = 1985.42,
  ask = 1985.67,
  digits = 2,
  isMasterAccount = true,
  theme = 'dark',
  loading = false,
  dropdown = true,
  onTrade,
  defaultLotEnabled = false,
  defaultLotValue = 0.01,
}) => {
  // State variables
  const [internalOpen, setInternalOpen] = useState(true);
  const [lot, setLot] = useState(
    defaultLotEnabled 
      ? Number(defaultLotValue).toFixed(2)
      : DUMMY_SYMBOLS[symbol]?.minLotSize.toFixed(2) || '0.01'
  );
  const [lotError, setLotError] = useState('');
  const maxLotSize = DUMMY_SYMBOLS[symbol]?.maxLotSize || 100;
  const [showPrices, setShowPrices] = useState(false);
  const [clickedSide, setClickedSide] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const derivedOpen = dropdown ? internalOpen : true;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Handlers for lot adjustment
  const handleIncreaseLot = () => {
    setLot((l) => {
      const n = parseFloat(l || '0');
      if (isNaN(n)) return '';
      const next = n + 0.01;
      if (maxLotSize !== undefined && !isNaN(maxLotSize) && next > maxLotSize) {
        return Number(maxLotSize).toFixed(2);
      }
      return next.toFixed(2);
    });
  };

  const handleDecreaseLot = () => {
    setLot((l) => {
      const n = parseFloat(l || '0');
      if (isNaN(n)) return '';
      const next = n - 0.01;
      if (next < 0.01) return '0.01';
      return next.toFixed(2);
    });
  };

  // Update lot when defaultLotValue changes
  useEffect(() => {
    if (defaultLotEnabled) {
      setLot(Number(defaultLotValue).toFixed(2));
    }
  }, [defaultLotEnabled, defaultLotValue]);

  // Simulate price updates
  useEffect(() => {
    setShowPrices(false);
    const timeout = setTimeout(() => {
      setShowPrices(true);
    }, 150);
    return () => clearTimeout(timeout);
  }, [symbol]);

  // Handle lot input changes
  const handleLotChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setLot(cleaned);
    
    if (cleaned === '') {
      setLotError('');
      return;
    }
    
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      if (num < 0.01) {
        setLotError('Minimum lot size is 0.01');
        return;
      }
      if (maxLotSize !== undefined && num > maxLotSize) {
        setLotError(`Max lot size is ${maxLotSize}`);
        return;
      }
    }
    setLotError('');
  };

  const handleLotBlur = () => {
    if (lot === '') {
      setLot('');
      setLotError('');
      return;
    }
    
    let normalized = normalizeTwoDecimals(lot);
    let num = parseFloat(normalized);
    
    if (!isNaN(num) && num === 0) {
      const minLot = DUMMY_SYMBOLS[symbol]?.minLotSize ?? 0.01;
      normalized = Number(minLot).toFixed(2);
      num = parseFloat(normalized);
    }
    
    setLot(normalized);
    
    if (!isNaN(num) && maxLotSize !== undefined && num > maxLotSize) {
      setLotError(`Max lot size is ${maxLotSize}`);
    } else {
      setLotError('');
    }
  };

  // Order placement with dummy implementation
  const placeOrder = async (side) => {
    if (isPlacingOrder) return;
    
    setIsPlacingOrder(true);
    setClickedSide(side);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // simulated order result omitted

      Alert.alert(
        'Order Placed',
        `${side} ${lot} ${symbol} at ${side === 'BUY' ? ask : bid}`,
        [{ text: 'OK' }]
      );

      if (onTrade) {
        onTrade(symbol, side, lot);
      }

    } catch (_error) {
      Alert.alert('Order Failed', 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
      setTimeout(() => setClickedSide(null), 300);
    }
  };

  const isSellDisabled = loading || !bid || lotError || !isMasterAccount;
  const isBuyDisabled = loading || !ask || lotError || !isMasterAccount;

  const bidParts = formatPriceParts(bid, digits);
  const askParts = formatPriceParts(ask, digits);

  const isDark = theme === 'dark';
  const spread = (ask && bid) ? (ask - bid).toFixed(digits) : null;
  const lotPresets = [0.01, 0.10, 0.50, 1.00];

  const setPresetLot = (val) => {
    if (loading) return;
    const formatted = Number(val).toFixed(2);
    if (maxLotSize && val > maxLotSize) return;
    setLot(formatted);
    setLotError('');
  };
  
  // Using Tailwind (nativewind) className utilities instead of StyleSheet.

  return (
    <View className="my-3">
      {/* Top bar: Symbol + spread + collapse */}
      <View className="flex-row items-center justify-between mb-2">
        {dropdown && (
          <TouchableOpacity
            onPress={() => setInternalOpen(!internalOpen)}
            className={`px-3 py-1 rounded-lg border ${isDark ? 'bg-slate-700/70 border-slate-500' : 'bg-white/80 border-slate-300'} shadow-sm`}
          >
            <Text className={`${isDark ? 'text-slate-100' : 'text-slate-800'} text-xs font-semibold`}>
              {symbol} {derivedOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        )}
        {spread && (
          <View className={`px-2 py-1 rounded-full ${isDark ? 'bg-indigo-500/30' : 'bg-indigo-500/15'} border ${isDark ? 'border-indigo-400/40' : 'border-indigo-400/40'}`}>
            <Text className="text-[10px] font-semibold text-indigo-300">SPREAD {spread}</Text>
          </View>
        )}
        {lotError ? (
          <View className="bg-red-600 px-3 py-1 rounded">
            <Text className="text-white text-xs font-semibold">{lotError}</Text>
          </View>
        ) : null}
      </View>

      {derivedOpen && (
        <View className={`${isDark ? 'bg-slate-900/70' : 'bg-white/90'} rounded-xl p-3 border ${isDark ? 'border-slate-700' : 'border-slate-300'} shadow-lg`}>
          {/* Main content grid */}
          <View className="flex-row">
            {/* Left: Prices */}
            <View className="flex-1 mr-3">
              <View className="flex-row mb-2">
                <Animated.View
                  style={{ transform: [{ scale: clickedSide === 'SELL' ? scaleAnim : 1 }] }}
                  className={`flex-1 mr-1 rounded-lg px-3 py-3 ${isSellDisabled ? 'opacity-50' : ''} relative overflow-hidden`}
                >
                  <TouchableOpacity
                    disabled={isSellDisabled}
                    onPress={() => !isSellDisabled && placeOrder('SELL')}
                    className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-red-700/70 to-red-500/70' : 'bg-gradient-to-br from-red-600 to-red-500'} rounded-lg`}
                  />
                  <View className="flex-row items-end">
                    <Text className="text-white text-2xl font-extrabold tracking-tight">{bidParts.base}{showPrices && bid != null ? '.' : ''}</Text>
                    <View className="flex-row items-end ml-0.5">
                      {showPrices && bid != null ? bidParts.decimals.map((d, i) => {
                        const baseClasses = d.weight === 'bold' ? 'text-white text-xl font-black' : 'text-white text-base font-semibold';
                          return (
                            <Text
                              key={i}
                              className={`${baseClasses} ${d.superscript ? 'text-[12px] font-semibold ml-0.5' : ''}`}
                              style={d.superscript ? { transform: [{ translateY: -8 }] } : undefined}
                            >{d.ch}</Text>
                          );
                      }) : <Text className="text-white/70 text-base ml-1">--</Text>}
                    </View>
                  </View>
                  <View className="mt-1 flex-row justify-between items-center">
                    <Text className="text-white/80 text-[10px] font-medium tracking-wide">SELL</Text>
                    {isPlacingOrder && clickedSide === 'SELL' && (
                      <ActivityIndicator size="small" color="#ffffff" />
                    )}
                  </View>
                </Animated.View>
                <Animated.View
                  style={{ transform: [{ scale: clickedSide === 'BUY' ? scaleAnim : 1 }] }}
                  className={`flex-1 ml-1 rounded-lg px-3 py-3 ${isBuyDisabled ? 'opacity-50' : ''} relative overflow-hidden`}
                >
                  <TouchableOpacity
                    disabled={isBuyDisabled}
                    onPress={() => !isBuyDisabled && placeOrder('BUY')}
                    className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-emerald-700/70 to-emerald-500/70' : 'bg-gradient-to-br from-emerald-600 to-emerald-500'} rounded-lg`}
                  />
                  <View className="flex-row items-end">
                    <Text className="text-white text-2xl font-extrabold tracking-tight">{askParts.base}{showPrices && ask != null ? '.' : ''}</Text>
                    <View className="flex-row items-end ml-0.5">
                      {showPrices && ask != null ? askParts.decimals.map((d, i) => {
                        const baseClasses = d.weight === 'bold' ? 'text-white text-xl font-black' : 'text-white text-base font-semibold';
                          return (
                            <Text
                              key={i}
                              className={`${baseClasses} ${d.superscript ? 'text-[12px] font-semibold ml-0.5' : ''}`}
                              style={d.superscript ? { transform: [{ translateY: -8 }] } : undefined}
                            >{d.ch}</Text>
                          );
                      }) : <Text className="text-white/70 text-base ml-1">--</Text>}
                    </View>
                  </View>
                  <View className="mt-1 flex-row justify-between items-center">
                    <Text className="text-white/80 text-[10px] font-medium tracking-wide">BUY</Text>
                    {isPlacingOrder && clickedSide === 'BUY' && (
                      <ActivityIndicator size="small" color="#ffffff" />
                    )}
                  </View>
                </Animated.View>
              </View>

              {/* Presets */}
              <View className="flex-row flex-wrap">
                {lotPresets.map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPresetLot(p)}
                    disabled={loading}
                    className={`px-2 py-1 mr-2 mb-2 rounded-full border ${Number(lot) === p ? 'bg-indigo-600 border-indigo-500' : (isDark ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-200 border-slate-300')}`}
                  >
                    <Text className={`text-[11px] font-semibold ${Number(lot) === p ? 'text-white' : (isDark ? 'text-slate-100' : 'text-slate-800')}`}>{p.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* Right: Vertical lot & actions */}
            <View className="w-28">
              <View className={`items-center rounded-xl p-3 mb-3 border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-white/70'}`}>
                <Text className="text-[10px] tracking-wide font-semibold text-indigo-400 mb-2">LOT SIZE</Text>
                <View className={`flex-row items-center border rounded-full px-2 py-1 mb-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`}> 
                  <TouchableOpacity
                    onPress={handleDecreaseLot}
                    disabled={loading}
                    className={`${isDark ? 'bg-slate-700' : 'bg-slate-200'} w-7 h-7 items-center justify-center rounded-full`}
                  >
                    <Text className={`${isDark ? 'text-slate-50' : 'text-slate-900'} text-xs font-bold`}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={lot}
                    onChangeText={handleLotChange}
                    onBlur={handleLotBlur}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    editable={!loading}
                    className={`${isDark ? 'text-slate-100' : 'text-slate-900'} mx-2 w-14 h-7 text-center text-sm font-bold`}
                  />
                  <TouchableOpacity
                    onPress={handleIncreaseLot}
                    disabled={loading}
                    className={`${isDark ? 'bg-slate-700' : 'bg-slate-200'} w-7 h-7 items-center justify-center rounded-full`}
                  >
                    <Text className={`${isDark ? 'text-slate-50' : 'text-slate-900'} text-xs font-bold`}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Action buttons */}
              <View>
                <TouchableOpacity
                  disabled={isSellDisabled || loading}
                  onPress={() => placeOrder('SELL')}
                  className={`mb-2 rounded-lg py-3 items-center ${isSellDisabled ? 'opacity-50' : ''} ${isDark ? 'bg-red-700/80' : 'bg-red-600'} shadow`}
                >
                  <Text className="text-white text-xs font-bold tracking-wide">PLACE SELL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isBuyDisabled || loading}
                  onPress={() => placeOrder('BUY')}
                  className={`rounded-lg py-3 items-center ${isBuyDisabled ? 'opacity-50' : ''} ${isDark ? 'bg-emerald-700/80' : 'bg-emerald-600'} shadow`}
                >
                  <Text className="text-white text-xs font-bold tracking-wide">PLACE BUY</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ChartTradePanelRN;