import { View, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../components/Button'
import { useAppTheme } from '../../contexts/ThemeContext'

export default function Home() {
  const { theme, themeName, toggleTheme, setAppTheme, tw } = useAppTheme();

  return (
   <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
     <View className="flex-1 p-5 justify-center space-y-5">
      <Text className={`text-center ${tw.text}`} style={{ fontSize: 24 }}>
        Welcome to Home
      </Text>
      <Text className={`text-center ${tw.text}`} style={{ fontSize: 16 }}>
        Current theme: {themeName}
      </Text>

      <Button onPress={toggleTheme}>
        Toggle Theme
      </Button>

      <Button variant="ghost" onPress={() => setAppTheme('red')}>
        Red Theme
      </Button>

      <Button variant="ghost" onPress={() => setAppTheme('purple')}>
        Purple Theme
      </Button>

      <View className="rounded-lg p-5" style={{ backgroundColor: theme.card }}>
        <Text className={`text-center ${tw.text}`}>
          This is a card component using theme.card color
        </Text>
      </View>
     </View>
   </SafeAreaView>
  )
}