import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/ThemeContext';

export default function AppIcon({ name, color, size = 24 }) {
  const { theme } = useAppTheme();
  return <MaterialIcons name={name} size={size} color={color ?? theme.icon} />;
}
