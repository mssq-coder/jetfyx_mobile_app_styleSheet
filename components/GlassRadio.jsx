// components/GlassRadio.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Changed to expo-linear-gradient

const GlassRadio = ({ 
  options = [], 
  selectedValue, 
  onSelect, 
  containerStyle = {} 
}) => {
  const gliderPosition = useRef(new Animated.Value(0)).current;

  // Initialize position based on selectedValue
  useEffect(() => {
    const index = options.findIndex(option => option.id === selectedValue);
    if (index >= 0) {
      gliderPosition.setValue(index);
    }
  }, [selectedValue, options]);

  const handleSelect = (optionId) => {
    if (onSelect) {
      onSelect(optionId);
    }
    
    // Calculate position based on selected index
    const index = options.findIndex(option => option.id === optionId);
    if (index >= 0) {
      Animated.timing(gliderPosition, {
        toValue: index,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  };

  // Set default options if none provided
  const radioOptions = options.length > 0 ? options : [
    { id: 'option1', label: 'Option 1', color: '#c0c0c0' },
    { id: 'option2', label: 'Option 2', color: '#ffd700' },
    { id: 'option3', label: 'Option 3', color: '#a0d8ff' },
  ];

  const containerWidth = Dimensions.get('window').width * 0.8;
  const optionWidth = containerWidth / radioOptions.length;

  // Interpolate glider position
  const translateX = gliderPosition.interpolate({
    inputRange: radioOptions.map((_, i) => i),
    outputRange: radioOptions.map((_, i) => i * optionWidth),
  });

  // Get gradient colors based on selection
  const getGradientColors = (optionId) => {
    const option = radioOptions.find(opt => opt.id === optionId);
    if (!option) return ['rgba(192, 192, 192, 0.33)', '#e0e0e0'];
    
    // Use theme colors or default colors
    switch (option.id) {
      case 'orders':
        return ['rgba(59, 130, 246, 0.33)', '#3b82f6']; // Blue for orders
      case 'transactions':
        return ['rgba(16, 185, 129, 0.33)', '#10b981']; // Green for transactions
      default:
        return ['rgba(192, 192, 192, 0.33)', '#e0e0e0']; // Silver default
    }
  };

  const gradientColors = getGradientColors(selectedValue);

  return (
    <View style={[styles.glassRadioGroup, containerStyle]}>
      {/* Glass glider with linear gradient */}
      <Animated.View
        style={[
          styles.glassGlider,
          {
            width: optionWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Inner glow effect */}
        <View style={[StyleSheet.absoluteFill, styles.innerGlow]} />
      </Animated.View>

      {/* Radio options */}
      {radioOptions.map((option, index) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.radioOption, { width: optionWidth }]}
          onPress={() => handleSelect(option.id)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.radioLabel,
            selectedValue === option.id && styles.radioLabelSelected
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  glassRadioGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
    width: '100%', // Take full width
    // Outer shadow for the container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    // Glass effect borders
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  radioOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: '#e5e5e5',
    textAlign: 'center',
  },
  radioLabelSelected: {
    color: '#fff',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  glassGlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 16,
    zIndex: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.5,
    elevation: 8,
  },
  innerGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 0,
    opacity: 0.4,
  },
});

export default GlassRadio;