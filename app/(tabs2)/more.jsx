import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import AppIcon from '../../components/AppIcon';

export default function RealAccountsScreen({ navigation }) {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState('ACTIONS');

  const accountData = {
    id: '125269143',
    balance: '$0.00',
    type: 'REAL'
  };

  const actionItems = [
    { id: 1, icon: 'account-balance-wallet', title: 'Deposit' },
    { id: 2, icon: 'trending-up', title: 'Trade' },
    { id: 3, icon: 'account-balance-wallet', title: 'Withdrawal' },
    { id: 4, icon: 'swap-horiz', title: 'Internal transfer' },
    { id: 5, icon: 'history', title: 'Operation history' },
    { id: 6, icon: 'settings', title: 'Account settings' },
  ];

  const infoItems = [
    { label: 'Account Type', value: 'Classic' },
    { label: 'Leverage', value: '1:500' },
    { label: 'Currency', value: 'USD' },
    { label: 'Server', value: 'Live Server' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 py-3" style={{ backgroundColor: theme.primary }}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack && navigation.goBack()} className="mr-4">
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Real accounts</Text>
      </View>

      <ScrollView className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Account Card */}
        <View className="mx-4 mt-6 mb-4 p-4 rounded-xl" style={{ backgroundColor: theme.card }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded mr-3" style={{ backgroundColor: theme.primary }}>
                <View className="flex-1 items-center justify-center">
                  <Text className="text-white font-bold text-sm">K</Text>
                </View>
              </View>
              <View className="px-2 py-1 rounded" style={{ backgroundColor: theme.primary }}>
                <Text className="text-white text-xs font-medium">{accountData.type}</Text>
              </View>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-medium" style={{ color: theme.text }}>
              {accountData.id}
            </Text>
            <Text className="text-2xl font-bold" style={{ color: theme.text }}>
              {accountData.balance}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row mx-4 mb-4">
          {['ACTIONS', 'INFO'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-3 border-b-2 ${
                activeTab === tab ? '' : 'border-transparent'
              }`}
              style={{
                borderBottomColor: activeTab === tab ? theme.primary : 'transparent'
              }}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === tab ? '' : ''
                }`}
                style={{
                  color: activeTab === tab ? theme.primary : theme.secondary
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View className="px-4">
          {activeTab === 'ACTIONS' && (
            <View>
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderBottomColor: theme.border }}
                >
                  <View className="w-10 h-10 rounded-lg items-center justify-center mr-4" style={{ backgroundColor: theme.card }}>
                    <AppIcon name={item.icon} color={theme.text} size={20} />
                  </View>
                  <Text className="flex-1 text-base" style={{ color: theme.text }}>
                    {item.title}
                  </Text>
                  <AppIcon name="chevron-right" color={theme.secondary} size={20} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'INFO' && (
            <View>
              {infoItems.map((item, index) => (
                <View
                  key={index}
                  className="flex-row justify-between py-4 border-b"
                  style={{ borderBottomColor: theme.border }}
                >
                  <Text className="text-base" style={{ color: theme.secondary }}>
                    {item.label}
                  </Text>
                  <Text className="text-base font-medium" style={{ color: theme.text }}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
